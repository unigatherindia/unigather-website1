'use client';

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
const DEFAULT_CHECKOUT_TIMEOUT_SECONDS = 15 * 60;

let pendingLoad: Promise<boolean> | null = null;

/** Razorpay Checkout's `timeout` option is in seconds. */
export function getCheckoutTimeoutSeconds(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(1, Math.floor(parsed))
    : DEFAULT_CHECKOUT_TIMEOUT_SECONDS;
}

/**
 * Loads the Razorpay checkout script and resolves only once `window.Razorpay`
 * is actually available. Safe to call repeatedly — the script is added once.
 */
export function loadRazorpayCheckout(timeoutMs = 10000): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);

  const globalWindow = window as Window & { Razorpay?: unknown };
  if (typeof globalWindow.Razorpay === 'function') return Promise.resolve(true);
  if (pendingLoad) return pendingLoad;

  pendingLoad = new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ready: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      if (!ready) pendingLoad = null;
      resolve(ready);
    };

    const timeout = window.setTimeout(() => finish(false), timeoutMs);

    let script = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (!script) {
      script = document.createElement('script');
      script.src = CHECKOUT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }

    script.addEventListener(
      'load',
      () => finish(typeof globalWindow.Razorpay === 'function'),
      { once: true }
    );
    script.addEventListener('error', () => finish(false), { once: true });
  });

  return pendingLoad;
}
