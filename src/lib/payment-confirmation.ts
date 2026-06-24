import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import {
  isEmailAfterConfirmationEnabled,
  sendBookingConfirmationEmail,
  type BookingConfirmationEmailInput,
} from '@/lib/booking-email';
import { adminDb } from '@/lib/firebase-admin';
import { PAYMENT_COLLECTIONS, createPaymentBookingId } from '@/lib/payment-hardening';

interface LegacyBookingDetails {
  bookingId?: string;
  eventTitle?: string;
  eventDate?: string;
  eventTime?: string;
  eventLocation?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  age?: string;
  dietaryRestrictions?: string;
  experience?: string;
  ticketLabel?: string;
}

interface ConfirmBookingInput {
  requestId: string;
  source: 'verify-payment' | 'webhook';
  internalOrderId: string;
  internalPaymentId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  amount: number;
  currency: string;
  legacy?: LegacyBookingDetails;
}

interface ConfirmBookingResult {
  bookingId: string;
  eventBookingDocId: string;
  alreadyConfirmed: boolean;
  email: EmailConfirmationResult;
}

type EmailConfirmationResult =
  | {
      status: 'sent';
      emailId: string;
      recipient: string;
      provider: 'resend';
      attempts: number;
    }
  | {
      status: 'failed';
      emailId: string;
      recipient: string;
      provider: 'resend';
      attempts: number;
      error: string;
    }
  | {
      status: 'skipped';
      emailId?: string;
      recipient?: string;
      provider?: 'resend';
      attempts?: number;
      reason: 'already_sent' | 'send_in_progress' | 'feature_flag_disabled' | 'missing_recipient';
    };

type EmailAttempt =
  | {
      shouldSend: true;
      attempts: number;
    }
  | {
      shouldSend: false;
      reason: 'already_sent' | 'send_in_progress';
      attempts?: number;
    };

interface BookingConfirmationTransactionResult {
  bookingId: string;
  eventBookingDocId: string;
  alreadyConfirmed: boolean;
  emailDetails: BookingConfirmationEmailInput;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function createEmailId(bookingId: string, recipient: string) {
  return crypto.createHash('sha256').update(`${bookingId}|${recipient}`).digest('hex');
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Email sending failed';
}

function getParticipantCount(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
}

function getTotalParticipants(eventData: Record<string, unknown>): number {
  const currentParticipants =
    eventData.currentParticipants && typeof eventData.currentParticipants === 'object'
      ? (eventData.currentParticipants as Record<string, unknown>)
      : {};
  const customParticipantCounts =
    eventData.customParticipantCounts && typeof eventData.customParticipantCounts === 'object'
      ? (eventData.customParticipantCounts as Record<string, unknown>)
      : {};

  const participantCounts: unknown[] = [
    ...Object.values(currentParticipants),
    ...Object.values(customParticipantCounts),
  ];

  return participantCounts.reduce<number>(
    (total, value) => total + getParticipantCount(value),
    0
  );
}

async function sendEmailForConfirmedBooking(input: {
  internalOrderId: string;
  emailDetails: BookingConfirmationEmailInput;
}): Promise<EmailConfirmationResult> {
  const recipient = input.emailDetails.customerEmail.trim().toLowerCase();

  if (!recipient) {
    return {
      status: 'skipped',
      reason: 'missing_recipient',
    };
  }

  const emailHistory = adminDb.collection(PAYMENT_COLLECTIONS.emailHistory);
  const emailRef = emailHistory.doc(createEmailId(input.emailDetails.bookingId, recipient));
  const emailAttempt = await adminDb.runTransaction<EmailAttempt>(async (transaction) => {
    const emailSnapshot = await transaction.get(emailRef);
    const emailData = emailSnapshot.data() || {};
    const status = asString(emailData.status);

    if (status === 'sent') {
      return {
        shouldSend: false,
        reason: 'already_sent' as const,
        attempts: typeof emailData.attempts === 'number' ? emailData.attempts : undefined,
      };
    }

    if (status === 'pending') {
      return {
        shouldSend: false,
        reason: 'send_in_progress' as const,
        attempts: typeof emailData.attempts === 'number' ? emailData.attempts : undefined,
      };
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
        attempts,
        sentAt: null,
        error: null,
      },
      { merge: true }
    );

    return {
      shouldSend: true,
      attempts,
    };
  });

