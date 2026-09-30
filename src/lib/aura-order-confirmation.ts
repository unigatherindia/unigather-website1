import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { isEmailAfterConfirmationEnabled } from '@/lib/booking-email';
import {
  sendAuraOrderConfirmationEmail,
  type AuraOrderConfirmationEmailInput,
} from '@/lib/aura-order-email';
import { adminDb } from '@/lib/firebase-admin';
import { PAYMENT_COLLECTIONS, createPaymentBookingId } from '@/lib/payment-hardening';

interface ConfirmAuraOrderInput {
  requestId: string;
  source: 'verify-aura-payment';
  internalOrderId: string;
  internalPaymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
}

type EmailConfirmationResult =
  | { status: 'sent'; emailId: string; recipient: string; attempts: number }
  | { status: 'failed'; emailId: string; recipient: string; attempts: number; error: string }
  | {
      status: 'skipped';
      emailId?: string;
      recipient?: string;
      attempts?: number;
      reason: 'already_sent' | 'send_in_progress' | 'missing_recipient';
    };

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function createEmailId(bookingId: string, recipient: string) {
  return crypto.createHash('sha256').update(`aura|${bookingId}|${recipient}`).digest('hex');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Email sending failed';
}

async function sendAuraEmailForOrder(input: {
  internalOrderId: string;
  emailDetails: AuraOrderConfirmationEmailInput;
}): Promise<EmailConfirmationResult> {
  const recipient = input.emailDetails.customerEmail.trim().toLowerCase();
  if (!recipient) {
    return { status: 'skipped', reason: 'missing_recipient' };
  }

  const emailRef = adminDb.collection(PAYMENT_COLLECTIONS.emailHistory).doc(
    createEmailId(input.emailDetails.bookingId, recipient)
  );

  const emailAttempt = await adminDb.runTransaction(async (transaction) => {
    const emailSnapshot = await transaction.get(emailRef);
    const emailData = emailSnapshot.data() || {};
    const status = asString(emailData.status);

    if (status === 'sent') {
      return { shouldSend: false as const, reason: 'already_sent' as const };
    }
    if (status === 'pending') {
      return { shouldSend: false as const, reason: 'send_in_progress' as const };
    }

    const attempts = (typeof emailData.attempts === 'number' ? emailData.attempts : 0) + 1;
    transaction.set(
      emailRef,
      {
        emailId: emailRef.id,
        bookingId: input.emailDetails.bookingId,
        internalOrderId: input.internalOrderId,
        recipient,
        status: 'pending',
        provider: 'resend',
        orderKind: 'aura_product',
        attempts,
      },
      { merge: true }
    );
    return { shouldSend: true as const, attempts };
  });

  if (!emailAttempt.shouldSend) {
    return {
      status: 'skipped',
      emailId: emailRef.id,
      recipient,
      reason: emailAttempt.reason,
    };
  }

  try {
    const result = await sendAuraOrderConfirmationEmail({
      ...input.emailDetails,
      customerEmail: recipient,
    });

    if (!result.sent) {
      const error = result.warning || 'Email provider did not send the message';
      await emailRef.set({ status: 'failed', error }, { merge: true });
      return {
        status: 'failed',
        emailId: emailRef.id,
        recipient,
        attempts: emailAttempt.attempts,
        error,
      };
    }

    await emailRef.set({ status: 'sent', sentAt: FieldValue.serverTimestamp(), error: null }, { merge: true });
    return {
      status: 'sent',
      emailId: emailRef.id,
      recipient,
      attempts: emailAttempt.attempts,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await emailRef.set({ status: 'failed', error: errorMessage }, { merge: true });
    return {
      status: 'failed',
      emailId: emailRef.id,
      recipient,
      attempts: emailAttempt.attempts,
      error: errorMessage,
    };
  }
}

export async function confirmAuraOrderAfterPayment(input: ConfirmAuraOrderInput) {
  const orderRef = adminDb.collection(PAYMENT_COLLECTIONS.orders).doc(input.internalOrderId);
  const paymentRef = adminDb.collection(PAYMENT_COLLECTIONS.payments).doc(input.internalPaymentId);
  const orderDocRef = adminDb.collection('auraProductOrders').doc();

  const confirmation = await adminDb.runTransaction(async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);

    if (!orderSnapshot.exists || !paymentSnapshot.exists) {
      throw new Error('Order or payment not found for aura confirmation');
    }

    const orderData = orderSnapshot.data() || {};
    const paymentData = paymentSnapshot.data() || {};

    if (orderData.orderKind !== 'aura_product') {
      throw new Error('Order is not an aura product order');
    }

    const productId = asString(orderData.productId);
    const shipping =
      orderData.shippingDetails && typeof orderData.shippingDetails === 'object'
        ? (orderData.shippingDetails as Record<string, unknown>)
        : {};
    const customer =
      orderData.customer && typeof orderData.customer === 'object'
        ? (orderData.customer as Record<string, unknown>)
        : {};

    const quantity =
      typeof shipping.quantity === 'number' && shipping.quantity > 0
        ? shipping.quantity
        : 1;

    const productRef = adminDb.collection('auraProducts').doc(productId);
    const productSnapshot = await transaction.get(productRef);
    if (!productSnapshot.exists) {
      throw new Error('Product not found for order confirmation');
    }

    const productData = productSnapshot.data() || {};
    const maxStock =
      typeof productData.maxStock === 'number' && productData.maxStock > 0
        ? productData.maxStock
        : null;
    const unitsSold =
      typeof productData.unitsSold === 'number' && productData.unitsSold >= 0
        ? productData.unitsSold
        : 0;

    if (maxStock !== null && unitsSold + quantity > maxStock) {
      throw new Error('Product sold out during checkout');
    }

    const bookingId = asString(orderData.bookingId) || createPaymentBookingId();
    const bookingLeadId = asString(orderData.bookingLeadId);
    const unitPrice =
      typeof orderData.unitPrice === 'number' ? orderData.unitPrice : input.amount / quantity;

    const existingOrderDocId =
      asString(paymentData.auraProductOrderDocId) || asString(orderData.auraProductOrderDocId);

    if (existingOrderDocId) {
      return {
        bookingId: asString(paymentData.bookingId) || bookingId,
        auraProductOrderDocId: existingOrderDocId,
        alreadyConfirmed: true,
        emailDetails: null as AuraOrderConfirmationEmailInput | null,
      };
    }

    const orderPayload = {
      bookingId,
      productId,
      productTitle: asString(productData.title, 'Aura Product'),
      bookingLeadId: bookingLeadId || null,
      quantity,
      unitPrice,
      amountPaid: input.amount,
      currency: input.currency,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      customerName: asString(customer.name),
      customerEmail: asString(customer.email),
      customerPhone: asString(customer.phone),
      shippingAddress: asString(shipping.address),
      shippingCity: asString(shipping.city),
      shippingState: asString(shipping.state),
      shippingPincode: asString(shipping.pincode),
      status: 'confirmed',
      confirmedBy: input.source,
      createdAt: new Date(),
    };

    transaction.set(orderDocRef, orderPayload);

    if (maxStock !== null) {
      transaction.update(productRef, {
        unitsSold: unitsSold + quantity,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    transaction.update(orderRef, {
      status: 'confirmed',
      paymentState: 'captured',
      bookingId,
      auraProductOrderDocId: orderDocRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(paymentRef, {
      bookingId,
      auraProductOrderDocId: orderDocRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (bookingLeadId) {
      transaction.set(
        adminDb.collection('auraProductLeads').doc(bookingLeadId),
        {
          status: 'confirmed',
          bookingId,
          auraProductOrderDocId: orderDocRef.id,
          orderId: input.razorpayOrderId,
          paymentId: input.razorpayPaymentId,
          amountPaid: input.amount,
          currency: input.currency,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const emailDetails: AuraOrderConfirmationEmailInput = {
      customerEmail: orderPayload.customerEmail,
      customerName: orderPayload.customerName,
      productTitle: orderPayload.productTitle,
      quantity,
      unitPrice,
      amount: input.amount,
      currency: input.currency,
      bookingId,
      paymentId: input.razorpayPaymentId,
      shippingAddress: orderPayload.shippingAddress,
      shippingCity: orderPayload.shippingCity,
      shippingState: orderPayload.shippingState,
      shippingPincode: orderPayload.shippingPincode,
    };

    return {
      bookingId,
      auraProductOrderDocId: orderDocRef.id,
      alreadyConfirmed: false,
      emailDetails,
    };
  });

  let email: EmailConfirmationResult = { status: 'skipped', reason: 'missing_recipient' };

  if (
    !confirmation.alreadyConfirmed &&
    confirmation.emailDetails &&
    isEmailAfterConfirmationEnabled()
  ) {
    email = await sendAuraEmailForOrder({
      internalOrderId: input.internalOrderId,
      emailDetails: confirmation.emailDetails,
    });
  } else if (confirmation.alreadyConfirmed) {
    email = { status: 'skipped', reason: 'already_sent' };
  }

  return {
    bookingId: confirmation.bookingId,
    auraProductOrderDocId: confirmation.auraProductOrderDocId,
    alreadyConfirmed: confirmation.alreadyConfirmed,
    email,
  };
}
