import { DEFAULT_COUNTRY_CODE, DEFAULT_CURRENCY } from '@/constants/countries';
import { BEYOND_HELLOS_INTRO, ONE_ON_ONE_MEETUP_LABEL } from '@/constants/beyond-hellos-copy';
import {
  isTicketPriceListed,
  isTicketPricePayableOnline,
  isTicketSoldOut,
  parseNumericTicketPrice,
} from '@/lib/ticket-price-utils';

export const BEYOND_HELLOS_CONFIG_COLLECTION = 'beyondHellosConfig';
export const BEYOND_HELLOS_CONFIG_DOC_ID = 'default';
export const BEYOND_HELLOS_BOOKINGS_COLLECTION = 'beyondHellosBookings';

export type BeyondHellosOffer = BeyondHellosConfig & { id: string };

const CONFIG_DOC_ID_PATTERN = /^[a-zA-Z0-9_-]{1,80}$/;

export function resolveBeyondHellosConfigDocId(value: unknown): string {
  if (typeof value === 'string' && CONFIG_DOC_ID_PATTERN.test(value.trim())) {
    return value.trim();
  }
  return BEYOND_HELLOS_CONFIG_DOC_ID;
}

export function parseBeyondHellosOffer(
  id: string,
  data: Record<string, unknown> | undefined
): BeyondHellosOffer {
  return { id, ...parseBeyondHellosConfig(data) };
}

export type BeyondHellosTicketType = 'male' | 'female';

export type BeyondHellosPriceMap = {
  male: number | string;
  female: number | string;
};

export const BEYOND_HELLOS_SUBSCRIPTION_PLANS = [
  { weeks: 1, key: 'week1', label: '1 week' },
  { weeks: 2, key: 'week2', label: '2 weeks' },
  { weeks: 4, key: 'week4', label: '4 weeks' },
] as const;

export type BeyondHellosSubscriptionWeeks = (typeof BEYOND_HELLOS_SUBSCRIPTION_PLANS)[number]['weeks'];
export type BeyondHellosSubscriptionPriceKey = (typeof BEYOND_HELLOS_SUBSCRIPTION_PLANS)[number]['key'];
export type BeyondHellosSubscriptionPrices = Record<BeyondHellosSubscriptionPriceKey, number | string>;

export const EMPTY_BEYOND_HELLOS_SUBSCRIPTION_PRICES: BeyondHellosSubscriptionPrices = {
  week1: '',
  week2: '',
  week4: '',
};

export type BeyondHellosConfig = {
  title: string;
  description: string;
  category: string;
  difficulty: 'Easy' | 'Moderate' | 'Challenging';
  duration: string;
  scheduleNote: string;
  locationLabel: string;
  /** Shown on the card next to the people icon (e.g. you + match + host). */
  groupLabel: string;
  image: string;
  highlights: string[];
  price: BeyondHellosPriceMap;
  /** When true, the user picks 1 week, 2 weeks, or 4 weeks instead of the one-time male/female price. */
  subscriptionEnabled: boolean;
  subscriptionPrices: BeyondHellosSubscriptionPrices;
  currency: string;
  countryCode: string;
  enabled: boolean;
  featured: boolean;
};

export const DEFAULT_BEYOND_HELLOS_CONFIG: BeyondHellosConfig = {
  title: ONE_ON_ONE_MEETUP_LABEL,
  description: BEYOND_HELLOS_INTRO,
  category: 'Social',
  difficulty: 'Easy',
  duration: '1 hour · 4pm – 5pm',
  scheduleNote: 'One week after booking',
  locationLabel: 'Cozy café in your city',
  groupLabel: 'You + match + Unigather host',
  image: '',
  highlights: [
    'Matched with a stranger based on your gender preference',
    'Unigather host at every meetup',
    'Verified profiles · privacy protected',
  ],
  price: { male: 499, female: 499 },
  subscriptionEnabled: false,
  subscriptionPrices: { ...EMPTY_BEYOND_HELLOS_SUBSCRIPTION_PRICES },
  currency: DEFAULT_CURRENCY,
  countryCode: DEFAULT_COUNTRY_CODE,
  enabled: true,
  featured: true,
};

function parseStoredPrice(raw: unknown, fallback: number | string): number | string {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed) return trimmed;
  }
  return fallback;
}

export function getBeyondHellosTicketLabel(ticketType: BeyondHellosTicketType): string {
  return ticketType === 'male' ? 'Male' : 'Female';
}

