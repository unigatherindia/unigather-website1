import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

/**
 * Stored in the already-allowed `meetupEntryFunnel` collection so no rule changes
 * are needed. The monthly counter lives in its own document.
 */
export const MEETUP_ENTRY_STATS_COLLECTION = 'meetupEntryFunnel';
export const STRANGERS_FEMALE_STATS_DOC_ID = 'strangers-group-female-enrollments';

/** e.g. "2026-11" — used so the counter resets automatically each month. */
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

export type MonthlyMeetupCityStat = {
  city: string;
  meetups: number;
};

/**
 * Testing numbers for now — replace with live/admin data later.
 * The meetups card and total are calculated from this list.
 */
export const MONTHLY_MEETUP_CITY_STATS: MonthlyMeetupCityStat[] = [
  { city: 'Bhopal', meetups: 4 },
  { city: 'Dehradun', meetups: 3 },
  { city: 'Bangalore', meetups: 6 },
  { city: 'Mumbai', meetups: 5 },
  { city: 'Delhi', meetups: 3 },
  { city: 'Pune', meetups: 2 },
  { city: 'Lucknow', meetups: 2 },
  { city: 'Indore', meetups: 1 },
];

export const MONTHLY_MEETUP_TOTAL = MONTHLY_MEETUP_CITY_STATS.reduce(
  (sum, item) => sum + item.meetups,
  0
);
