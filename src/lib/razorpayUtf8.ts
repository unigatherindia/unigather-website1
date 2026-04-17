/**
 * Razorpay order API often returns "notes field should contain valid UTF-8"
 * for legitimate Unicode. We omit `notes` on order create; booking data lives in Firestore.
 * Checkout description/prefill use ASCII-only to avoid similar issues in the widget.
 */

/**
 * Razorpay Checkout is safest with printable ASCII only (description, prefill).
 */
export function toRazorpayAscii(
  input: unknown,
  maxLen: number,
  fallback = 'Unigather'
): string {
  let s = input == null ? '' : String(input);
  s = s.normalize('NFKD');
  s = s.replace(/[^\x20-\x7E]/g, '');
  s = s.replace(/\s+/g, ' ').trim().slice(0, maxLen);
  return s.length > 0 ? s : fallback;
}
