import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue, type DocumentReference, type DocumentSnapshot } from 'firebase-admin/firestore';
import { isEmailAfterConfirmationEnabled } from '@/lib/booking-email';
import { adminDb } from '@/lib/firebase-admin';
import { createInternalEmailRequestHeaders } from '@/lib/internal-email-request';
import { PAYMENT_COLLECTIONS } from '@/lib/payment-hardening';
import { confirmBookingAfterPayment } from '@/lib/payment-confirmation';
import {
  getRazorpayCurrency,
  getRazorpayKeySecret,
  isWebhookBookingConfirmationEnabled,
} from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = `vp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      internalOrderId,

      eventId,
      eventTitle,
      eventDate,
      eventTime,
      eventLocation,

      customerEmail,
      customerName,
      customerPhone,
      age,
      dietaryRestrictions,
      experience,

      ticketType,
      ticketLabel,
      amount,
      bookingId,
      currency,
    } = await request.json();

    console.log('verify-payment:start', {
      requestId,
      bookingId,
      eventId,
      ticketType,
      customerEmail,
      razorpay_order_id,
      razorpay_payment_id,
    });

    const keySecret = getRazorpayKeySecret();

    if (!keySecret) {
      console.error('verify-payment:missing-secret', { requestId });
      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification not configured. Please contact support.',
        },
        { status: 500 }
      );
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    console.log('verify-payment:signature-check', {
      requestId,
      bookingId,
      isAuthentic,
    });

    if (!isAuthentic) {
      console.error('verify-payment:signature-failed', {
        requestId,
        bookingId,
        razorpay_order_id,
        razorpay_payment_id,
      });

      return NextResponse.json(
        {
          success: false,
          message: 'Payment verification failed',
        },
        { status: 400 }
      );
    }

    const paymentProcessing = await adminDb.runTransaction(async (transaction) => {
      const orderCollection = adminDb.collection(PAYMENT_COLLECTIONS.orders);
      const paymentCollection = adminDb.collection(PAYMENT_COLLECTIONS.payments);

      let orderRef: DocumentReference | null = null;
      let orderSnapshot: DocumentSnapshot | null = null;

      if (typeof internalOrderId === 'string' && internalOrderId.trim()) {
        const candidateRef = orderCollection.doc(internalOrderId.trim());
        const candidateSnapshot = await transaction.get(candidateRef);
        if (
          candidateSnapshot.exists &&
          candidateSnapshot.data()?.razorpayOrderId === razorpay_order_id
        ) {
          orderRef = candidateRef;
          orderSnapshot = candidateSnapshot;
        }
      }

      if (!orderSnapshot) {
        const orderQuery = await transaction.get(
          orderCollection.where('razorpayOrderId', '==', razorpay_order_id).limit(1)
        );

        if (orderQuery.empty) {
          throw new Error('Matching pending order was not found');
        }

        orderSnapshot = orderQuery.docs[0];
        orderRef = orderSnapshot.ref;
      }

      const orderData = orderSnapshot.data() || {};
      const existingPayment = await transaction.get(
        paymentCollection.where('razorpayPaymentId', '==', razorpay_payment_id).limit(1)
      );

      if (!existingPayment.empty) {
        const paymentDoc = existingPayment.docs[0];
        return {
          duplicate: true,
          internalOrderId: orderData.internalOrderId,
          internalPaymentId: paymentDoc.data().internalPaymentId,
          amount: paymentDoc.data().amount ?? orderData.amount,
          currency: paymentDoc.data().currency ?? orderData.currency,
          bookingId: paymentDoc.data().bookingId,
        };
      }

      const paymentRef = paymentCollection.doc();
      const internalPaymentId = paymentRef.id;
      const trustedAmount =
        typeof orderData.amount === 'number' && Number.isFinite(orderData.amount)
          ? orderData.amount
          : Number(amount);
      const trustedCurrency =
        typeof orderData.currency === 'string' && orderData.currency.trim()
          ? orderData.currency
          : currency || getRazorpayCurrency();

      transaction.set(paymentRef, {
        internalPaymentId,
        internalOrderId: orderData.internalOrderId,
        razorpayPaymentId: razorpay_payment_id,
        status: 'captured',
        amount: trustedAmount,
        currency: trustedCurrency,
        createdAt: FieldValue.serverTimestamp(),
        processedAt: FieldValue.serverTimestamp(),
      });

      transaction.update(orderRef!, {
        paymentState: 'captured',
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
      });

      return {
        duplicate: false,
        internalOrderId: orderData.internalOrderId,
        internalPaymentId,
        amount: trustedAmount,
        currency: trustedCurrency,
        bookingId: null,
      };
    });

    const webhookOwnsBooking = isWebhookBookingConfirmationEnabled();

    if (webhookOwnsBooking) {
      const confirmedByWebhook = Boolean(paymentProcessing.bookingId);

      console.log('verify-payment:webhook-confirmation-enabled', {
        requestId,
        bookingId: paymentProcessing.bookingId || bookingId,
        paymentId: razorpay_payment_id,
        confirmedByWebhook,
      });

      return NextResponse.json({
        success: true,
        message: confirmedByWebhook
          ? 'Payment verified. Booking was already confirmed by webhook.'
          : 'Payment verified. Booking confirmation is pending webhook processing.',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        bookingId: paymentProcessing.bookingId || bookingId,
        emailSent: false,
        duplicate: paymentProcessing.duplicate,
        backendConfirmation: 'webhook',
        webhookConfirmationPending: !confirmedByWebhook,
      });
    }

    const emailAfterConfirmation = isEmailAfterConfirmationEnabled();

    if (!emailAfterConfirmation && paymentProcessing.duplicate && paymentProcessing.bookingId) {
      console.log('verify-payment:duplicate-payment', {
        requestId,
        bookingId: paymentProcessing.bookingId || bookingId,
        razorpay_payment_id,
      });

      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        bookingId: paymentProcessing.bookingId || bookingId,
        emailSent: false,
        duplicate: true,
      });
    }

    const confirmation = await confirmBookingAfterPayment({
      requestId,
      source: 'verify-payment',
      internalOrderId: paymentProcessing.internalOrderId,
      internalPaymentId: paymentProcessing.internalPaymentId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: paymentProcessing.amount,
      currency: paymentProcessing.currency,
      legacy: {
        bookingId,
        eventTitle,
        eventDate,
        eventTime,
        eventLocation,
        customerName,
        customerEmail,
        customerPhone,
        age,
        dietaryRestrictions,
        experience,
        ticketLabel,
      },
    });

    console.log('verify-payment:booking-confirmed', {
      requestId,
      bookingId: confirmation.bookingId,
      firestoreDocId: confirmation.eventBookingDocId,
      alreadyConfirmed: confirmation.alreadyConfirmed,
    });

    let emailSent =
      confirmation.email.status === 'sent' ||
      (confirmation.email.status === 'skipped' && confirmation.email.reason === 'already_sent');
    let emailWarning: string | null =
      confirmation.email.status === 'failed' ? confirmation.email.error : null;

    if (!emailAfterConfirmation) {
      emailSent = false;
      emailWarning = null;

      try {
        const origin = request.nextUrl.origin;

        const emailBody = JSON.stringify({
          internalOrderId: paymentProcessing.internalOrderId,
        });
        const internalEmailHeaders = createInternalEmailRequestHeaders(emailBody);

        if (!internalEmailHeaders) {
          throw new Error('Internal email signing is not configured');
        }

        const emailRes = await fetch(`${origin}/api/send-booking-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...internalEmailHeaders,
          },
          body: emailBody,
        });

        let emailData: any = null;
        try {
          emailData = await emailRes.json();
        } catch (parseError: any) {
          console.error('verify-payment:email-response-parse-failed', {
            requestId,
            bookingId,
            error: parseError?.message || 'Unknown parse error',
          });
        }

        console.log('verify-payment:email-response', {
          requestId,
          bookingId,
          status: emailRes.status,
          ok: emailRes.ok,
          emailSuccess: emailData?.success ?? null,
          emailMessage: emailData?.message ?? null,
        });

        if (emailRes.ok && emailData?.success) {
          emailSent = true;
          console.log('verify-payment:email-sent', {
            requestId,
            bookingId: confirmation.bookingId,
          });
        } else {
          emailWarning =
            emailData?.message || 'Booking confirmed, but confirmation email could not be sent';

          console.error('verify-payment:email-failed', {
            requestId,
            bookingId,
            status: emailRes.status,
            emailData,
          });
        }
      } catch (emailError: any) {
        emailWarning = emailError?.message || 'Email sending failed unexpectedly';

        console.error('verify-payment:email-exception', {
          requestId,
          bookingId,
          error: emailError?.message || String(emailError),
        });
      }
    }

    console.log('verify-payment:success', {
      requestId,
      bookingId: confirmation.bookingId,
      paymentId: razorpay_payment_id,
      emailSent,
    });

    return NextResponse.json({
      success: true,
      message: 'Payment verified and booking saved successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingId: confirmation.bookingId,
      emailSent,
      emailWarning,
    });
  } catch (error: any) {
    console.error('verify-payment:error', {
      requestId,
      message: error?.message || 'Unknown error',
      stack: error?.stack || null,
    });

    return NextResponse.json(
      {
        success: false,
        message: 'Payment verification error',
        error: error?.message,
      },
      { status: 500 }
    );
  }
}
