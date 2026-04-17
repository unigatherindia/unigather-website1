/**
 * Razorpay validates UTF-8 on several string fields. Strip characters that
 * commonly break their checks (control chars, lone surrogates, zero-width).
 */
export function stripForRazorpayText(input: unknown, maxLen: number): string {
  let s = input == null ? '' : String(input);
  s = s.normalize('NFC');
  s = s.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, '');
  s = s.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    ''
  );
  return s.trim().slice(0, maxLen);
}

export function sanitizeRazorpayNotesObject(
  notes: Record<string, unknown>,
  maxKeyLen = 40,
  maxValLen = 250,
  maxPairs = 15
): Record<string, string> {
  const out: Record<string, string> = {};
  let count = 0;
  for (const [rawKey, rawVal] of Object.entries(notes)) {
    if (count >= maxPairs) break;
    const key = String(rawKey ?? '')
      .trim()
      .replace(/[^\w.-]/g, '_')
      .slice(0, maxKeyLen);
    if (!key) continue;
    const val = stripForRazorpayText(rawVal, maxValLen);
    if (!val) continue;
    out[key] = val;
    count++;
  }
  return out;
}
