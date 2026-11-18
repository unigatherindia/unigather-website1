import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  CAMPAIGN_LANDING_META,
  parseCitiesList,
  type CampaignCityOption,
} from '@/types/campaign-landing';

/**
 * Stored in the already-allowed `meetupEntryFunnel` collection so no rule changes
 * are needed. Each monthly counter lives in its own document.
 */
export const MEETUP_ENTRY_STATS_COLLECTION = 'meetupEntryFunnel';
export const STRANGERS_FEMALE_STATS_DOC_ID = 'strangers-group-female-enrollments';
export const STRANGERS_CITY_CLICKS_DOC_ID = 'strangers-group-city-clicks';

const STRANGERS_GROUP_META = CAMPAIGN_LANDING_META['strangers-group'];

/** e.g. "2026-11" — used so counters reset automatically each month. */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Reads the current month's female enrollment count (0 if a new month has started). */
export async function fetchMonthlyFemaleEnrollmentCount(): Promise<number> {
  if (!db) return 0;

  const snap = await getDoc(
    doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_FEMALE_STATS_DOC_ID)
  );
  if (!snap.exists()) return 0;

  const data = snap.data();
  if (data.month !== currentMonthKey()) return 0;

  return typeof data.count === 'number' ? data.count : 0;
}

/**
 * Atomically increments this month's female enrollment count.
 * Resets the count to 1 when the stored month is not the current one.
 * Returns the new count, or null when the write fails.
 */
export async function incrementMonthlyFemaleEnrollmentCount(): Promise<number | null> {
  if (!db) return null;

  const ref = doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_FEMALE_STATS_DOC_ID);
  const month = currentMonthKey();

  try {
    return await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.data();
      const isCurrentMonth =
        snap.exists() && data?.month === month && typeof data.count === 'number';
      const nextCount = isCurrentMonth ? (data.count as number) + 1 : 1;

      transaction.set(
        ref,
        { count: nextCount, month, updatedAt: serverTimestamp() },
        { merge: true }
      );

      return nextCount;
    });
  } catch (error) {
    console.error('Female enrollment counter failed:', error);
    return null;
  }
}

/** Reads the admin-configured cities for the strangers group meetup. */
export async function fetchStrangersGroupCities(): Promise<CampaignCityOption[]> {
  if (!db) return [];

  try {
    const snap = await getDoc(
      doc(db, STRANGERS_GROUP_META.configCollection, STRANGERS_GROUP_META.configDocId)
    );
    if (!snap.exists()) return [];
    return parseCitiesList(snap.data()?.cities);
  } catch (error) {
    console.error('Load strangers group cities:', error);
    return [];
  }
}

/**
 * Reads this month's Instagram-group join clicks per city.
 * Cities without a stored count are simply absent (treated as 0), so a newly
 * added city always starts at zero.
 */
export async function fetchMonthlyCityJoinCounts(): Promise<Record<string, number>> {
  if (!db) return {};

  const snap = await getDoc(
    doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_CITY_CLICKS_DOC_ID)
  );
  if (!snap.exists()) return {};

  const data = snap.data();
  if (data.month !== currentMonthKey()) return {};

  const raw = data.counts;
  if (!raw || typeof raw !== 'object') return {};

  const counts: Record<string, number> = {};
  for (const [cityId, value] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof value === 'number' && value > 0) counts[cityId] = value;
  }
  return counts;
}

/**
 * Atomically increments this month's join count for one city.
 * When the stored month is stale the whole map restarts from empty, which also
 * means any newly added city begins at zero.
 */
export async function incrementMonthlyCityJoinCount(cityId: string): Promise<void> {
  if (!db || !cityId) return;

  const ref = doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_CITY_CLICKS_DOC_ID);
  const month = currentMonthKey();

  try {
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      const data = snap.data();
      const isCurrentMonth = snap.exists() && data?.month === month;
      const previous =
        isCurrentMonth && data?.counts && typeof data.counts === 'object'
          ? (data.counts as Record<string, unknown>)
          : {};

      const counts: Record<string, number> = {};
      for (const [key, value] of Object.entries(previous)) {
        if (typeof value === 'number' && value > 0) counts[key] = value;
      }
      counts[cityId] = (counts[cityId] ?? 0) + 1;

      transaction.set(
        ref,
        { month, counts, updatedAt: serverTimestamp() },
        { merge: true }
      );
    });
  } catch (error) {
    console.error('City join counter failed:', error);
  }
}
