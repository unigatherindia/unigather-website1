import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  createBeyondHellosOrderDedupeKey,
  normalizeBeyondHellosTicketType,
  resolveTrustedBeyondHellosPrice,
} from '@/lib/beyond-hellos-payment-utils';
import {
  BEYOND_HELLOS_CONFIG_COLLECTION,
  BEYOND_HELLOS_CONFIG_DOC_ID,
  parseBeyondHellosConfig,
} from '@/types/beyond-hellos';
import {
  PAYMENT_COLLECTIONS,
  PaymentValidationError,
  createPaymentBookingId,
  getOrderCreationRetryAfterSeconds,
  isOrderCreationInFlight,
  isReusablePendingOrder,
  normalizePaymentCustomer,
} from '@/lib/payment-hardening';
import {
  createRazorpayReceipt,
  getRazorpayPaymentTimeoutMs,
  getServerRazorpayConfig,
} from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

function syncLead(leadId: string | null, updates: Record<string, unknown>) {
  if (!leadId) return;
  void adminDb
    .collection('oneOnOneMeetupLeads')
    .doc(leadId)
    .update({ ...updates, updatedAt: FieldValue.serverTimestamp() })
    .catch(() => undefined);
}

function buildReusedResponse(
  orderIntent: {
    internalOrderId: string;
    bookingId: string;
    razorpayOrderId: string;
    amountSubunits: number;
    currency: string;
  },
  razorpayConfig: ReturnType<typeof getServerRazorpayConfig>,
  leadId: string | null
) {
  syncLead(leadId, {
    status: 'payment_order_created',
    internalOrderId: orderIntent.internalOrderId,
    razorpayOrderId: orderIntent.razorpayOrderId,
    bookingId: orderIntent.bookingId,
  });

  return NextResponse.json({
    success: true,
    internalOrderId: orderIntent.internalOrderId,
    bookingId: orderIntent.bookingId,
    orderId: orderIntent.razorpayOrderId,
    amount: orderIntent.amountSubunits,
    currency: orderIntent.currency,
    companyName: razorpayConfig.checkout.companyName,
    themeColor: '#f97316',
    reused: true,
  });
}

