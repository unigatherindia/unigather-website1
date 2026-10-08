/** Default complimentary-gift promo image (override via admin or env). */
export const DEFAULT_FREE_GIFT_PROMO_IMAGE =
  process.env.NEXT_PUBLIC_FREE_GIFT_PROMO_IMAGE?.trim() || '/media/complimentary-fragrance-promo.png';

export const DEFAULT_FREE_GIFT_PROMO_TITLE = 'FREE Unigather Premium Fragrance';
export const DEFAULT_FREE_GIFT_PROMO_SUBTITLE = '7ml Fragrance Oil with every booking';
export const DEFAULT_FREE_GIFT_PROMO_HIGHLIGHTS = [
  'Premium Fragrance Oil',
  '7ml Bottle',
  'Delivered to your doorstep',
] as const;

export function resolveFreeGiftPromoImageUrl(freeGiftImageUrl?: string | null): string {
  const custom = typeof freeGiftImageUrl === 'string' ? freeGiftImageUrl.trim() : '';
  return custom || DEFAULT_FREE_GIFT_PROMO_IMAGE;
}

function resolveFreeGiftPromoText(value: string | null | undefined, fallback: string): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
}

export function resolveFreeGiftPromoTitle(title?: string | null): string {
  return resolveFreeGiftPromoText(title, DEFAULT_FREE_GIFT_PROMO_TITLE);
}

export function resolveFreeGiftPromoSubtitle(subtitle?: string | null): string {
  return resolveFreeGiftPromoText(subtitle, DEFAULT_FREE_GIFT_PROMO_SUBTITLE);
}

export function resolveFreeGiftPromoHighlights(highlights?: string[] | null): string[] {
  if (Array.isArray(highlights)) {
    const cleaned = highlights.map((h) => (typeof h === 'string' ? h.trim() : '')).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  return [...DEFAULT_FREE_GIFT_PROMO_HIGHLIGHTS];
}