export function getBeyondHellosTicketPriceRaw(
  config: BeyondHellosConfig,
  ticketType: BeyondHellosTicketType
): number | string {
  return ticketType === 'male' ? config.price.male : config.price.female;
}

export function getBeyondHellosTicketPriceNumeric(
  config: BeyondHellosConfig,
  ticketType: BeyondHellosTicketType
): number | undefined {
  return parseNumericTicketPrice(getBeyondHellosTicketPriceRaw(config, ticketType));
}

export function isBeyondHellosTicketListed(
  config: BeyondHellosConfig,
  ticketType: BeyondHellosTicketType
): boolean {
  return isTicketPriceListed(getBeyondHellosTicketPriceRaw(config, ticketType));
}

export function isBeyondHellosTicketPayable(
  config: BeyondHellosConfig,
  ticketType: BeyondHellosTicketType
): boolean {
  const raw = getBeyondHellosTicketPriceRaw(config, ticketType);
  return isTicketPricePayableOnline(raw) && !isTicketSoldOut(raw);
}

export function hasAnyBeyondHellosTicketListed(config: BeyondHellosConfig): boolean {
  return isBeyondHellosTicketListed(config, 'male') || isBeyondHellosTicketListed(config, 'female');
}

export function hasPayableBeyondHellosTicket(config: BeyondHellosConfig): boolean {
  return isBeyondHellosTicketPayable(config, 'male') || isBeyondHellosTicketPayable(config, 'female');
}

export function getBeyondHellosSubscriptionPlan(weeks: BeyondHellosSubscriptionWeeks) {
  const plan = BEYOND_HELLOS_SUBSCRIPTION_PLANS.find((item) => item.weeks === weeks);
  return plan ?? BEYOND_HELLOS_SUBSCRIPTION_PLANS[0];
}

export function parseBeyondHellosSubscriptionWeeks(value: unknown): BeyondHellosSubscriptionWeeks | null {
  const numeric =
    typeof value === 'number'
      ? value
      : typeof value === 'string' && value.trim()
        ? Number(value)
        : NaN;
  if (numeric === 1 || numeric === 2 || numeric === 4) return numeric;
  return null;
}

export function getBeyondHellosSubscriptionPriceRaw(
  config: BeyondHellosConfig,
  weeks: BeyondHellosSubscriptionWeeks
): number | string {
  return config.subscriptionPrices[getBeyondHellosSubscriptionPlan(weeks).key];
}

export function getBeyondHellosSubscriptionPriceNumeric(
  config: BeyondHellosConfig,
  weeks: BeyondHellosSubscriptionWeeks
): number | undefined {
  return parseNumericTicketPrice(getBeyondHellosSubscriptionPriceRaw(config, weeks));
}

export function isBeyondHellosSubscriptionPlanListed(
  config: BeyondHellosConfig,
  weeks: BeyondHellosSubscriptionWeeks
): boolean {
  return isTicketPriceListed(getBeyondHellosSubscriptionPriceRaw(config, weeks));
}

export function isBeyondHellosSubscriptionPlanPayable(
  config: BeyondHellosConfig,
  weeks: BeyondHellosSubscriptionWeeks
): boolean {
  const raw = getBeyondHellosSubscriptionPriceRaw(config, weeks);
  return isTicketPricePayableOnline(raw) && !isTicketSoldOut(raw);
}

export function hasAnyBeyondHellosSubscriptionPlanListed(config: BeyondHellosConfig): boolean {
  return BEYOND_HELLOS_SUBSCRIPTION_PLANS.some((plan) =>
    isBeyondHellosSubscriptionPlanListed(config, plan.weeks)
  );
}

export function isBeyondHellosSubscriptionFullySoldOut(config: BeyondHellosConfig): boolean {
  const listed: boolean[] = [];
  const soldOut: boolean[] = [];
  BEYOND_HELLOS_SUBSCRIPTION_PLANS.forEach((plan) => {
    const raw = getBeyondHellosSubscriptionPriceRaw(config, plan.weeks);
    if (isTicketPriceListed(raw)) {
      listed.push(true);
      soldOut.push(isTicketSoldOut(raw));
    }
  });
  return listed.length > 0 && soldOut.length === listed.length && soldOut.every(Boolean);
}

/** Price the public card and booking button should use. */
export function hasBookableBeyondHellosPrice(config: BeyondHellosConfig): boolean {
  if (config.subscriptionEnabled) return hasAnyBeyondHellosSubscriptionPlanListed(config);
  return hasAnyBeyondHellosTicketListed(config);
}

