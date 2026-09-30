import { PaymentValidationError } from '@/lib/payment-hardening';
import type { Firestore } from 'firebase-admin/firestore';

const PRODUCT_CACHE_TTL_MS = 5 * 60_000;
const productCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

export async function getCachedAuraProductData(
  db: Firestore,
  productId: string
): Promise<Record<string, unknown>> {
  const cached = productCache.get(productId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const snapshot = await db.collection('auraProducts').doc(productId).get();
  if (!snapshot.exists) {
    throw new PaymentValidationError('Product not found', 404);
  }

  const data = snapshot.data() || {};
  productCache.set(productId, { data, expiresAt: Date.now() + PRODUCT_CACHE_TTL_MS });
  return data;
}

export function invalidateCachedAuraProductData(productId: string) {
  productCache.delete(productId);
}
