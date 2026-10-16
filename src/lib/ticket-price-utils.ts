/** Shared ticket price rules (events, Beyond Hello's, etc.) */

export function isTicketSoldOut(price: number | string | undefined | null): boolean {
  if (price === undefined || price === null) return false;
  if (typeof price === 'number') return false;
  const priceText = String(price).toLowerCase().trim();
  return priceText === 'sold out' || priceText === 'soldout' || priceText === 'sold-out';
}

/** Listed on the card (not N/A, not empty, not zero). */
export function isTicketPriceListed(price: number | string | undefined | null): boolean {
  if (price === undefined || price === null) return false;
  if (typeof price === 'number') return price > 0;
  const priceStr = String(price).toLowerCase().trim();
  return priceStr !== 'n/a' && priceStr !== '0' && priceStr !== '';
}

/** Amount for Razorpay when the price is numeric (digits in string allowed). */
export function parseNumericTicketPrice(
  price: number | string | undefined | null
): number | undefined {
  if (price === undefined || price === null) return undefined;
  if (typeof price === 'number') {
    return Number.isFinite(price) && price > 0 ? price : undefined;
  }
  if (isTicketSoldOut(price)) return undefined;
  const s = String(price).trim();
  if (!s || s.toLowerCase() === 'n/a') return undefined;
  const cleaned = s.replace(/[₹,\s]/g, '');
  const n = Number(cleaned);
  if (Number.isFinite(n) && n > 0) return n;
  return undefined;
}

export function isTicketPricePayableOnline(price: number | string | undefined | null): boolean {
  return parseNumericTicketPrice(price) !== undefined;
}