export function isBeyondHellosBookingSoldOut(config: BeyondHellosConfig): boolean {
  if (config.subscriptionEnabled) return isBeyondHellosSubscriptionFullySoldOut(config);
  return isBeyondHellosFullySoldOut(config);
}

export function isBeyondHellosFullySoldOut(config: BeyondHellosConfig): boolean {
  const listed: boolean[] = [];
  const soldOut: boolean[] = [];
  (['male', 'female'] as const).forEach((type) => {
    const raw = getBeyondHellosTicketPriceRaw(config, type);
    if (isTicketPriceListed(raw)) {
      listed.push(true);
      soldOut.push(isTicketSoldOut(raw));
    }
  });
  return listed.length > 0 && soldOut.length === listed.length && soldOut.every(Boolean);
}

export function parseBeyondHellosConfig(data: Record<string, unknown> | undefined): BeyondHellosConfig {
  if (!data) {
    return {
      ...DEFAULT_BEYOND_HELLOS_CONFIG,
      price: { ...DEFAULT_BEYOND_HELLOS_CONFIG.price },
      subscriptionPrices: { ...EMPTY_BEYOND_HELLOS_SUBSCRIPTION_PRICES },
    };
  }

  const highlights = Array.isArray(data.highlights)
    ? data.highlights.filter((h): h is string => typeof h === 'string' && h.trim().length > 0)
    : DEFAULT_BEYOND_HELLOS_CONFIG.highlights;

  const legacySingle = data.price;
  const legacyFallback =
    typeof legacySingle === 'number' || typeof legacySingle === 'string'
      ? legacySingle
      : DEFAULT_BEYOND_HELLOS_CONFIG.price.male;

  const priceObj =
    data.price && typeof data.price === 'object' && !Array.isArray(data.price)
      ? (data.price as Record<string, unknown>)
      : null;

  const male = parseStoredPrice(
    data.priceMale ?? priceObj?.male,
    legacyFallback
  );
  const female = parseStoredPrice(
    data.priceFemale ?? priceObj?.female,
    legacyFallback
  );

  const subscriptionObj =
    data.subscriptionPrices &&
    typeof data.subscriptionPrices === 'object' &&
    !Array.isArray(data.subscriptionPrices)
      ? (data.subscriptionPrices as Record<string, unknown>)
      : null;

  const subscriptionPrices: BeyondHellosSubscriptionPrices = {
    week1: parseStoredPrice(data.subscriptionPriceWeek1 ?? subscriptionObj?.week1, ''),
    week2: parseStoredPrice(data.subscriptionPriceWeek2 ?? subscriptionObj?.week2, ''),
    week4: parseStoredPrice(data.subscriptionPriceWeek4 ?? subscriptionObj?.week4, ''),
  };

  const difficulty = data.difficulty;
  const validDifficulty =
    difficulty === 'Easy' || difficulty === 'Moderate' || difficulty === 'Challenging'
      ? difficulty
      : DEFAULT_BEYOND_HELLOS_CONFIG.difficulty;

  return {
    title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : DEFAULT_BEYOND_HELLOS_CONFIG.title,
    description:
      typeof data.description === 'string' && data.description.trim()
        ? data.description.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.description,
    category:
      typeof data.category === 'string' && data.category.trim()
        ? data.category.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.category,
    difficulty: validDifficulty,
    duration:
      typeof data.duration === 'string' && data.duration.trim()
        ? data.duration.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.duration,
    scheduleNote:
      typeof data.scheduleNote === 'string' && data.scheduleNote.trim()
        ? data.scheduleNote.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.scheduleNote,
    locationLabel:
      typeof data.locationLabel === 'string' && data.locationLabel.trim()
        ? data.locationLabel.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.locationLabel,
    groupLabel:
      typeof data.groupLabel === 'string' && data.groupLabel.trim()
        ? data.groupLabel.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.groupLabel,
    image: typeof data.image === 'string' ? data.image.trim() : '',
    highlights: highlights.length > 0 ? highlights : DEFAULT_BEYOND_HELLOS_CONFIG.highlights,
    price: { male, female },
    subscriptionEnabled: data.subscriptionEnabled === true,
    subscriptionPrices,
    currency:
      typeof data.currency === 'string' && data.currency.trim()
        ? data.currency.trim().toUpperCase()
        : DEFAULT_BEYOND_HELLOS_CONFIG.currency,
    countryCode:
      typeof data.countryCode === 'string' && data.countryCode.trim()
        ? data.countryCode.trim()
        : DEFAULT_BEYOND_HELLOS_CONFIG.countryCode,
    enabled: data.enabled !== false,
    featured: data.featured !== false,
  };
}
