import { NextRequest, NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  PAYMENT_COLLECTIONS,
  PaymentValidationError,
  createOrderDedupeKey,
  createPaymentBookingId,
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

export async function POST(request: NextRequest) {
  let internalOrderId: string | null = null;

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
    const dedupeKey = createOrderDedupeKey({
      eventId: normalizedEventId,
      ticketType: normalizedTicketType,
      customer: normalizedCustomer,
    });
    const eventRef = adminDb.collection('events').doc(normalizedEventId);
    const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
    const orderRef = orderCollection.doc();
    const newInternalOrderId = orderRef.id;
    internalOrderId = newInternalOrderId;

    const orderIntent = await adminDb.runTransaction(async (transaction) => {
      const eventSnapshot = await transaction.get(eventRef);
      if (!eventSnapshot.exists) {
        throw new PaymentValidationError('Event not found', 404);
      }

      const trustedPrice = resolveTrustedTicketPrice(
        eventSnapshot.data() || {},
        normalizedTicketType
      );

      const existingOrders = await transaction.get(
        orderCollection.where('dedupeKey', '==', dedupeKey).limit(10)
      );
      const reusableOrder = existingOrders.docs.find((docSnapshot) => {
        const data = docSnapshot.data();
        const expiresAt = data.expiresAt?.toMillis?.() ?? 0;
        return (
          data.status === 'pending' &&
          data.paymentState === 'created' &&
          expiresAt > nowMillis
        );
      });

      if (reusableOrder) {
        const data = reusableOrder.data();
        if (!data.razorpayOrderId) {
          throw new PaymentValidationError(
            'Order creation is already in progress. Please try again.',
            409
          );
        }

        if (normalizedBookingLeadId && data.bookingLeadId !== normalizedBookingLeadId) {
          transaction.update(reusableOrder.ref, {
            bookingLeadId: normalizedBookingLeadId,
            updatedAt: FieldValue.serverTimestamp(),
          });
        }

        return {
          reused: true,
          internalOrderId: data.internalOrderId,
          bookingId: data.bookingId,
          razorpayOrderId: data.razorpayOrderId,
          amountSubunits: data.amountSubunits,
          currency: data.currency,
        };
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

      return {
        reused: false,
        internalOrderId: newInternalOrderId,
        bookingId,
        receipt,
        amountSubunits: trustedPrice.amountSubunits,
        currency: trustedPrice.currency,
      };
    });

    if (orderIntent.reused) {
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

    const razorpay = new Razorpay({
      key_id: razorpayConfig.keyId,
      key_secret: razorpayConfig.keySecret,
    });

    const order = await razorpay.orders.create({
      amount: orderIntent.amountSubunits,
      currency: orderIntent.currency,
      receipt: orderIntent.receipt,
    });

    await orderCollection.doc(orderIntent.internalOrderId).update({
      razorpayOrderId: order.id,
      receipt: order.receipt || orderIntent.receipt,
      updatedAt: FieldValue.serverTimestamp(),
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
    if (internalOrderId) {
      await adminDb
        .collection(PAYMENT_COLLECTIONS.orders)
        .doc(internalOrderId)
        .update({
          status: 'cancelled',
          paymentState: 'failed',
          updatedAt: FieldValue.serverTimestamp(),
          failureReason:
            error?.error?.description ||
            error?.description ||
            error?.message ||
            'Order creation failed',
        })
        .catch(() => undefined);
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

