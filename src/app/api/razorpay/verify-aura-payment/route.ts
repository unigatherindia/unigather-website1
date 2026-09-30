import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue, type DocumentReference, type DocumentSnapshot } from 'firebase-admin/firestore';
import { confirmAuraOrderAfterPayment } from '@/lib/aura-order-confirmation';
import { isEmailAfterConfirmationEnabled } from '@/lib/booking-email';
import { adminDb } from '@/lib/firebase-admin';
import { PAYMENT_COLLECTIONS } from '@/lib/payment-hardening';
import { getRazorpayCurrency, getRazorpayKeySecret } from '@/lib/razorpay-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const requestId = `vap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      internalOrderId,
      bookingId,
      amount,
      currency,
    } = await request.json();

    const keySecret = getRazorpayKeySecret();
    if (!keySecret) {
      return NextResponse.json(
        { success: false, message: 'Payment verification not configured.' },
        { status: 500 }
      );
    }

    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto.createHmac('sha256', keySecret).update(body).digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json(
        { success: false, message: 'Payment verification failed' },
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
        const indexSnap = await transaction.get(
          adminDb.collection(PAYMENT_COLLECTIONS.orderRazorpay).doc(razorpay_order_id)
        );
        const indexedId = indexSnap.data()?.internalOrderId;
        if (typeof indexedId === 'string') {
          const indexedRef = orderCollection.doc(indexedId);
          const indexedSnap = await transaction.get(indexedRef);
          if (indexedSnap.exists && indexedSnap.data()?.razorpayOrderId === razorpay_order_id) {
            orderRef = indexedRef;
            orderSnapshot = indexedSnap;
          }
        }
      }

      if (!orderSnapshot) {
        throw new Error('Matching pending order was not found');
      }

      const orderData = orderSnapshot.data() || {};
      if (orderData.orderKind !== 'aura_product') {
        throw new Error('Order is not an aura product order');
      }

      const paymentRef = paymentCollection.doc(razorpay_payment_id);
      const existingPayment = await transaction.get(paymentRef);

      if (existingPayment.exists) {
        const paymentData = existingPayment.data() || {};
        return {
          duplicate: true,
          internalOrderId: orderData.internalOrderId,
          internalPaymentId: razorpay_payment_id,
          amount: paymentData.amount ?? orderData.amount,
          currency: paymentData.currency ?? orderData.currency,
          bookingId: paymentData.bookingId,
        };
      }

      const trustedAmount =
        typeof orderData.amount === 'number' && Number.isFinite(orderData.amount)
          ? orderData.amount
          : Number(amount);
      const trustedCurrency =
        typeof orderData.currency === 'string' && orderData.currency.trim()
          ? orderData.currency
          : currency || getRazorpayCurrency();

      transaction.set(paymentRef, {
        internalPaymentId: razorpay_payment_id,
        internalOrderId: orderData.internalOrderId,
        razorpayPaymentId: razorpay_payment_id,
        razorpayOrderId: razorpay_order_id,
        orderKind: 'aura_product',
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
        internalPaymentId: razorpay_payment_id,
        amount: trustedAmount,
        currency: trustedCurrency,
        bookingId: null,
      };
    });

    if (paymentProcessing.duplicate && paymentProcessing.bookingId) {
      return NextResponse.json({
        success: true,
        message: 'Payment already processed',
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        bookingId: paymentProcessing.bookingId,
        emailSent: false,
        duplicate: true,
      });
    }

    const confirmation = await confirmAuraOrderAfterPayment({
      requestId,
      source: 'verify-aura-payment',
      internalOrderId: paymentProcessing.internalOrderId,
      internalPaymentId: paymentProcessing.internalPaymentId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      amount: paymentProcessing.amount,
      currency: paymentProcessing.currency,
    });

    const emailSent =
      confirmation.email.status === 'sent' ||
      (confirmation.email.status === 'skipped' && confirmation.email.reason === 'already_sent');

    return NextResponse.json({
      success: true,
      message: 'Payment verified and order saved successfully',
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      bookingId: confirmation.bookingId || bookingId,
      emailSent: isEmailAfterConfirmationEnabled() ? emailSent : false,
    });
  } catch (error: unknown) {
    console.error('verify-aura-payment error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Payment verification error',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
