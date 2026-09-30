import { db } from '@/lib/firebase';
import { mapAuraProductDoc } from '@/lib/aura-product-map';
import {
  CLIENT_FIRESTORE_CACHE_TTL_MS,
  readClientFirestoreCache,
  writeClientFirestoreCache,
} from '@/lib/client-firestore-cache';
import type { AuraProduct } from '@/types/aura-product';
import { collection, doc, getDoc, getDocs, orderBy, query } from 'firebase/firestore';

const CACHE_KEY = 'public_aura_products_v2';

export async function loadAuraProducts(): Promise<AuraProduct[]> {
  if (!db) return [];

  const cached = readClientFirestoreCache<AuraProduct[]>(CACHE_KEY);
  if (cached?.length) return cached;

  const col = collection(db, 'auraProducts');
  let snapshot;
  try {
    snapshot = await getDocs(query(col, orderBy('createdAt', 'desc')));
  } catch {
    snapshot = await getDocs(col);
  }

  const items = snapshot.docs
    .map((d) => mapAuraProductDoc(d.id, d.data() as Record<string, unknown>))
    .filter((p) => p.status !== 'archived');

  writeClientFirestoreCache(CACHE_KEY, items, CLIENT_FIRESTORE_CACHE_TTL_MS);
  return items;
}

export async function loadAuraProductById(productId: string): Promise<AuraProduct | null> {
  if (!db || !productId) return null;

  const cached = readClientFirestoreCache<AuraProduct[]>(CACHE_KEY);
  const fromCache = cached?.find((p) => p.id === productId);
  if (fromCache) return fromCache;

  const snap = await getDoc(doc(db, 'auraProducts', productId));
  if (!snap.exists()) return null;

  const product = mapAuraProductDoc(snap.id, snap.data() as Record<string, unknown>);
  if (product.status === 'archived') return null;
  return product;
}

function auraProductHasValidPrice(product: AuraProduct): boolean {
  const { price } = product;
  if (price === null || price === undefined || price === '') return false;
  if (typeof price === 'number') return Number.isFinite(price) && price > 0;
  const lower = String(price).trim().toLowerCase();
  if (!lower || lower.includes('sold')) return false;
  const n = Number(String(price).replace(/[₹,\s]/g, ''));
  return Number.isFinite(n) && n > 0;
}

export function getAuraProductSoldOut(product: AuraProduct): boolean {
  if (!auraProductHasValidPrice(product)) return true;
  const priceSold =
    typeof product.price !== 'number' && String(product.price).toLowerCase().includes('sold');
  const stockLeft =
    product.maxStock != null
      ? Math.max(0, product.maxStock - (product.unitsSold || 0))
      : null;
  return priceSold || (stockLeft !== null && stockLeft <= 0);
}
