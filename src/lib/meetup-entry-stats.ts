import { db } from '@/lib/firebase';
import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import {
  CAMPAIGN_LANDING_META,
  buildDefaultStrangersGroupCities,
  parseCitiesList,
  type CampaignCityOption,
} from '@/types/campaign-landing';

/**
 * Stored in the already-allowed `meetupEntryFunnel` collection so no rule changes
 * are needed. Each monthly counter lives in its own document.
 */
export const MEETUP_ENTRY_STATS_COLLECTION = 'meetupEntryFunnel';
export const STRANGERS_FEMALE_STATS_DOC_ID = 'strangers-group-female-enrollments';
export const STRANGERS_MALE_STATS_DOC_ID = 'strangers-group-male-enrollments';
export const STRANGERS_CITY_CLICKS_DOC_ID = 'strangers-group-city-clicks';

const STRANGERS_GROUP_META = CAMPAIGN_LANDING_META['strangers-group'];

/**
 * Hardcoded display seeds. These are only shown on the cards — the stored
 * counters keep pure increment values, so live clicks are added on top of them.
 */
export const FEMALE_ENROLLMENT_BASELINE = 128;

/**
 * Fixed display values for "Monthly Meetups Done". These are hardcoded —
 * city clicks are not added to them. Ludhiana/Jalandhar lead with 4–5, every
 * other city shows 2–3.
 */
export const MONTHLY_MEETUP_BASELINES: Record<string, number> = {
  // High-activity cities
  ludhiana: 5,
  jalandhar: 4,

  // Major cities — 3
  mumbai: 3,
  bangalore: 3,
  kolkata: 3,
  delhi: 3,
  hyderabad: 3,
  pune: 3,
  chennai: 3,

  // Other active cities — 2
  bhopal: 2,
  dehradun: 2,
  jaipur: 2,
  jammu: 2,
  udaipur: 2,
  agra: 2,
  goa: 2,
  amritsar: 2,
  lucknow: 2,
  ahmedabad: 2,
  surat: 2,
  indore: 2,
  nagpur: 2,
  chandigarh: 2,
};

/** Alternate spellings that should reuse a city's seed. */
const BASELINE_ALIASES: Record<string, string> = {
  'new-delhi': 'delhi',
  bengaluru: 'bangalore',
  bombay: 'mumbai',
  calcutta: 'kolkata',
  madras: 'chennai',
};

/** Fixed "Meetups this month" figure — not derived from counters or city seeds. */
export const MONTHLY_MEETUP_TOTAL_BASELINE = 37;

/** Hardcoded country counts for the one-on-one meetup entry page. */
export const MONTHLY_MEETUP_COUNTRIES: { name: string; count: number }[] = [
  { name: 'Dubai', count: 4 },
  { name: 'India', count: 10 },
  { name: 'United Kingdom', count: 3 },
  { name: 'New York', count: 2 },
  { name: 'Saudi Arabia', count: 5 },
  { name: 'Indonesia', count: 1 },
  { name: 'Canada', count: 3 },
  { name: 'Germany', count: 3 },
];

function cityKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeCityKey(value: string): string {
  const key = cityKey(value);
  return BASELINE_ALIASES[key] ?? key;
}

/**
 * Always keeps the standard city list visible while also including any extra
 * cities the admin added. Matching admin cities keep their own id/link so the
 * live join counters and Instagram links keep working.
 */
function mergeStrangersGroupCities(
  configured: CampaignCityOption[]
): CampaignCityOption[] {
  const defaults = buildDefaultStrangersGroupCities();
  const remaining = [...configured];

  const merged = defaults.map((fallbackCity) => {
    const fallbackKey = normalizeCityKey(fallbackCity.name);
    const index = remaining.findIndex(
      (city) =>
        city.id === fallbackCity.id ||
        normalizeCityKey(city.name) === fallbackKey
    );
    if (index === -1) return fallbackCity;

    const [match] = remaining.splice(index, 1);
    return { ...fallbackCity, ...match, id: match.id || fallbackCity.id };
  });

  return [...merged, ...remaining];
}

/** Cities without a specific seed still show the standard 2 meetups. */
export function meetupBaselineForCity(city: CampaignCityOption): number {
  const idKey = city.id.trim().toLowerCase();
  const key = cityKey(city.name);
  const resolved = BASELINE_ALIASES[idKey] ?? BASELINE_ALIASES[key] ?? idKey;

  return (
    MONTHLY_MEETUP_BASELINES[idKey] ??
    MONTHLY_MEETUP_BASELINES[key] ??
    MONTHLY_MEETUP_BASELINES[resolved] ??
    2
  );
}

/** e.g. "2026-11" — used so counters reset automatically each month. */
export function currentMonthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Keeps the cards from waiting on a stalled Firestore request. */
function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Firestore request timed out')), ms)
    ),
  ]);
}

/** Reads the current month's female enrollment count (0 if a new month has started). */
export async function fetchMonthlyFemaleEnrollmentCount(): Promise<number> {
  if (!db) return 0;

  const snap = await withTimeout(
    getDoc(doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_FEMALE_STATS_DOC_ID))
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

/** Reads the current month's male entry count (0 if a new month has started). */
export async function fetchMonthlyMaleEnrollmentCount(): Promise<number> {
  if (!db) return 0;

  const snap = await withTimeout(
    getDoc(doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_MALE_STATS_DOC_ID))
  );
  if (!snap.exists()) return 0;

  const data = snap.data();
  if (data.month !== currentMonthKey()) return 0;

  return typeof data.count === 'number' ? data.count : 0;
}

/** Atomically increments this month's male entry count, resetting on a new month. */
export async function incrementMonthlyMaleEnrollmentCount(): Promise<number | null> {
  if (!db) return null;

  const ref = doc(db, MEETUP_ENTRY_STATS_COLLECTION, STRANGERS_MALE_STATS_DOC_ID);
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
    console.error('Male entry counter failed:', error);
    return null;
  }
}

/**
 * Reads the admin-configured cities for the strangers group meetup.
 * The stats cards fall back to the standard city list when the admin has not
 * saved any cities yet (or Firestore is unreachable), so the section never
 * shows an empty "No cities added yet" state.
 */
export async function fetchStrangersGroupCities(): Promise<CampaignCityOption[]> {
  if (!db) return buildDefaultStrangersGroupCities();

  try {
    const snap = await withTimeout(
      getDoc(doc(db, STRANGERS_GROUP_META.configCollection, STRANGERS_GROUP_META.configDocId))
    );
    if (!snap.exists()) return buildDefaultStrangersGroupCities();

    const cities = parseCitiesList(snap.data()?.cities);
    if (cities.length === 0) return buildDefaultStrangersGroupCities();
    return mergeStrangersGroupCities(cities);
  } catch (error) {
    console.error('Load strangers group cities:', error);
    return buildDefaultStrangersGroupCities();
  }
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
