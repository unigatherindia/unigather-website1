import { PaymentValidationError } from '@/lib/payment-hardening';
import type { Firestore } from 'firebase-admin/firestore';

const EVENT_CACHE_TTL_MS = 5 * 60_000;
const eventCache = new Map<string, { data: Record<string, unknown>; expiresAt: number }>();

export async function getCachedEventData(
  db: Firestore,
  eventId: string
): Promise<Record<string, unknown>> {
  const cached = eventCache.get(eventId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const snapshot = await db.collection('events').doc(eventId).get();
  if (!snapshot.exists) {
    throw new PaymentValidationError('Event not found', 404);
  }

  const data = snapshot.data() || {};
  eventCache.set(eventId, { data, expiresAt: Date.now() + EVENT_CACHE_TTL_MS });
  return data;
}

export function invalidateCachedEventData(eventId: string) {
  eventCache.delete(eventId);
}
