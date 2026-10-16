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

export type BeyondHellosTicketType = 'male' | 'female';

export type BeyondHellosPriceMap = {
  male: number | string;
  female: number | string;
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
