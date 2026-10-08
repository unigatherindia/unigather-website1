/** Default complimentary-gift promo image (override via admin or env). */
export const DEFAULT_FREE_GIFT_PROMO_IMAGE =
  process.env.NEXT_PUBLIC_FREE_GIFT_PROMO_IMAGE?.trim() || '/media/complimentary-fragrance-promo.png';

export function resolveFreeGiftPromoImageUrl(freeGiftImageUrl?: string | null): string {
  const custom = typeof freeGiftImageUrl === 'string' ? freeGiftImageUrl.trim() : '';
  return custom || DEFAULT_FREE_GIFT_PROMO_IMAGE;
}