  if (!emailAttempt.shouldSend) {
    return {
      status: 'skipped',
      emailId: emailRef.id,
      recipient,
      provider: 'resend',
      attempts: emailAttempt.attempts,
      reason: emailAttempt.reason,
    };
  }

  try {
    const emailResult = await sendBookingConfirmationEmail({
      ...input.emailDetails,
      customerEmail: recipient,
    });

    if (!emailResult.sent) {
      const error = emailResult.warning || 'Email provider did not send the message';
      await emailRef.set(
        {
          status: 'failed',
          sentAt: null,
          error,
        },
        { merge: true }
      );

      return {
        status: 'failed',
        emailId: emailRef.id,
        recipient,
        provider: 'resend',
        attempts: emailAttempt.attempts,
        error,
      };
    }

    await emailRef.set(
      {
        status: 'sent',
        sentAt: FieldValue.serverTimestamp(),
        error: null,
      },
      { merge: true }
    );

    return {
      status: 'sent',
      emailId: emailRef.id,
      recipient,
      provider: 'resend',
      attempts: emailAttempt.attempts,
    };
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    await emailRef.set(
      {
        status: 'failed',
        sentAt: null,
        error: errorMessage,
      },
      { merge: true }
    );

    return {
      status: 'failed',
      emailId: emailRef.id,
      recipient,
      provider: 'resend',
      attempts: emailAttempt.attempts,
      error: errorMessage,
    };
  }
}

