import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { isEmailAfterConfirmationEnabled } from '@/lib/booking-email';
import {
  sendBeyondHellosConfirmationEmail,
  type BeyondHellosConfirmationEmailInput,
} from '@/lib/beyond-hellos-email';
import { adminDb } from '@/lib/firebase-admin';
import { GENDER_PREFERENCE_OPTIONS } from '@/constants/meetup-options';
import { getBeyondHellosTicketLabel } from '@/types/beyond-hellos';
import { ONE_ON_ONE_MEETUP_COLLECTION } from '@/constants/meetup-options';
import { BEYOND_HELLOS_BOOKINGS_COLLECTION } from '@/types/beyond-hellos';
import { PAYMENT_COLLECTIONS, createPaymentBookingId } from '@/lib/payment-hardening';

interface ConfirmBeyondHellosInput {
  requestId: string;
  source: 'verify-beyond-hellos-payment';
  internalOrderId: string;
  internalPaymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function labelForPreference(value: string) {
  return GENDER_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

function createEmailId(bookingId: string, recipient: string) {
  return crypto.createHash('sha256').update(`beyond_hellos|${bookingId}|${recipient}`).digest('hex');
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

async function sendEmailForBooking(input: {
  internalOrderId: string;
  emailDetails: BeyondHellosConfirmationEmailInput;
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
        orderKind: 'beyond_hellos',
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
    const result = await sendBeyondHellosConfirmationEmail({
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
    const errorMessage = error instanceof Error ? error.message : 'Email sending failed';
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

export async function confirmBeyondHellosAfterPayment(input: ConfirmBeyondHellosInput) {
  const orderRef = adminDb.collection(PAYMENT_COLLECTIONS.orders).doc(input.internalOrderId);
  const paymentRef = adminDb.collection(PAYMENT_COLLECTIONS.payments).doc(input.internalPaymentId);
  const bookingDocRef = adminDb.collection(BEYOND_HELLOS_BOOKINGS_COLLECTION).doc();

  const confirmation = await adminDb.runTransaction(async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);

    if (!orderSnapshot.exists || !paymentSnapshot.exists) {
      throw new Error('Order or payment not found for Beyond Hello\'s confirmation');
    }

    const orderData = orderSnapshot.data() || {};
    const paymentData = paymentSnapshot.data() || {};

    if (orderData.orderKind !== 'beyond_hellos') {
      throw new Error('Order is not a Beyond Hello\'s order');
    }

    const customer =
      orderData.customer && typeof orderData.customer === 'object'
        ? (orderData.customer as Record<string, unknown>)
        : {};
    const meetup =
      orderData.meetupDetails && typeof orderData.meetupDetails === 'object'
        ? (orderData.meetupDetails as Record<string, unknown>)
        : {};

    const bookingId = asString(orderData.bookingId) || createPaymentBookingId();
    const bookingLeadId = asString(orderData.bookingLeadId);

    const existingBookingDocId =
      asString(paymentData.beyondHellosBookingDocId) || asString(orderData.beyondHellosBookingDocId);

    if (existingBookingDocId) {
      return {
        bookingId: asString(paymentData.bookingId) || bookingId,
        beyondHellosBookingDocId: existingBookingDocId,
        alreadyConfirmed: true,
        emailDetails: null as BeyondHellosConfirmationEmailInput | null,
      };
    }

    const genderPreference = asString(meetup.genderPreference);
    const ticketTypeRaw = asString(meetup.ticketType) || asString(orderData.ticketType);
    const ticketType = ticketTypeRaw === 'female' ? 'female' : 'male';
    const ticketLabel =
      asString(orderData.ticketLabel) || asString(meetup.ticketLabel) || getBeyondHellosTicketLabel(ticketType);
    const bookingPayload = {
      bookingId,
      bookingLeadId: bookingLeadId || null,
      program: 'beyond_hellos',
      title: asString(orderData.productLabel, 'Beyond Hello\'s'),
      customerName: asString(customer.name),
      customerEmail: asString(customer.email),
      customerPhone: asString(customer.phone),
      contactInfo: asString(meetup.contactInfo) || asString(customer.phone),
      age: typeof meetup.age === 'number' ? meetup.age : Number(meetup.age) || null,
      gender: ticketType,
      ticketType,
      ticketLabel,
      genderPreference,
      hobbies: asString(meetup.hobbies),
      city: asString(meetup.city),
      amountPaid: input.amount,
      currency: input.currency,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      status: 'confirmed',
      confirmedBy: input.source,
      scheduleNote: asString(meetup.scheduleNote),
      duration: asString(meetup.duration),
      createdAt: new Date(),
    };

    transaction.set(bookingDocRef, bookingPayload);

    transaction.update(orderRef, {
      status: 'confirmed',
      paymentState: 'captured',
      bookingId,
      beyondHellosBookingDocId: bookingDocRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(paymentRef, {
      bookingId,
      beyondHellosBookingDocId: bookingDocRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (bookingLeadId) {
      transaction.set(
        adminDb.collection(ONE_ON_ONE_MEETUP_COLLECTION).doc(bookingLeadId),
        {
          status: 'confirmed',
          bookingId,
          beyondHellosBookingDocId: bookingDocRef.id,
          orderId: input.razorpayOrderId,
          paymentId: input.razorpayPaymentId,
          amountPaid: input.amount,
          currency: input.currency,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const emailDetails: BeyondHellosConfirmationEmailInput = {
      customerEmail: bookingPayload.customerEmail,
      customerName: bookingPayload.customerName,
      bookingId,
      paymentId: input.razorpayPaymentId,
      amount: input.amount,
      currency: input.currency,
      city: bookingPayload.city,
      genderPreferenceLabel: labelForPreference(genderPreference),
      ticketLabel,
      hobbies: bookingPayload.hobbies,
      scheduleNote: bookingPayload.scheduleNote || 'One week after booking',
      duration: bookingPayload.duration || '4pm – 5pm',
    };

    return {
      bookingId,
      beyondHellosBookingDocId: bookingDocRef.id,
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
    email = await sendEmailForBooking({
      internalOrderId: input.internalOrderId,
      emailDetails: confirmation.emailDetails,
    });
  } else if (confirmation.alreadyConfirmed) {
    email = { status: 'skipped', reason: 'already_sent' };
  }

  return {
    bookingId: confirmation.bookingId,
    beyondHellosBookingDocId: confirmation.beyondHellosBookingDocId,
    alreadyConfirmed: confirmation.alreadyConfirmed,
    email,
  };
}
