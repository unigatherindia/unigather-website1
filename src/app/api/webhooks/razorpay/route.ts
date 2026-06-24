import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import { confirmBookingAfterPayment } from '@/lib/payment-confirmation';
import { PAYMENT_COLLECTIONS } from '@/lib/payment-hardening';
import { getRazorpayCurrency, getRazorpayWebhookSecret, isPaymentAuditLoggingEnabled } from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

type BookingConfirmationResult = Awaited<ReturnType<typeof confirmBookingAfterPayment>>;
type BookingConfirmationEmail = BookingConfirmationResult['email'];

interface RazorpayWebhookEvent {
  id?: string;
  event?: string;
  payload?: {
    payment?: {
      entity?: {
        id?: string;
        order_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
    refund?: {
      entity?: {
        id?: string;
        payment_id?: string;
        amount?: number;
        currency?: string;
        status?: string;
      };
    };
  };
}

async function writePaymentLog(input: {
  level?: 'info' | 'warn' | 'error';
  message: string;
  eventType?: string;
  razorpayEventId?: string;
  internalOrderId?: string;
  internalPaymentId?: string;
  bookingId?: string;
  emailStatus?: string;
}) {
  const level = input.level || 'info';
  if (level === 'info' && !isPaymentAuditLoggingEnabled()) {
    return;
  }

  try {
    const logRef = adminDb.collection(PAYMENT_COLLECTIONS.paymentLogs).doc();
    await logRef.set({
      internalPaymentLogId: logRef.id,
      provider: 'razorpay',
      level,
      message: input.message,
      eventType: input.eventType || null,
      razorpayEventId: input.razorpayEventId || null,
      internalOrderId: input.internalOrderId || null,
      internalPaymentId: input.internalPaymentId || null,
      bookingId: input.bookingId || null,
      emailStatus: input.emailStatus || null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('razorpay-webhook:payment-log-failed', error);
  }
}

function getEmailDeliveryStatus(email: BookingConfirmationEmail) {
  if (email.status === 'sent') {
    return {
      emailSent: true,
      emailStatus: 'sent',
      emailWarning: null,
    };
  }

  if (email.status === 'skipped' && email.reason === 'already_sent') {
    return {
      emailSent: true,
      emailStatus: 'already_sent',
      emailWarning: null,
    };
  }

  if (email.status === 'skipped') {
    return {
      emailSent: false,
      emailStatus: email.reason,
      emailWarning: email.reason,
    };
  }

  return {
    emailSent: false,
    emailStatus: 'failed',
    emailWarning: email.error,
  };
}

function verifyWebhookSignature(rawBody: string, signature: string, secret: string) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  const expected = Buffer.from(expectedSignature, 'hex');
  const received = Buffer.from(signature, 'hex');

  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

async function registerWebhookEvent(input: {
  razorpayEventId: string;
  eventType: string;
}) {
  const webhookRef = adminDb
    .collection(PAYMENT_COLLECTIONS.webhookEvents)
    .doc(input.razorpayEventId);

  return adminDb.runTransaction(async (transaction) => {
    const existingEvent = await transaction.get(webhookRef);

    if (existingEvent.exists) {
      const existingEventData = existingEvent.data() || {};

      if (existingEventData.processed === true) {
        return {
          duplicate: true,
          webhookEventDocId: webhookRef.id,
          eventId: existingEventData.eventId,
        };
      }

      transaction.update(webhookRef, {
        eventType: input.eventType,
        status: 'received',
        lastReceivedAt: FieldValue.serverTimestamp(),
      });

      return {
        duplicate: false,
        webhookEventDocId: webhookRef.id,
        eventId: existingEventData.eventId || webhookRef.id,
      };
    }

    transaction.set(webhookRef, {
      eventId: webhookRef.id,
      provider: 'razorpay',
      razorpayEventId: input.razorpayEventId,
      eventType: input.eventType,
      status: 'received',
      processed: false,
      createdAt: FieldValue.serverTimestamp(),
      processedAt: null,
    });

    return {
      duplicate: false,
      webhookEventDocId: webhookRef.id,
      eventId: webhookRef.id,
    };
  });
}

async function markWebhookProcessed(
  webhookEventDocId: string,
  metadata: Record<string, unknown> = {}
) {
  await adminDb
    .collection(PAYMENT_COLLECTIONS.webhookEvents)
    .doc(webhookEventDocId)
    .update({
      status: 'processed',
      processed: true,
      processedAt: FieldValue.serverTimestamp(),
      ...metadata,
    });
}

async function markWebhookFailed(webhookEventDocId: string, errorMessage: string) {
  await adminDb.collection(PAYMENT_COLLECTIONS.webhookEvents).doc(webhookEventDocId).update({
    status: 'failed',
    processed: false,
    lastError: errorMessage,
    failedAt: FieldValue.serverTimestamp(),
  });
}

async function handlePaymentCaptured(input: {
  requestId: string;
  eventType: string;
  razorpayEventId: string;
  event: RazorpayWebhookEvent;
}) {
  const payment = input.event.payload?.payment?.entity;
  const razorpayPaymentId = payment?.id;
  const razorpayOrderId = payment?.order_id;
  const paymentStatus = payment?.status?.toLowerCase();

  if (!razorpayPaymentId || !razorpayOrderId) {
    throw new Error(`${input.eventType} payload is missing payment or order ID`);
  }

  if (paymentStatus && paymentStatus !== 'captured') {
    throw new Error(`Payment ${razorpayPaymentId} is not captured yet`);
  }

  const paymentProcessing = await adminDb.runTransaction(async (transaction) => {
    const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
    const paymentCollection = adminDb.collection(PAYMENT_COLLECTIONS.payments);

    const orderIndexSnapshot = await transaction.get(
      adminDb.collection(PAYMENT_COLLECTIONS.orderRazorpay).doc(razorpayOrderId)
    );

    let orderRef;
    let orderSnapshot;

    if (orderIndexSnapshot.exists) {
      const indexedInternalOrderId = orderIndexSnapshot.data()?.internalOrderId;
      if (typeof indexedInternalOrderId === 'string' && indexedInternalOrderId.trim()) {
        orderRef = orderCollection.doc(indexedInternalOrderId.trim());
        orderSnapshot = await transaction.get(orderRef);
      }
    }

    if (!orderSnapshot?.exists) {
      const orderQuery = await transaction.get(
        orderCollection.where('razorpayOrderId', '==', razorpayOrderId).limit(1)
      );

      if (orderQuery.empty) {
        throw new Error('Matching order was not found for captured payment');
      }

      orderSnapshot = orderQuery.docs[0];
      orderRef = orderSnapshot.ref;
    }

    const orderData = orderSnapshot.data() || {};
    const paymentRef = paymentCollection.doc(razorpayPaymentId);
    const existingPaymentSnapshot = await transaction.get(paymentRef);

    if (existingPaymentSnapshot.exists) {
      const paymentData = existingPaymentSnapshot.data() || {};
      const internalPaymentId =
        typeof paymentData.internalPaymentId === 'string'
          ? paymentData.internalPaymentId
          : razorpayPaymentId;

      transaction.update(paymentRef, {
        internalPaymentId,
        status: 'captured',
        razorpayOrderId,
        processedAt: FieldValue.serverTimestamp(),
      });
      transaction.update(orderRef!, {
        paymentState: 'captured',
        status: orderData.status === 'confirmed' ? 'confirmed' : 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        internalOrderId: orderData.internalOrderId,
        internalPaymentId,
        amount: paymentData.amount ?? orderData.amount,
        currency:
          paymentData.currency ?? orderData.currency ?? payment?.currency ?? getRazorpayCurrency(),
      };
    }

    const internalPaymentId = razorpayPaymentId;
    const amount =
      typeof orderData.amount === 'number' && Number.isFinite(orderData.amount)
        ? orderData.amount
        : typeof payment?.amount === 'number'
          ? payment.amount / 100
          : 0;
    const currency =
      typeof orderData.currency === 'string' && orderData.currency.trim()
        ? orderData.currency
        : payment?.currency || getRazorpayCurrency();

    transaction.set(paymentRef, {
      internalPaymentId,
      internalOrderId: orderData.internalOrderId,
      razorpayPaymentId,
      razorpayOrderId,
      provider: 'razorpay',
      status: 'captured',
      amount,
      currency,
      createdAt: FieldValue.serverTimestamp(),
      processedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(orderRef!, {
      paymentState: 'captured',
      status: 'processing',
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      internalOrderId: orderData.internalOrderId,
      internalPaymentId,
      amount,
      currency,
    };
  });

  const confirmation = await confirmBookingAfterPayment({
    requestId: input.requestId,
    source: 'webhook',
    internalOrderId: paymentProcessing.internalOrderId,
    internalPaymentId: paymentProcessing.internalPaymentId,
    razorpayOrderId,
    razorpayPaymentId,
    amount: paymentProcessing.amount,
    currency: paymentProcessing.currency,
  });
  const emailDelivery = getEmailDeliveryStatus(confirmation.email);

  await writePaymentLog({
    message: confirmation.alreadyConfirmed ? 'booking already confirmed' : 'booking confirmed',
    eventType: input.eventType,
    razorpayEventId: input.razorpayEventId,
    internalOrderId: paymentProcessing.internalOrderId,
    internalPaymentId: paymentProcessing.internalPaymentId,
    bookingId: confirmation.bookingId,
    emailStatus: emailDelivery.emailStatus,
  });

  return {
    internalOrderId: paymentProcessing.internalOrderId,
    internalPaymentId: paymentProcessing.internalPaymentId,
    bookingId: confirmation.bookingId,
    eventBookingDocId: confirmation.eventBookingDocId,
    alreadyConfirmed: confirmation.alreadyConfirmed,
    ...emailDelivery,
  };
}

async function handlePaymentFailed(input: {
  eventType: string;
  razorpayEventId: string;
}) {
  await writePaymentLog({
    message: 'payment.failed handler prepared; no processing in this phase',
    eventType: input.eventType,
    razorpayEventId: input.razorpayEventId,
  });
}

async function handleRefundCreated(input: {
  eventType: string;
  razorpayEventId: string;
}) {
  await writePaymentLog({
    message: 'refund.created handler prepared; no processing in this phase',
    eventType: input.eventType,
    razorpayEventId: input.razorpayEventId,
  });
}

export async function POST(request: NextRequest) {
  const requestId = `rw_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature') || '';
  const webhookSecret = getRazorpayWebhookSecret();

  if (!webhookSecret) {
    await writePaymentLog({
      level: 'error',
      message: 'webhook secret missing',
    });
    return NextResponse.json(
      { success: false, message: 'Webhook secret not configured' },
      { status: 500 }
    );
  }

  if (!signature || !verifyWebhookSignature(rawBody, signature, webhookSecret)) {
    await writePaymentLog({
      level: 'warn',
      message: 'webhook signature invalid',
    });
    return NextResponse.json(
      { success: false, message: 'Invalid webhook signature' },
      { status: 400 }
    );
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody);
  } catch {
    await writePaymentLog({
      level: 'warn',
      message: 'webhook payload parse failed after signature verification',
    });
    return NextResponse.json(
      { success: false, message: 'Invalid webhook payload' },
      { status: 400 }
    );
  }

  const eventType = event.event || 'unknown';
  const razorpayEventId =
    event.id ||
    `${eventType}_${event.payload?.payment?.entity?.id || event.payload?.refund?.entity?.id || requestId}`;

  await writePaymentLog({
    message: 'event received',
    eventType,
    razorpayEventId,
  });
  await writePaymentLog({
    message: 'signature ok',
    eventType,
    razorpayEventId,
  });

  const webhookEvent = await registerWebhookEvent({
    razorpayEventId,
    eventType,
  });

  if (webhookEvent.duplicate) {
    await writePaymentLog({
      message: 'duplicate webhook event ignored',
      eventType,
      razorpayEventId,
    });

    return NextResponse.json({
      success: true,
      message: 'Webhook event already processed',
      duplicate: true,
    });
  }

  try {
    let confirmationResult: Awaited<ReturnType<typeof handlePaymentCaptured>> | null = null;

    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      confirmationResult = await handlePaymentCaptured({
        requestId,
        eventType,
        razorpayEventId,
        event,
      });
    } else if (eventType === 'payment.failed') {
      await handlePaymentFailed({ eventType, razorpayEventId });
    } else if (eventType === 'refund.created') {
      await handleRefundCreated({ eventType, razorpayEventId });
    } else {
      await writePaymentLog({
        message: 'unsupported webhook event ignored',
        eventType,
        razorpayEventId,
      });
    }

    await markWebhookProcessed(
      webhookEvent.webhookEventDocId,
      confirmationResult
        ? {
            internalOrderId: confirmationResult.internalOrderId,
            internalPaymentId: confirmationResult.internalPaymentId,
            bookingId: confirmationResult.bookingId,
            eventBookingDocId: confirmationResult.eventBookingDocId,
            alreadyConfirmed: confirmationResult.alreadyConfirmed,
            emailSent: confirmationResult.emailSent,
            emailStatus: confirmationResult.emailStatus,
            emailWarning: confirmationResult.emailWarning,
          }
        : undefined
    );

    return NextResponse.json({
      success: true,
      message: 'Webhook processed',
      bookingId: confirmationResult?.bookingId,
      emailSent: confirmationResult?.emailSent,
      emailStatus: confirmationResult?.emailStatus,
    });
  } catch (error: any) {
    await markWebhookFailed(
      webhookEvent.webhookEventDocId,
      error?.message || 'webhook processing failed'
    );

    await writePaymentLog({
      level: 'error',
      message: error?.message || 'webhook processing failed',
      eventType,
      razorpayEventId,
    });

    console.error('razorpay-webhook:error', {
      requestId,
      eventType,
      razorpayEventId,
      error: error?.message || String(error),
      stack: error?.stack || null,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Webhook processing failed',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
