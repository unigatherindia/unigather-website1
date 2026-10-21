export const AURA_HOME_PROMO_CONFIG_COLLECTION = 'auraHomePromoConfig';
export const AURA_HOME_PROMO_CONFIG_DOC_ID = 'default';

export type AuraHomePromoConfig = {
  /** Show the home-page Aura poster popup (once per tab visit). */
  popupEnabled: boolean;
  /** Allow tap-through to Buy Your Aura; when off, poster is view-only. */
  ctaEnabled: boolean;
  /** Bottom line on the popup when CTA is enabled. */
  ctaLabel: string;
};

export const DEFAULT_AURA_HOME_PROMO_CONFIG: AuraHomePromoConfig = {
  popupEnabled: true,
  ctaEnabled: true,
  ctaLabel: 'Tap to explore Buy Your Fragrance',
};

export function parseAuraHomePromoConfig(
  data: Record<string, unknown> | undefined
): AuraHomePromoConfig {
  if (!data) return DEFAULT_AURA_HOME_PROMO_CONFIG;

  return {
    popupEnabled: data.popupEnabled !== false,
    ctaEnabled: data.ctaEnabled !== false,
    ctaLabel:
      typeof data.ctaLabel === 'string' && data.ctaLabel.trim()
        ? data.ctaLabel.trim()
        : DEFAULT_AURA_HOME_PROMO_CONFIG.ctaLabel,
  };
}
