import crypto from 'crypto';
import { resolveEventCurrency } from '@/constants/countries';
import { getRazorpayCurrency } from '@/lib/razorpay-config';

export const PAYMENT_COLLECTIONS = {
  orders: 'orders',
  orderDedupe: 'order_dedupe',
  orderRazorpay: 'order_razorpay',
  payments: 'payments',
  emailHistory: 'email_history',
  webhookEvents: 'webhook_events',
  paymentLogs: 'payment_logs',
} as const;

/** Incomplete orders without a Razorpay id older than this may be replaced. */
export const STALE_INCOMPLETE_ORDER_MS = 90_000;

export function isReusablePendingOrder(
  data: Record<string, unknown>,
  nowMillis = Date.now()
): boolean {
  const expiresAt =
    typeof (data.expiresAt as { toMillis?: () => number } | undefined)?.toMillis === 'function'
      ? (data.expiresAt as { toMillis: () => number }).toMillis()
      : 0;

  return (
    data.status === 'pending' &&
    data.paymentState === 'created' &&
    expiresAt > nowMillis &&
    typeof data.razorpayOrderId === 'string' &&
    data.razorpayOrderId.length > 0
  );
}

export function isStaleIncompleteOrder(
  data: Record<string, unknown>,
  nowMillis = Date.now()
): boolean {
  if (typeof data.razorpayOrderId === 'string' && data.razorpayOrderId.length > 0) {
    return false;
  }

  const timestamp = data.updatedAt ?? data.createdAt;
  const updatedAt =
    typeof (timestamp as { toMillis?: () => number } | undefined)?.toMillis === 'function'
      ? (timestamp as { toMillis: () => number }).toMillis()
      : 0;

  return updatedAt > 0 && nowMillis - updatedAt > STALE_INCOMPLETE_ORDER_MS;
}

export const ORDER_STATUSES = [
  'pending',
  'processing',
  'confirmed',
  'cancelled',
  'expired',
] as const;

export const PAYMENT_STATES = [
  'created',
  'authorized',
  'captured',
  'failed',
  'refunded',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type PaymentState = (typeof PAYMENT_STATES)[number];

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
}

export interface PaymentBookingDetails {
  age?: string;
  dietaryRestrictions?: string;
  experience?: string;
}

export interface TrustedTicketPrice {
  amount: number;
  amountSubunits: number;
  currency: string;
  ticketLabel: string;
}

export interface OrderRecord {
  internalOrderId: string;
  razorpayOrderId: string | null;
  status: OrderStatus;
  paymentState: PaymentState;
  eventId: string;
  ticketType: string;
  customer: PaymentCustomer;
  amount: number;
  currency: string;
  receipt: string | null;
  createdAt: unknown;
  updatedAt: unknown;
  expiresAt: unknown;
}

export interface PaymentRecord {
  internalPaymentId: string;
  internalOrderId: string;
  razorpayPaymentId: string;
  status: PaymentState;
  amount: number;
  currency: string;
  createdAt: unknown;
  processedAt: unknown;
}

export interface WebhookEventRecord {
  internalWebhookEventId: string;
  razorpayEventId?: string;
  eventType?: string;
  status?: 'received' | 'processed' | 'ignored' | 'failed';
  createdAt?: unknown;
  processedAt?: unknown;
}

export interface PaymentLogRecord {
  internalPaymentLogId: string;
  internalOrderId?: string;
  internalPaymentId?: string;
  provider?: 'razorpay';
  eventType?: string;
  razorpayEventId?: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  createdAt: unknown;
}

export class PaymentValidationError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = 'PaymentValidationError';
    this.status = status;
  }
}

export function createPaymentBookingId() {
  return `UG${Date.now().toString().slice(-8)}`;
}

export function normalizePaymentCustomer(customer: unknown): PaymentCustomer {
  if (!customer || typeof customer !== 'object') {
    throw new PaymentValidationError('Customer details are required');
  }

  const raw = customer as Record<string, unknown>;
  const normalized = {
    name: typeof raw.name === 'string' ? raw.name.trim() : '',
    email: typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : '',
    phone: typeof raw.phone === 'string' ? raw.phone.trim() : '',
  };

  if (!normalized.name || !normalized.email || !normalized.phone) {
    throw new PaymentValidationError('Customer name, email, and phone are required');
  }

  return normalized;
}

export function normalizePaymentBookingDetails(details: unknown): PaymentBookingDetails {
  if (!details || typeof details !== 'object') {
    return {};
  }

  const raw = details as Record<string, unknown>;
  return {
    age: typeof raw.age === 'string' ? raw.age.trim() : '',
    dietaryRestrictions:
      typeof raw.dietaryRestrictions === 'string' ? raw.dietaryRestrictions.trim() : '',
    experience: typeof raw.experience === 'string' ? raw.experience.trim() : '',
  };
}

export function createOrderDedupeKey(input: {
  eventId: string;
  ticketType: string;
  customer: PaymentCustomer;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      [
        input.eventId.trim(),
        input.ticketType.trim(),
        input.customer.email,
        input.customer.phone,
      ].join('|')
    )
    .digest('hex');
}

function isSoldOutPrice(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const priceText = value.toLowerCase().trim();
  return priceText === 'sold out' || priceText === 'soldout' || priceText === 'sold-out';
}

function parseTrustedAmount(value: unknown): number {
  if (value === undefined || value === null) {
    throw new PaymentValidationError('Missing ticket price');
  }

  if (isSoldOutPrice(value)) {
    throw new PaymentValidationError('Selected ticket is sold out');
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new PaymentValidationError('Invalid ticket amount');
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === 'n/a') {
      throw new PaymentValidationError('Missing ticket price');
    }

    const cleaned = trimmed.replace(/[^\d.]/g, '');
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new PaymentValidationError('Invalid ticket amount');
    }
    return amount;
  }

  throw new PaymentValidationError('Invalid ticket amount');
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

  if (!customTicket) {
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

function toPaymentSubunits(amount: number, currency: string): number {
  const zeroDecimalCurrencies = new Set([
    'BIF',
    'CLP',
    'DJF',
    'GNF',
    'JPY',
    'KMF',
    'KRW',
    'MGA',
    'PYG',
    'RWF',
    'UGX',
    'VND',
    'VUV',
    'XAF',
    'XOF',
    'XPF',
  ]);
  const multiplier = zeroDecimalCurrencies.has(currency.toUpperCase()) ? 1 : 100;
  return Math.round(amount * multiplier);
}

export function resolveTrustedTicketPrice(
  eventData: Record<string, unknown>,
  ticketType: string
): TrustedTicketPrice {
  if (!ticketType || typeof ticketType !== 'string') {
    throw new PaymentValidationError('Ticket type is required');
  }

  const { price, label } = getTicketPriceValue(eventData, ticketType);
  const amount = parseTrustedAmount(price);
  const currency = resolveEventCurrency({
    currency: typeof eventData.currency === 'string' ? eventData.currency : undefined,
    countryCode: typeof eventData.countryCode === 'string' ? eventData.countryCode : undefined,
  }) || getRazorpayCurrency();
  const amountSubunits = toPaymentSubunits(amount, currency);

  if (amountSubunits <= 0) {
    throw new PaymentValidationError('Invalid ticket amount');
  }

  return {
    amount,
    amountSubunits,
    currency,
    ticketLabel: label,
  };
}