export async function confirmBookingAfterPayment(
  input: ConfirmBookingInput
): Promise<ConfirmBookingResult> {
  const orderRef = adminDb.collection(PAYMENT_COLLECTIONS.orders).doc(input.internalOrderId);
  const paymentRef = adminDb.collection(PAYMENT_COLLECTIONS.payments).doc(input.internalPaymentId);
  const bookingRef = adminDb.collection('eventBookings').doc();

  const confirmation = await adminDb.runTransaction<BookingConfirmationTransactionResult>(async (transaction) => {
    const [orderSnapshot, paymentSnapshot] = await Promise.all([
      transaction.get(orderRef),
      transaction.get(paymentRef),
    ]);

    if (!orderSnapshot.exists) {
      throw new Error('Order not found for booking confirmation');
    }

    if (!paymentSnapshot.exists) {
      throw new Error('Payment not found for booking confirmation');
    }

    const orderData = orderSnapshot.data() || {};
    const paymentData = paymentSnapshot.data() || {};

    const eventId = asString(orderData.eventId);
    const ticketType = asString(orderData.ticketType);
    if (!eventId || !ticketType) {
      throw new Error('Order is missing event or ticket details');
    }

    const eventRef = adminDb.collection('events').doc(eventId);
    const eventSnapshot = await transaction.get(eventRef);
    if (!eventSnapshot.exists) {
      throw new Error('Event not found for booking confirmation');
    }

    const eventData = eventSnapshot.data() || {};
    const customer =
      orderData.customer && typeof orderData.customer === 'object'
        ? (orderData.customer as Record<string, unknown>)
        : {};
    const bookingDetails =
      orderData.bookingDetails && typeof orderData.bookingDetails === 'object'
        ? (orderData.bookingDetails as Record<string, unknown>)
        : {};
    const bookingLeadId = asString(orderData.bookingLeadId);
    const bookingId =
      input.legacy?.bookingId || asString(orderData.bookingId) || createPaymentBookingId();
    const ticketLabel =
      input.legacy?.ticketLabel || asString(orderData.ticketLabel, ticketType);

    const bookingPayload = {
      bookingId,
      eventId,
      bookingLeadId: bookingLeadId || null,
      eventTitle: input.legacy?.eventTitle || asString(eventData.title, 'Untitled Event'),
      eventDate: input.legacy?.eventDate || asString(eventData.date),
      eventTime: input.legacy?.eventTime || asString(eventData.time),
      eventLocation: input.legacy?.eventLocation || asString(eventData.location),
      ticketGender: ticketType,
      ticketLabel,
      amountPaid: input.amount,
      currency: input.currency,
      orderId: input.razorpayOrderId,
      paymentId: input.razorpayPaymentId,
      customerName: input.legacy?.customerName || asString(customer.name),
      customerEmail: input.legacy?.customerEmail || asString(customer.email),
      customerPhone: input.legacy?.customerPhone || asString(customer.phone),
      age: input.legacy?.age || asString(bookingDetails.age),
      dietaryRestrictions:
        input.legacy?.dietaryRestrictions || asString(bookingDetails.dietaryRestrictions),
      experience: input.legacy?.experience || asString(bookingDetails.experience),
      createdAt: new Date(),
      status: 'confirmed',
      confirmedBy: input.source,
    };

    const emailDetails = {
      customerEmail: bookingPayload.customerEmail,
      customerName: bookingPayload.customerName,
      eventTitle: bookingPayload.eventTitle,
      eventDate: bookingPayload.eventDate,
      eventTime: bookingPayload.eventTime,
      eventLocation: bookingPayload.eventLocation,
      ticketType: bookingPayload.ticketLabel,
      amount: bookingPayload.amountPaid,
      bookingId,
      paymentId: input.razorpayPaymentId,
      currency: bookingPayload.currency,
    };

    const existingBookingId = asString(paymentData.bookingId) || asString(orderData.bookingId);
    const existingEventBookingDocId =
      asString(paymentData.eventBookingDocId) || asString(orderData.eventBookingDocId);

    if (existingBookingId && existingEventBookingDocId) {
      if (bookingLeadId) {
        transaction.set(
          adminDb.collection('bookingLeads').doc(bookingLeadId),
          {
            status: 'confirmed',
            bookingId: existingBookingId,
            eventBookingDocId: existingEventBookingDocId,
            orderId: input.razorpayOrderId,
            paymentId: input.razorpayPaymentId,
            amountPaid: input.amount,
            currency: input.currency,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      return {
        bookingId: existingBookingId,
        eventBookingDocId: existingEventBookingDocId,
        alreadyConfirmed: true,
        emailDetails: {
          ...emailDetails,
          bookingId: existingBookingId,
        },
      };
    }

    const maxCapacity = getParticipantCount(eventData.maxCapacity);
    const participants = getTotalParticipants(eventData);
    if (participants >= maxCapacity) {
      throw new Error('Event capacity has been reached');
    }

    transaction.set(bookingRef, bookingPayload);

    if (bookingLeadId) {
      transaction.set(
        adminDb.collection('bookingLeads').doc(bookingLeadId),
        {
          status: 'confirmed',
          bookingId,
          eventBookingDocId: bookingRef.id,
          orderId: input.razorpayOrderId,
          paymentId: input.razorpayPaymentId,
          amountPaid: input.amount,
          currency: input.currency,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    if (ticketType === 'male' || ticketType === 'female' || ticketType === 'couple') {
      transaction.update(eventRef, {
        [`currentParticipants.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });
    } else {
      transaction.update(eventRef, {
        [`customParticipantCounts.${ticketType}`]: FieldValue.increment(1),
        updatedAt: new Date(),
      });
    }

    transaction.update(paymentRef, {
      status: 'captured',
      bookingId,
      eventBookingDocId: bookingRef.id,
      processedAt: FieldValue.serverTimestamp(),
    });

    transaction.update(orderRef, {
      status: 'confirmed',
      paymentState: 'captured',
      bookingId,
      eventBookingDocId: bookingRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });

    const dedupeKey = asString(orderData.dedupeKey);
    if (dedupeKey) {
      transaction.set(
        adminDb.collection(PAYMENT_COLLECTIONS.orderDedupe).doc(dedupeKey),
        {
          status: 'confirmed',
          paymentState: 'captured',
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return {
      bookingId,
      eventBookingDocId: bookingRef.id,
      alreadyConfirmed: false,
      emailDetails,
    };
  });

  if (!isEmailAfterConfirmationEnabled()) {
    return {
      ...confirmation,
      email: {
        status: 'skipped',
        reason: 'feature_flag_disabled',
      },
    };
  }

  const email = await sendEmailForConfirmedBooking({
    internalOrderId: input.internalOrderId,
    emailDetails: confirmation.emailDetails,
  });

  return {
    ...confirmation,
    email,
  };
}
