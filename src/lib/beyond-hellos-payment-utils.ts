import crypto from 'crypto';
import { resolveEventCurrency } from '@/constants/countries';
import { getRazorpayCurrency } from '@/lib/razorpay-config';
import { isTicketSoldOut, parseNumericTicketPrice } from '@/lib/ticket-price-utils';
import { PaymentValidationError } from '@/lib/payment-hardening';
import {
  getBeyondHellosTicketLabel,
  getBeyondHellosTicketPriceRaw,
  isBeyondHellosTicketListed,
  type BeyondHellosConfig,
  type BeyondHellosTicketType,
} from '@/types/beyond-hellos';

export function createBeyondHellosOrderDedupeKey(input: {
  customerEmail: string;
  customerPhone: string;
  city: string;
  ticketType: BeyondHellosTicketType;
}) {
  const payload = [
    'beyond_hellos',
    input.ticketType,
    input.customerEmail.trim().toLowerCase(),
    input.customerPhone.trim(),
    input.city.trim().toLowerCase(),
  ].join('|');
  return crypto.createHash('sha256').update(payload).digest('hex');
}

export function normalizeBeyondHellosTicketType(value: unknown): BeyondHellosTicketType {
  if (value === 'male' || value === 'female') return value;
  throw new PaymentValidationError('Ticket type must be male or female');
}

export function resolveTrustedBeyondHellosPrice(
  config: BeyondHellosConfig,
  ticketType: BeyondHellosTicketType
) {
  if (!config.enabled) {
    throw new PaymentValidationError('Beyond Hello\'s bookings are not available right now', 404);
  }

  const raw = getBeyondHellosTicketPriceRaw(config, ticketType);
  if (!isBeyondHellosTicketListed(config, ticketType)) {
    throw new PaymentValidationError(
      `${getBeyondHellosTicketLabel(ticketType)} booking is not available`,
      404
    );
  }

  if (isTicketSoldOut(raw)) {
    throw new PaymentValidationError(`${getBeyondHellosTicketLabel(ticketType)} is sold out`, 404);
  }

  const price = parseNumericTicketPrice(raw);
  if (price === undefined) {
    throw new PaymentValidationError(
      'Online payment is not available for this ticket price. Contact Unigather to complete booking.',
      400
    );
  }

  const currency =
    resolveEventCurrency({ currency: config.currency, countryCode: config.countryCode }) ||
    getRazorpayCurrency();
  const amountSubunits = Math.round(price * 100);

  return {
    amount: price,
    amountSubunits,
    currency,
    productLabel: config.title,
    ticketType,
    ticketLabel: getBeyondHellosTicketLabel(ticketType),
    priceDisplay: raw,
  };
}