function normalizeMeetupDetails(raw: unknown) {
  if (!raw || typeof raw !== 'object') {
    throw new PaymentValidationError('Meetup details are required');
  }
  const data = raw as Record<string, unknown>;
  const city = typeof data.city === 'string' ? data.city.trim() : '';
  const hobbies = typeof data.hobbies === 'string' ? data.hobbies.trim() : '';
  const genderPreference =
    typeof data.genderPreference === 'string' ? data.genderPreference.trim() : '';
  const age =
    typeof data.age === 'number'
      ? data.age
      : typeof data.age === 'string'
        ? Number(data.age)
        : NaN;

  if (!city) throw new PaymentValidationError('City is required');
  if (!hobbies) throw new PaymentValidationError('Hobbies are required');
  if (!genderPreference) throw new PaymentValidationError('Gender preference is required');
  if (!Number.isFinite(age) || age < 18 || age > 120) {
    throw new PaymentValidationError('Valid age is required');
  }

  const ticketType = normalizeBeyondHellosTicketType(data.ticketType);

  return {
    city,
    hobbies,
    genderPreference,
    age,
    ticketType,
    contactInfo: typeof data.contactInfo === 'string' ? data.contactInfo.trim() : '',
    scheduleNote: typeof data.scheduleNote === 'string' ? data.scheduleNote.trim() : '',
    duration: typeof data.duration === 'string' ? data.duration.trim() : '',
  };
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let dedupeKey: string | null = null;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, message: 'Invalid request body' }, { status: 400 });
    }

    const { bookingLeadId, customer, meetupDetails } = body as {
      bookingLeadId?: unknown;
      customer?: unknown;
      meetupDetails?: unknown;
    };

    const normalizedCustomer = normalizePaymentCustomer(customer);
    const normalizedMeetup = normalizeMeetupDetails(meetupDetails);
    const normalizedLeadId =
      typeof bookingLeadId === 'string' && bookingLeadId.trim() ? bookingLeadId.trim() : null;

    const razorpayConfig = getServerRazorpayConfig();
    if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
      return NextResponse.json(
        { success: false, message: 'Payment gateway not configured.' },
        { status: 500 }
      );
    }

    const configSnap = await adminDb
      .collection(BEYOND_HELLOS_CONFIG_COLLECTION)
      .doc(BEYOND_HELLOS_CONFIG_DOC_ID)
      .get();
    const config = parseBeyondHellosConfig(configSnap.data());
    const trustedPrice = resolveTrustedBeyondHellosPrice(config, normalizedMeetup.ticketType);

    const nowMillis = Date.now();
    dedupeKey = createBeyondHellosOrderDedupeKey({
      customerEmail: normalizedCustomer.email,
      customerPhone: normalizedCustomer.phone,
      city: normalizedMeetup.city,
      ticketType: normalizedMeetup.ticketType,
    });

    const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
    const dedupeRef = adminDb.collection(PAYMENT_COLLECTIONS.orderDedupe).doc(dedupeKey);

    const existingDedupe = await dedupeRef.get();
    if (existingDedupe.exists) {
      const existingData = existingDedupe.data() || {};
      if (
        existingData.orderKind === 'beyond_hellos' &&
        isReusablePendingOrder(existingData, nowMillis)
      ) {
        return buildReusedResponse(
          {
            internalOrderId: String(existingData.internalOrderId),
            bookingId: String(existingData.bookingId),
            razorpayOrderId: String(existingData.razorpayOrderId),
            amountSubunits: Number(existingData.amountSubunits),
            currency: String(existingData.currency),
          },
          razorpayConfig,
          normalizedLeadId
        );
      }
    }

    const orderRef = orderCollection.doc();
    internalOrderId = orderRef.id;

    const orderIntent = await adminDb.runTransaction(async (transaction) => {
      const dedupeSnapshot = await transaction.get(dedupeRef);
      if (dedupeSnapshot.exists) {
        const data = dedupeSnapshot.data() || {};
        if (data.orderKind === 'beyond_hellos' && isReusablePendingOrder(data, nowMillis)) {
          return {
            reused: true as const,
            internalOrderId: String(data.internalOrderId),
            bookingId: String(data.bookingId),
            razorpayOrderId: String(data.razorpayOrderId),
            amountSubunits: Number(data.amountSubunits),
            currency: String(data.currency),
          };
        }
        if (isOrderCreationInFlight(data, nowMillis)) {
          const retryAfterSeconds = getOrderCreationRetryAfterSeconds(data, nowMillis);
          throw new PaymentValidationError(
            `Order creation is already in progress. Please try again in ${retryAfterSeconds} seconds.`,
            409,
            { retryAfterSeconds }
          );
        }
      }

      const receipt = createRazorpayReceipt(internalOrderId!);
      const bookingId = createPaymentBookingId();
      const expiresAt = Timestamp.fromMillis(nowMillis + getRazorpayPaymentTimeoutMs());

      const orderFields = {
        internalOrderId: internalOrderId!,
        bookingId,
        orderKind: 'beyond_hellos',
        razorpayOrderId: null,
        status: 'pending',
        paymentState: 'created',
        productLabel: trustedPrice.productLabel,
        bookingLeadId: normalizedLeadId,
        customer: normalizedCustomer,
        meetupDetails: {
          ...normalizedMeetup,
          scheduleNote: normalizedMeetup.scheduleNote || config.scheduleNote,
          duration: normalizedMeetup.duration || config.duration,
        },
        ticketType: trustedPrice.ticketType,
        ticketLabel: trustedPrice.ticketLabel,
        amount: trustedPrice.amount,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
        receipt,
        dedupeKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt,
      };

      transaction.set(orderRef, orderFields);
      transaction.set(dedupeRef, {
        ...orderFields,
        orderKind: 'beyond_hellos',
      });

      return {
        reused: false as const,
        internalOrderId: internalOrderId!,
        bookingId,
        receipt,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
      };
    });

    if (orderIntent.reused) {
      return buildReusedResponse(orderIntent, razorpayConfig, normalizedLeadId);
    }

    const razorpay = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });

    const order = await razorpay.orders.create({
      amount: orderIntent.amountSubunits,
      currency: orderIntent.currency,
      receipt: orderIntent.receipt,
    });

    const razorpayUpdate = {
      razorpayOrderId: order.id,
      receipt: order.receipt || orderIntent.receipt,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await Promise.all([
      orderCollection.doc(orderIntent.internalOrderId).update(razorpayUpdate),
      dedupeRef.set(razorpayUpdate, { merge: true }),
      adminDb.collection(PAYMENT_COLLECTIONS.orderRazorpay).doc(order.id).set({
        internalOrderId: orderIntent.internalOrderId,
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    syncLead(normalizedLeadId, {
      status: 'payment_order_created',
      internalOrderId: orderIntent.internalOrderId,
      razorpayOrderId: order.id,
      bookingId: orderIntent.bookingId,
      amountQuoted: trustedPrice.amount,
      currency: orderIntent.currency,
    });

    return NextResponse.json({
      success: true,
      internalOrderId: orderIntent.internalOrderId,
      bookingId: orderIntent.bookingId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      companyName: razorpayConfig.checkout.companyName,
      themeColor: '#f97316',
    });
  } catch (error: unknown) {
    console.error('create-beyond-hellos-order error:', error);

    if (error instanceof PaymentValidationError) {
      return NextResponse.json(
        { success: false, message: error.message, ...(error.details ?? {}) },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create order' },
      { status: 500 }
    );
  }
}
