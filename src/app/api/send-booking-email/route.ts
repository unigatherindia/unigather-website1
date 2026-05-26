import { NextRequest, NextResponse } from 'next/server';
import {
  sendBookingConfirmationEmail,
  type BookingConfirmationEmailInput,
} from '@/lib/booking-email';
import { adminDb } from '@/lib/firebase-admin';
import { verifyInternalEmailRequest } from '@/lib/internal-email-request';
import { PAYMENT_COLLECTIONS } from '@/lib/payment-hardening';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;

const emailRateLimits = new Map<string, { count: number; resetAt: number }>();

class EmailRouteError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'EmailRouteError';
    this.status = status;
  }
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function checkRateLimit(internalOrderId: string) {
  const now = Date.now();
  const existing = emailRateLimits.get(internalOrderId);

  if (!existing || existing.resetAt <= now) {
    emailRateLimits.set(internalOrderId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;
  emailRateLimits.set(internalOrderId, existing);
  return true;
}

async function buildVerifiedEmailInput(internalOrderId: string): Promise<BookingConfirmationEmailInput> {
  const orderSnapshot = await adminDb
    .collection(PAYMENT_COLLECTIONS.orders)
    .doc(internalOrderId)
    .get();

  if (!orderSnapshot.exists) {
    throw new EmailRouteError('Order not found', 404);
  }

  const orderData = orderSnapshot.data() || {};
  const storedInternalOrderId = asString(orderData.internalOrderId, orderSnapshot.id);
  const eventBookingDocId = asString(orderData.eventBookingDocId);
  const bookingId = asString(orderData.bookingId);

  if (
    storedInternalOrderId !== internalOrderId ||
    orderData.status !== 'confirmed' ||
    orderData.paymentState !== 'captured' ||
    !eventBookingDocId ||
    !bookingId
  ) {
    throw new EmailRouteError('Booking is not confirmed for this order', 409);
  }

  const paymentSnapshot = await adminDb
    .collection(PAYMENT_COLLECTIONS.payments)
    .where('internalOrderId', '==', internalOrderId)
    .where('status', '==', 'captured')
    .limit(1)
    .get();

  if (paymentSnapshot.empty) {
    throw new EmailRouteError('Captured payment not found for this order', 409);
  }

  const paymentData = paymentSnapshot.docs[0].data() || {};
  const bookingSnapshot = await adminDb.collection('eventBookings').doc(eventBookingDocId).get();

  if (!bookingSnapshot.exists) {
    throw new EmailRouteError('Confirmed booking not found', 404);
  }

  const bookingData = bookingSnapshot.data() || {};
  const bookingPaymentId = asString(bookingData.paymentId);
  const paymentId = asString(paymentData.razorpayPaymentId, bookingPaymentId);

  if (
    bookingData.status !== 'confirmed' ||
    asString(bookingData.bookingId) !== bookingId ||
    asString(bookingData.eventId) !== asString(orderData.eventId) ||
    (bookingPaymentId && paymentId && bookingPaymentId !== paymentId)
  ) {
    throw new EmailRouteError('Booking does not match this order', 409);
  }

  return {
    customerEmail: asString(bookingData.customerEmail),
    customerName: asString(bookingData.customerName),
    eventTitle: asString(bookingData.eventTitle),
    eventDate: asString(bookingData.eventDate),
    eventTime: asString(bookingData.eventTime),
    eventLocation: asString(bookingData.eventLocation),
    ticketType: asString(bookingData.ticketLabel, asString(bookingData.ticketGender, 'Ticket')),
    amount: bookingData.amountPaid as number | string,
    bookingId,
    paymentId,
    currency: asString(bookingData.currency, asString(orderData.currency)),
  };
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    if (!verifyInternalEmailRequest(request, rawBody)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Forbidden',
        },
        { status: 403 }
      );
    }

    const body = JSON.parse(rawBody) as { internalOrderId?: unknown };
    const internalOrderId = asString(body.internalOrderId);

    if (!internalOrderId) {
      throw new EmailRouteError('internalOrderId is required', 400);
    }

    if (!checkRateLimit(internalOrderId)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many email requests for this booking',
        },
        { status: 429 }
      );
    }

    const emailInput = await buildVerifiedEmailInput(internalOrderId);
    const emailResult = await sendBookingConfirmationEmail(emailInput);

    if (!emailResult.sent) {
      return NextResponse.json({
        success: true,
        message: 'Booking confirmed, but email not configured',
        warning: emailResult.warning,
      });
    }

    console.log('Email sent:', emailResult.messageId);

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      messageId: emailResult.messageId,
    });
  } catch (error: any) {
    console.error('Email sending error:', error);

    if (error instanceof EmailRouteError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to send email',
        error: error.message,
      },
      { status: 500 }
    );
  }
}

