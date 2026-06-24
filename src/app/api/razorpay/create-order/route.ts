import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { getCachedEventData } from '@/lib/event-data-cache';
import {
  PAYMENT_COLLECTIONS,
  PaymentValidationError,
  createOrderDedupeKey,
  createPaymentBookingId,
  isReusablePendingOrder,
  isStaleIncompleteOrder,
  normalizePaymentBookingDetails,
  normalizePaymentCustomer,
  resolveTrustedTicketPrice,
} from '@/lib/payment-hardening';
import {
  createRazorpayReceipt,
  getRazorpayPaymentTimeoutMs,
  getServerRazorpayConfig,
} from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

function syncBookingLeadPaymentOrder(
  bookingLeadId: string | null,
  updates: Record<string, unknown>
) {
  if (!bookingLeadId) return;

  void adminDb
    .collection('bookingLeads')
    .doc(bookingLeadId)
    .update({
      ...updates,
      updatedAt: FieldValue.serverTimestamp(),
    })
    .catch(() => undefined);
}

function buildReusedOrderResponse(
  orderIntent: {
    internalOrderId: string;
    bookingId: string;
    razorpayOrderId: string;
    amountSubunits: number;
    amount?: number;
    currency: string;
  },
  razorpayConfig: ReturnType<typeof getServerRazorpayConfig>,
  bookingLeadId: string | null
) {
  syncBookingLeadPaymentOrder(bookingLeadId, {
    status: 'payment_order_created',
    internalOrderId: orderIntent.internalOrderId,
    razorpayOrderId: orderIntent.razorpayOrderId,
    bookingId: orderIntent.bookingId,
    amountQuoted: orderIntent.amount ?? orderIntent.amountSubunits / 100,
    currency: orderIntent.currency,
  });

  return NextResponse.json({
    success: true,
    internalOrderId: orderIntent.internalOrderId,
    bookingId: orderIntent.bookingId,
    orderId: orderIntent.razorpayOrderId,
    amount: orderIntent.amountSubunits,
    currency: orderIntent.currency,
    companyName: razorpayConfig.checkout.companyName,
    themeColor: razorpayConfig.checkout.themeColor,
    reused: true,
  });
}

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;
  let dedupeKey: string | null = null;
  let orderPersisted = false;

  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, message: 'Invalid request body' },
        { status: 400 }
      );
    }

    const { eventId, ticketType, bookingLeadId, customer, bookingDetails } = body as {
      eventId?: unknown;
      ticketType?: unknown;
      bookingLeadId?: unknown;
      customer?: unknown;
      bookingDetails?: unknown;
    };

    if (typeof eventId !== 'string' || !eventId.trim()) {
      throw new PaymentValidationError('Event ID is required');
    }

    if (typeof ticketType !== 'string' || !ticketType.trim()) {
      throw new PaymentValidationError('Ticket type is required');
    }

    const normalizedEventId = eventId.trim();
    const normalizedTicketType = ticketType.trim();
    const normalizedBookingLeadId =
      typeof bookingLeadId === 'string' && bookingLeadId.trim() ? bookingLeadId.trim() : null;
    const normalizedCustomer = normalizePaymentCustomer(customer);
    const normalizedBookingDetails = normalizePaymentBookingDetails(bookingDetails);

    const razorpayConfig = getServerRazorpayConfig();

    if (!razorpayConfig.keyId || !razorpayConfig.keySecret) {
      console.error('Razorpay credentials not configured!');
      return NextResponse.json(
        {
          success: false,
          message: 'Payment gateway not configured. Please contact support.',
          error: 'Missing Razorpay credentials',
        },
        { status: 500 }
      );
    }

    const nowMillis = Date.now();
    dedupeKey = createOrderDedupeKey({
      eventId: normalizedEventId,
      ticketType: normalizedTicketType,
      customer: normalizedCustomer,
    });

    const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
    const dedupeRef = adminDb.collection(PAYMENT_COLLECTIONS.orderDedupe).doc(dedupeKey);

    // Fast path: one indexed document read instead of a collection query.
    const existingDedupeSnapshot = await dedupeRef.get();
    if (existingDedupeSnapshot.exists) {
      const existingData = existingDedupeSnapshot.data() || {};
      if (isReusablePendingOrder(existingData, nowMillis)) {
        return buildReusedOrderResponse(
          {
            internalOrderId: String(existingData.internalOrderId),
            bookingId: String(existingData.bookingId),
            razorpayOrderId: String(existingData.razorpayOrderId),
            amountSubunits: Number(existingData.amountSubunits),
            amount:
              typeof existingData.amount === 'number' ? existingData.amount : undefined,
            currency: String(existingData.currency),
          },
          razorpayConfig,
          normalizedBookingLeadId
        );
      }
    }

    const eventData = await getCachedEventData(adminDb, normalizedEventId);
    const trustedPrice = resolveTrustedTicketPrice(eventData, normalizedTicketType);

    const orderRef = orderCollection.doc();
    const newInternalOrderId = orderRef.id;
    internalOrderId = newInternalOrderId;

    const orderIntent = await adminDb.runTransaction(async (transaction) => {
      const dedupeSnapshot = await transaction.get(dedupeRef);

      if (dedupeSnapshot.exists) {
        const data = dedupeSnapshot.data() || {};
        if (isReusablePendingOrder(data, nowMillis)) {
          return {
            reused: true as const,
            internalOrderId: String(data.internalOrderId),
            bookingId: String(data.bookingId),
            razorpayOrderId: String(data.razorpayOrderId),
            amountSubunits: Number(data.amountSubunits),
            amount: typeof data.amount === 'number' ? data.amount : undefined,
            currency: String(data.currency),
          };
        }

        if (!isStaleIncompleteOrder(data, nowMillis)) {
          throw new PaymentValidationError(
            'Order creation is already in progress. Please try again.',
            409
          );
        }
      }

      const receipt = createRazorpayReceipt(newInternalOrderId);
      const bookingId = createPaymentBookingId();
      const expiresAt = Timestamp.fromMillis(nowMillis + getRazorpayPaymentTimeoutMs());

      transaction.set(orderRef, {
        internalOrderId: newInternalOrderId,
        bookingId,
        razorpayOrderId: null,
        status: 'pending',
        paymentState: 'created',
        eventId: normalizedEventId,
        bookingLeadId: normalizedBookingLeadId,
        ticketType: normalizedTicketType,
        ticketLabel: trustedPrice.ticketLabel,
        customer: normalizedCustomer,
        bookingDetails: normalizedBookingDetails,
        amount: trustedPrice.amount,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
        receipt,
        dedupeKey,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        expiresAt,
      });

      transaction.set(dedupeRef, {
        internalOrderId: newInternalOrderId,
        bookingId,
        razorpayOrderId: null,
        status: 'pending',
        paymentState: 'created',
        eventId: normalizedEventId,
        bookingLeadId: normalizedBookingLeadId,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
        amount: trustedPrice.amount,
        dedupeKey,
        expiresAt,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        reused: false as const,
        internalOrderId: newInternalOrderId,
        bookingId,
        receipt,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
      };
    });

    orderPersisted = !orderIntent.reused;

    if (orderIntent.reused) {
      return buildReusedOrderResponse(orderIntent, razorpayConfig, normalizedBookingLeadId);
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
      adminDb
        .collection(PAYMENT_COLLECTIONS.orderRazorpay)
        .doc(order.id)
        .set({
          internalOrderId: orderIntent.internalOrderId,
          updatedAt: FieldValue.serverTimestamp(),
        }),
    ]);

    syncBookingLeadPaymentOrder(normalizedBookingLeadId, {
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
      themeColor: razorpayConfig.checkout.themeColor,
    });
  } catch (error: any) {
    console.error('Razorpay order creation error:', error);

    if (orderPersisted && internalOrderId) {
      const failureReason =
        error?.error?.description ||
        error?.description ||
        error?.message ||
        'Order creation failed';
      const failureUpdate = {
        status: 'cancelled',
        paymentState: 'failed',
        updatedAt: FieldValue.serverTimestamp(),
        failureReason,
      };

      const writes = [
        adminDb.collection(PAYMENT_COLLECTIONS.orders).doc(internalOrderId).update(failureUpdate),
      ];

      if (dedupeKey) {
        writes.push(
          adminDb
            .collection(PAYMENT_COLLECTIONS.orderDedupe)
            .doc(dedupeKey)
            .set(failureUpdate, { merge: true })
        );
      }

      await Promise.all(writes.map((write) => write.catch(() => undefined)));
    }

    if (error instanceof PaymentValidationError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }

    const razorpayDesc =
      error?.error?.description ||
      error?.description ||
      (typeof error?.message === 'string' ? error.message : undefined);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to create order',
        error: razorpayDesc || 'Unknown Razorpay error',
      },
      { status: 500 }
    );
  }
}
