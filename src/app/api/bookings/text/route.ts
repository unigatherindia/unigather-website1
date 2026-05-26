import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';
import {
  sendBookingConfirmationEmail,
  type BookingConfirmationEmailInput,
} from '@/lib/booking-email';
import {
  PaymentValidationError,
  createPaymentBookingId,
  normalizePaymentBookingDetails,
  normalizePaymentCustomer,
} from '@/lib/payment-hardening';
import { resolveEventCurrency } from '@/constants/countries';

export const dynamic = 'force-dynamic';

const TEXT_BOOKING_TYPE = 'text_booking';
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 5;

const textBookingRateLimits = new Map<string, { count: number; resetAt: number }>();

interface TextBookingTransactionResult {
  bookingId: string;
  eventBookingDocId: string;
  amountPaid: string;
  currency: string;
  bookingType: typeof TEXT_BOOKING_TYPE;
  duplicate: boolean;
  emailDetails: BookingConfirmationEmailInput;
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
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

  return [...Object.values(currentParticipants), ...Object.values(customParticipantCounts)]
    .reduce<number>((total, value) => total + getParticipantCount(value), 0);
}

function createTextBookingDedupeKey(input: {
  eventId: string;
  ticketType: string;
  customerEmail: string;
  customerPhone: string;
}) {
  return crypto
    .createHash('sha256')
    .update(
      [
        TEXT_BOOKING_TYPE,
        input.eventId.trim(),
        input.ticketType.trim(),
        input.customerEmail.trim().toLowerCase(),
        input.customerPhone.trim(),
      ].join('|')
    )
    .digest('hex');
}

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown'
  );
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const existing = textBookingRateLimits.get(key);

  textBookingRateLimits.forEach((value, rateLimitKey) => {
    if (value.resetAt <= now) {
      textBookingRateLimits.delete(rateLimitKey);
    }
  });

  if (!existing || existing.resetAt <= now) {
    textBookingRateLimits.set(key, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return true;
  }

  if (existing.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;
  textBookingRateLimits.set(key, existing);
  return true;
}

function isSoldOutPrice(value: unknown) {
  if (typeof value !== 'string') return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'sold out' || normalized === 'soldout' || normalized === 'sold-out';
}

function parseClientNumericPrice(value: unknown) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }

  if (typeof value !== 'string') return undefined;
  const cleaned = value.trim().replace(/[₹,\s]/g, '');
  const amount = Number(cleaned);
  return Number.isFinite(amount) && amount > 0 ? amount : undefined;
}

function getTicketPriceValue(eventData: Record<string, unknown>, ticketType: string) {
  if (ticketType === 'male') {
    return { price: eventData.priceMale, label: 'Male Ticket' };
  }
  if (ticketType === 'female') {
    return { price: eventData.priceFemale, label: 'Female Ticket' };
  }
  if (ticketType === 'couple') {
    return { price: eventData.priceCouple, label: 'Couple Ticket' };
  }

  const customTicket = Array.isArray(eventData.customTicketOptions)
    ? eventData.customTicketOptions.find((ticket) => {
        return (
          !!ticket &&
          typeof ticket === 'object' &&
          'id' in ticket &&
          ticket.id === ticketType
        );
      })
    : undefined;

  if (!customTicket || typeof customTicket !== 'object') {
    throw new PaymentValidationError('Invalid ticket type');
  }

  const ticketRecord = customTicket as Record<string, unknown>;
  return {
    price: ticketRecord.price,
    label:
      typeof ticketRecord.label === 'string' && ticketRecord.label.trim()
        ? `${ticketRecord.label.trim()} Ticket`
        : 'Ticket',
  };
}

function resolveTrustedTextTicket(eventData: Record<string, unknown>, ticketType: string) {
  const { price, label } = getTicketPriceValue(eventData, ticketType);

  if (isSoldOutPrice(price)) {
    throw new PaymentValidationError('Selected ticket is sold out');
  }

  if (parseClientNumericPrice(price) !== undefined) {
    throw new PaymentValidationError('Numeric ticket prices must use the payment flow');
  }

  if (typeof price !== 'string' || !price.trim() || price.trim().toLowerCase() === 'n/a') {
    throw new PaymentValidationError('Missing ticket price');
  }

  return {
    amountPaid: price.trim(),
    ticketLabel: label,
  };
}

