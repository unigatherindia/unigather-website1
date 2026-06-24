const CACHE_PREFIX = 'ug_fs_';

interface CacheEnvelope<T> {
  expiresAt: number;
  data: T;
}

export function readClientFirestoreCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = sessionStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.expiresAt || parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}

export function writeClientFirestoreCache<T>(key: string, data: T, ttlMs: number) {
  if (typeof window === 'undefined') return;

  try {
    const envelope: CacheEnvelope<T> = {
      expiresAt: Date.now() + ttlMs,
      data,
    };
    sessionStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(envelope));
  } catch {
    // Ignore quota or serialization errors.
  }
}

export function invalidateClientFirestoreCache(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(`${CACHE_PREFIX}${key}`);
}

/** Shared TTL for public Firestore reads (events, gallery, etc.). */
export const CLIENT_FIRESTORE_CACHE_TTL_MS = 5 * 60_000;
