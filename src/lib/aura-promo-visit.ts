/**
 * In-memory only (resets when the tab is closed or the page is fully reloaded).
 * Avoids sessionStorage sticking around on mobile/PWA and blocking the promo.
 */
let promoShownThisTabVisit = false;

export function canShowAuraPromoThisTabVisit(): boolean {
  return !promoShownThisTabVisit;
}

export function markAuraPromoShownThisTabVisit(): void {
  promoShownThisTabVisit = true;
}

/** Remove legacy keys that could block the promo after updates. */
export function clearLegacyAuraPromoStorage(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('unigather_aura_promo_dismissed');
    sessionStorage.removeItem('unigather_aura_promo_shown_session');
  } catch {
    /* ignore */
  }
}
