import crypto from 'crypto';
import { resolveEventCurrency } from '@/constants/countries';
import { getRazorpayCurrency } from '@/lib/razorpay-config';
import { isTicketSoldOut, parseNumericTicketPrice } from '@/lib/ticket-price-utils';
import { PaymentValidationError } from '@/lib/payment-hardening';
import {
  getBeyondHellosSubscriptionPlan,
  getBeyondHellosSubscriptionPriceRaw,
  getBeyondHellosTicketLabel,
  getBeyondHellosTicketPriceRaw,
  isBeyondHellosSubscriptionPlanListed,
  isBeyondHellosTicketListed,
  type BeyondHellosConfig,
  type BeyondHellosSubscriptionWeeks,
  type BeyondHellosTicketType,
} from '@/types/beyond-hellos';

export function createBeyondHellosOrderDedupeKey(input: {
  customerEmail: string;
  customerPhone: string;
  city: string;
  ticketType: BeyondHellosTicketType;
  configDocId: string;
  subscriptionPlan: string;
}) {
  const payload = [
    'beyond_hellos',
    input.configDocId,
    input.ticketType,
    input.subscriptionPlan,
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
  ticketType: BeyondHellosTicketType,
  subscriptionWeeks: BeyondHellosSubscriptionWeeks | null
) {
  if (!config.enabled) {
    throw new PaymentValidationError('Beyond Hello\'s bookings are not available right now', 404);
  }

  const ticketLabel = getBeyondHellosTicketLabel(ticketType);
  let raw: number | string;
  let subscriptionLabel: string | null = null;
  let resolvedWeeks: BeyondHellosSubscriptionWeeks | null = null;

  if (config.subscriptionEnabled) {
    if (subscriptionWeeks == null) {
      throw new PaymentValidationError('Choose a 1 week, 2 week, or 4 week plan');
    }
    const plan = getBeyondHellosSubscriptionPlan(subscriptionWeeks);
    raw = getBeyondHellosSubscriptionPriceRaw(config, subscriptionWeeks);
    if (!isBeyondHellosSubscriptionPlanListed(config, subscriptionWeeks)) {
      throw new PaymentValidationError(`${plan.label} is not available`, 404);
    }
    if (isTicketSoldOut(raw)) {
      throw new PaymentValidationError(`${plan.label} is sold out`, 404);
    }
    subscriptionLabel = plan.label;
    resolvedWeeks = subscriptionWeeks;
  } else {
    raw = getBeyondHellosTicketPriceRaw(config, ticketType);
    if (!isBeyondHellosTicketListed(config, ticketType)) {
      throw new PaymentValidationError(`${ticketLabel} booking is not available`, 404);
    }
    if (isTicketSoldOut(raw)) {
      throw new PaymentValidationError(`${ticketLabel} is sold out`, 404);
    }
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
    productLabel: subscriptionLabel ? `${config.title} · ${subscriptionLabel}` : config.title,
    ticketType,
    ticketLabel,
    subscriptionWeeks: resolvedWeeks,
    subscriptionLabel,
    priceDisplay: raw,
  };
}