export async function POST(request: NextRequest) {
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
    const dedupeKey = createTextBookingDedupeKey({
      eventId: normalizedEventId,
      ticketType: normalizedTicketType,
      customerEmail: normalizedCustomer.email,
      customerPhone: normalizedCustomer.phone,
    });
    const rateLimitKey = [
      getClientIp(request),
      normalizedEventId,
      normalizedTicketType,
      normalizedCustomer.email,
      normalizedCustomer.phone,
    ].join('|');

    if (!checkRateLimit(rateLimitKey)) {
      return NextResponse.json(
        { success: false, message: 'Too many booking attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const bookingId = createPaymentBookingId();

    const confirmation = await adminDb.runTransaction<TextBookingTransactionResult>(async (transaction) => {
      const eventRef = adminDb.collection('events').doc(normalizedEventId);
      const bookingRef = adminDb.collection('eventBookings').doc(`text_${dedupeKey}`);
      const leadRef = normalizedBookingLeadId
        ? adminDb.collection('bookingLeads').doc(normalizedBookingLeadId)
        : null;
      const [eventSnapshot, existingBookingSnapshot, leadSnapshot] = await Promise.all([
        transaction.get(eventRef),
        transaction.get(bookingRef),
        leadRef ? transaction.get(leadRef) : Promise.resolve(null),
      ]);

      if (!eventSnapshot.exists) {
        throw new PaymentValidationError('Event not found', 404);
      }

      const eventData = eventSnapshot.data() || {};
      const trustedTicket = resolveTrustedTextTicket(eventData, normalizedTicketType);
      const currency = resolveEventCurrency({
        currency: typeof eventData.currency === 'string' ? eventData.currency : undefined,
        countryCode: typeof eventData.countryCode === 'string' ? eventData.countryCode : undefined,
      });
      const eventTitle = asString(eventData.title, 'Untitled Event');
      const eventDate = asString(eventData.date);
      const eventTime = asString(eventData.time);
      const eventLocation = asString(eventData.location);

      if (leadSnapshot?.exists) {
        const leadData = leadSnapshot.data() || {};
        const existingLeadBookingId = asString(leadData.bookingId);
        const existingLeadBookingDocId = asString(leadData.eventBookingDocId);
        const leadMatchesRequest =
          asString(leadData.eventId) === normalizedEventId &&
          asString(leadData.ticketType) === normalizedTicketType &&
          asString(leadData.customerEmail).toLowerCase() === normalizedCustomer.email &&
          asString(leadData.customerPhone) === normalizedCustomer.phone;

        if (
          leadMatchesRequest &&
          asString(leadData.status) === 'confirmed' &&
          existingLeadBookingId &&
          existingLeadBookingDocId
        ) {
          return {
            bookingId: existingLeadBookingId,
            eventBookingDocId: existingLeadBookingDocId,
            amountPaid: trustedTicket.amountPaid,
            currency,
            bookingType: TEXT_BOOKING_TYPE,
            duplicate: true,
            emailDetails: {
              customerEmail: normalizedCustomer.email,
              customerName: normalizedCustomer.name,
              eventTitle,
              eventDate,
              eventTime,
              eventLocation,
              ticketType: trustedTicket.ticketLabel,
              amount: trustedTicket.amountPaid,
              bookingId: existingLeadBookingId,
              bookingType: TEXT_BOOKING_TYPE,
              currency,
            },
          };
        }
      }

      if (existingBookingSnapshot.exists) {
        const existingBookingData = existingBookingSnapshot.data() || {};
        const existingBookingId = asString(existingBookingData.bookingId, bookingId);

        if (leadRef) {
          transaction.set(
            leadRef,
            {
              status: 'confirmed',
              bookingId: existingBookingId,
              eventBookingDocId: bookingRef.id,
              orderId: null,
              paymentId: null,
              bookingType: TEXT_BOOKING_TYPE,
              textBookingDedupeKey: dedupeKey,
              amountPaid: trustedTicket.amountPaid,
              currency,
              updatedAt: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }

        return {
          bookingId: existingBookingId,
          eventBookingDocId: bookingRef.id,
          amountPaid: trustedTicket.amountPaid,
          currency,
          bookingType: TEXT_BOOKING_TYPE,
          duplicate: true,
          emailDetails: {
            customerEmail: asString(existingBookingData.customerEmail, normalizedCustomer.email),
            customerName: asString(existingBookingData.customerName, normalizedCustomer.name),
            eventTitle,
            eventDate,
            eventTime,
            eventLocation,
            ticketType: asString(existingBookingData.ticketLabel, trustedTicket.ticketLabel),
            amount: asString(existingBookingData.amountPaid, trustedTicket.amountPaid),
            bookingId: existingBookingId,
            bookingType: TEXT_BOOKING_TYPE,
            currency,
          },
        };
      }

      const maxCapacity = getParticipantCount(eventData.maxCapacity);
      const participants = getTotalParticipants(eventData);
      if (participants >= maxCapacity) {
        throw new PaymentValidationError('Event capacity has been reached', 409);
      }

      const emailDetails: BookingConfirmationEmailInput = {
        customerEmail: normalizedCustomer.email,
        customerName: normalizedCustomer.name,
        eventTitle,
        eventDate,
        eventTime,
        eventLocation,
        ticketType: trustedTicket.ticketLabel,
        amount: trustedTicket.amountPaid,
        bookingId,
        bookingType: TEXT_BOOKING_TYPE,
        currency,
      };

      transaction.set(bookingRef, {
        bookingId,
        eventId: normalizedEventId,
        bookingLeadId: normalizedBookingLeadId,
        eventTitle: emailDetails.eventTitle,
        eventDate: emailDetails.eventDate,
        eventTime: emailDetails.eventTime,
        eventLocation: emailDetails.eventLocation,
        ticketGender: normalizedTicketType,
        ticketLabel: trustedTicket.ticketLabel,
        amountPaid: trustedTicket.amountPaid,
        currency,
        orderId: null,
        paymentId: null,
        bookingType: TEXT_BOOKING_TYPE,
        textBookingDedupeKey: dedupeKey,
        customerName: normalizedCustomer.name,
        customerEmail: normalizedCustomer.email,
        customerPhone: normalizedCustomer.phone,
        age: normalizedBookingDetails.age || '',
        dietaryRestrictions: normalizedBookingDetails.dietaryRestrictions || '',
        experience: normalizedBookingDetails.experience || '',
        createdAt: FieldValue.serverTimestamp(),
        status: 'confirmed',
        confirmedBy: 'text-booking-api',
      });

      if (normalizedBookingLeadId) {
        transaction.set(
          adminDb.collection('bookingLeads').doc(normalizedBookingLeadId),
          {
            status: 'confirmed',
            bookingId,
            eventBookingDocId: bookingRef.id,
            orderId: null,
            paymentId: null,
            bookingType: TEXT_BOOKING_TYPE,
            textBookingDedupeKey: dedupeKey,
            amountPaid: trustedTicket.amountPaid,
            currency,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      if (
        normalizedTicketType === 'male' ||
        normalizedTicketType === 'female' ||
        normalizedTicketType === 'couple'
      ) {
        transaction.update(eventRef, {
          [`currentParticipants.${normalizedTicketType}`]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.update(eventRef, {
          [`customParticipantCounts.${normalizedTicketType}`]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }

      return {
        bookingId,
        eventBookingDocId: bookingRef.id,
        amountPaid: trustedTicket.amountPaid,
        currency,
        bookingType: TEXT_BOOKING_TYPE,
        duplicate: false,
        emailDetails,
      };
    });

    const { emailDetails, ...confirmationResponse } = confirmation;
    let emailSent = false;
    let emailWarning: string | null = null;

    if (!confirmation.duplicate) {
      try {
        const emailResult = await sendBookingConfirmationEmail(emailDetails);
        emailSent = emailResult.sent;
        emailWarning = emailResult.warning || null;
      } catch (emailError: any) {
        emailWarning = emailError?.message || 'Email sending failed unexpectedly';
        console.error('Text booking confirmation email error:', emailError);
      }
    }

    return NextResponse.json({
      success: true,
      ...confirmationResponse,
      emailSent,
      emailWarning,
    });
  } catch (error: any) {
    console.error('Text booking confirmation error:', error);

    if (error instanceof PaymentValidationError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: 'Failed to confirm booking',
        error: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
