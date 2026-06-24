const DEFAULT_RAZORPAY_CURRENCY = 'INR';
const DEFAULT_RAZORPAY_RECEIPT_PREFIX = 'UG';
const DEFAULT_RAZORPAY_PAYMENT_TIMEOUT_MINUTES = 15;
const DEFAULT_RAZORPAY_COMPANY_NAME = 'Unigather';
const DEFAULT_RAZORPAY_THEME_COLOR = '#f97316';

function readEnv(name: string) {
  return process.env[name]?.trim() || '';
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const raw = readEnv(name);
  if (!raw) return fallback;

  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

export function getRazorpayKeyId() {
  return readEnv('RAZORPAY_KEY_ID');
}

export function getPublicRazorpayKeyId() {
  return readEnv('NEXT_PUBLIC_RAZORPAY_KEY_ID');
}

export function getRazorpayKeySecret() {
  return readEnv('RAZORPAY_KEY_SECRET');
}

export function getRazorpayWebhookSecret() {
  return readEnv('RAZORPAY_WEBHOOK_SECRET');
}

export function isWebhookBookingConfirmationEnabled() {
  return readEnv('USE_WEBHOOK_BOOKING_CONFIRMATION').toLowerCase() !== 'false';
}

/** When false (default), webhook payment_logs only records warnings and errors. */
export function isPaymentAuditLoggingEnabled() {
  return readEnv('PAYMENT_AUDIT_LOGS').toLowerCase() === 'true';
}

export function getRazorpayCurrency() {
  return readEnv('RAZORPAY_CURRENCY') || DEFAULT_RAZORPAY_CURRENCY;
}

export function getRazorpayPaymentTimeoutMs() {
  const minutes = readPositiveIntegerEnv(
    'RAZORPAY_PAYMENT_TIMEOUT_MINUTES',
    DEFAULT_RAZORPAY_PAYMENT_TIMEOUT_MINUTES
  );

  return minutes * 60 * 1000;
}

export function createRazorpayReceipt(internalOrderId: string) {
  const prefix = readEnv('RAZORPAY_RECEIPT_PREFIX') || DEFAULT_RAZORPAY_RECEIPT_PREFIX;
  return `${prefix}_${internalOrderId}`.slice(0, 40);
}

export function getRazorpayCheckoutConfig() {
  return {
    companyName: readEnv('RAZORPAY_COMPANY_NAME') || DEFAULT_RAZORPAY_COMPANY_NAME,
    themeColor: readEnv('RAZORPAY_THEME_COLOR') || DEFAULT_RAZORPAY_THEME_COLOR,
  };
}

export function getServerRazorpayConfig() {
  return {
    keyId: getRazorpayKeyId(),
    keySecret: getRazorpayKeySecret(),
    currency: getRazorpayCurrency(),
    paymentTimeoutMs: getRazorpayPaymentTimeoutMs(),
    checkout: getRazorpayCheckoutConfig(),
  };
}
