import crypto from 'crypto';
import { DEFAULT_CURRENCY } from '@/constants/countries';
import { getRazorpayCurrency } from '@/lib/razorpay-config';
import { PaymentValidationError, type PaymentCustomer } from '@/lib/payment-hardening';

export interface AuraShippingDetails {
  address: string;
  city: string;
  state: string;
  pincode: string;
  quantity: number;
}

export function normalizeAuraShippingDetails(details: unknown): AuraShippingDetails {
  if (!details || typeof details !== 'object') {
    throw new PaymentValidationError('Shipping address is required');
  }

  const raw = details as Record<string, unknown>;
  const address = typeof raw.address === 'string' ? raw.address.trim() : '';
  const city = typeof raw.city === 'string' ? raw.city.trim() : '';
  const state = typeof raw.state === 'string' ? raw.state.trim() : '';
  const pincode = typeof raw.pincode === 'string' ? raw.pincode.trim() : '';
  const quantityRaw = raw.quantity;
  const quantity =
    typeof quantityRaw === 'number'
      ? quantityRaw
      : typeof quantityRaw === 'string'
        ? Number(quantityRaw)
        : 1;

  if (!address || !city || !state || !pincode) {
    throw new PaymentValidationError('Complete shipping address is required');
  }

  if (!Number.isFinite(quantity) || quantity < 1 || quantity > 10) {
    throw new PaymentValidationError('Quantity must be between 1 and 10');
  }

  return {
    address,
    city,
    state,
    pincode,
    quantity: Math.floor(quantity),
  };
}

function parseProductPrice(value: unknown): number {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value <= 0) {
      throw new PaymentValidationError('Invalid product price');
    }
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().toLowerCase();
    if (trimmed === 'sold out' || trimmed === 'soldout') {
      throw new PaymentValidationError('Product is sold out');
    }
    const cleaned = value.replace(/[₹,\s]/g, '');
    const amount = Number(cleaned);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new PaymentValidationError('Invalid product price');
    }
    return amount;
  }

  throw new PaymentValidationError('Missing product price');
}

function toPaymentSubunits(amount: number, currency: string): number {
  const zeroDecimal = new Set(['JPY', 'KRW', 'VND']);
  const multiplier = zeroDecimal.has(currency.toUpperCase()) ? 1 : 100;
  return Math.round(amount * multiplier);
}

export function resolveTrustedAuraProductPrice(
  productData: Record<string, unknown>,
  quantity: number
) {
  const unitPrice = parseProductPrice(productData.price);
  const currency =
    typeof productData.currency === 'string' && productData.currency.trim()
      ? productData.currency.trim().toUpperCase()
      : DEFAULT_CURRENCY || getRazorpayCurrency();

  const amount = unitPrice * quantity;
  const amountSubunits = toPaymentSubunits(amount, currency);

  if (amountSubunits <= 0) {
    throw new PaymentValidationError('Invalid order amount');
  }

  const title =
    typeof productData.title === 'string' && productData.title.trim()
      ? productData.title.trim()
      : 'Aura Product';

  return {
    unitPrice,
    amount,
    amountSubunits,
    currency,
    productLabel: title,
  };
}

export function createAuraOrderDedupeKey(input: {
  productId: string;
  quantity: number;
  customer: PaymentCustomer;
}): string {
  return crypto
    .createHash('sha256')
    .update(
      [
        'aura_product',
        input.productId.trim(),
        String(input.quantity),
        input.customer.email,
        input.customer.phone,
      ].join('|')
    )
    .digest('hex');
}

export function getAuraProductStock(productData: Record<string, unknown>): {
  maxStock: number | null;
  unitsSold: number;
  available: number | null;
} {
  const maxStock =
    typeof productData.maxStock === 'number' && productData.maxStock > 0
      ? productData.maxStock
      : null;
  const unitsSold =
    typeof productData.unitsSold === 'number' && productData.unitsSold >= 0
      ? productData.unitsSold
      : 0;

  return {
    maxStock,
    unitsSold,
    available: maxStock !== null ? Math.max(0, maxStock - unitsSold) : null,
  };
}

export function assertAuraProductInStock(
  productData: Record<string, unknown>,
  quantity: number
) {
  const { maxStock, unitsSold } = getAuraProductStock(productData);
  if (maxStock === null) return;

  if (unitsSold + quantity > maxStock) {
    throw new PaymentValidationError('Not enough stock for this quantity', 409);
  }
}
