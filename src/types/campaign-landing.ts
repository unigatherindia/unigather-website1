import { GENDER_PREFERENCE_OPTIONS } from '@/constants/meetup-options';

export type CampaignLandingSlug = 'strangers-group' | 'free-one-on-one';

export type CampaignFormField =
  | 'name'
  | 'mobile'
  | 'email'
  | 'city'
  | 'instagram'
  | 'age'
  | 'contactInfo'
  | 'genderPreference'
  | 'hobbies';

export type CampaignLandingMeta = {
  slug: CampaignLandingSlug;
  path: string;
  adminTitle: string;
  submitLabel: string;
  leadsCollection: string;
  configCollection: string;
  configDocId: string;
  formFields: CampaignFormField[];
};

export type CampaignCityOption = {
  id: string;
  name: string;
  instaGroupLink: string;
};

export const UNIGATHER_INSTAGRAM_URL = 'https://www.instagram.com/unigather.in/';

export type CampaignLandingConfig = {
  promoText: string;
  formIntro: string;
  urgencyText: string;
  queryPhone: string;
  complaintPhone: string;
  pageEnabled: boolean;
  /** Strangers group meetup: cities in the enrollment dropdown */
  cities: CampaignCityOption[];
  /** Shown on enrollment success popup (WhatsApp enquiries) */
  enrollmentWhatsapp: string;
  /** Shown on enrollment success popup */
  unigatherInstagramUrl: string;
  /** Free 1 on 1: message after successful form submit */
  enrollmentSuccessMessage: string;
};

const DEFAULT_STRANGERS_GROUP_CITY_NAMES = [
  'Bhopal',
  'Dehradun',
  'Bangalore',
  'Jammu',
  'Udaipur',
  'Kolkata',
  'Agra',
  'Goa',
  'Amritsar',
  'Hyderabad',
  'Lucknow',
  'Pune',
  'Ahmedabad',
  'Surat',
  'Mumbai',
  'Indore',
  'Nagpur',
  'Chennai',
  'Jalandhar',
  'Ludhiana',
  'Chandigarh',
];

function slugifyCityId(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function buildDefaultStrangersGroupCities(): CampaignCityOption[] {
  return DEFAULT_STRANGERS_GROUP_CITY_NAMES.map((name) => ({
    id: slugifyCityId(name) || `city-${name}`,
    name,
    instaGroupLink: '',
  }));
}

/** Parses Firestore `cities` — empty array means no cities (never fall back to hidden defaults). */
export function parseCitiesList(data: unknown): CampaignCityOption[] {
  if (!Array.isArray(data)) return [];
  const cities: CampaignCityOption[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const name = typeof row.name === 'string' ? row.name.trim() : '';
    if (!name) continue;
    const id =
      typeof row.id === 'string' && row.id.trim()
        ? row.id.trim()
        : slugifyCityId(name) || `city-${Date.now()}`;
    cities.push({
      id,
      name,
      instaGroupLink: typeof row.instaGroupLink === 'string' ? row.instaGroupLink.trim() : '',
    });
  }
  return cities;
}

export const CAMPAIGN_LANDING_META: Record<CampaignLandingSlug, CampaignLandingMeta> = {
  'strangers-group': {
    slug: 'strangers-group',
    path: '/strangers-group-meetup',
    adminTitle: 'Strangers Group Meetup (campaign form)',
    submitLabel: 'Submit enrollment',
    leadsCollection: 'strangersGroupMeetupLeads',
    configCollection: 'strangersGroupMeetupCampaign',
    configDocId: 'default',
    formFields: ['name', 'mobile', 'email', 'city', 'instagram'],
  },
  'free-one-on-one': {
    slug: 'free-one-on-one',
    path: '/free-one-on-one-meetup',
    adminTitle: 'Free 1 on 1 Meetup (campaign form)',
    submitLabel: 'Submit',
    leadsCollection: 'freeOneOnOneMeetupLeads',
    configCollection: 'freeOneOnOneMeetupCampaign',
    configDocId: 'default',
    formFields: ['name', 'age', 'contactInfo', 'genderPreference', 'hobbies', 'city', 'instagram'],
  },
};

const DEFAULT_STRANGERS_GROUP_PROMO = `⚠️ LIMITED TIME OFFER ⚠️

🎉✨ 11TH OCTOBER — 21 CITIES! ✨🎉

🎁 You've Got a FREE Voucher! 🎁

Bhopal • Dehradun • Bangalore • Jammu • Udaipur • Kolkata • Agra • Goa • Amritsar • Hyderabad • Lucknow • Pune • Ahmedabad • Surat • Mumbai • Indore • Nagpur • Chennai • Jalandhar • Ludhiana • Chandigarh

Join UNIGATHER's Strangers Group Meetup!

🗓 Date: Sunday, 11th October
🕔 Time: 5 PM
📍 Venue: We'll update you soon after you book!

Enjoy:

✨ Fun Games
✨ Captivating Story Sessions
✨ Strangers Meet-Up
✨ Crowd Work
✨ Fun Dares

Don't miss out! Join the fun, make new friends, and create unforgettable memories! 🎆🥳

See you there! 🎉✨`;

const DEFAULT_FREE_ONE_ON_ONE_PROMO = `ITS FREE OF COST MEETUP!!

Welcome to Unigather's "One on One meetup!"

Join our unique meetup in your city, where you, a stranger (matching your gender preference), and a friendly Unigather host connect in a cozy café, one week after booking—between 4pm and 5pm. Your privacy and safety are fully protected, with all profiles verified. The host ensures a relaxed, enjoyable time.

please fill this form after filling this our team will contact you within 1 week.

Want to join? Fill out the form below :`;

export const DEFAULT_CAMPAIGN_LANDING_CONFIG: Record<CampaignLandingSlug, CampaignLandingConfig> = {
  'strangers-group': {
    promoText: DEFAULT_STRANGERS_GROUP_PROMO,
    formIntro: 'To enroll, please fill the information below:',
    urgencyText: '',
    queryPhone: '7568861945',
    complaintPhone: '7901751593',
    pageEnabled: true,
    cities: [],
    enrollmentWhatsapp: '7901751593',
    unigatherInstagramUrl: UNIGATHER_INSTAGRAM_URL,
    enrollmentSuccessMessage: '',
  },
  'free-one-on-one': {
    promoText: DEFAULT_FREE_ONE_ON_ONE_PROMO,
    formIntro: '',
    urgencyText: '',
    queryPhone: '7568861945',
    complaintPhone: '7901751593',
    pageEnabled: true,
    cities: [],
    enrollmentWhatsapp: '',
    unigatherInstagramUrl: UNIGATHER_INSTAGRAM_URL,
    enrollmentSuccessMessage:
      'Thank you for your enrollment! Our team will contact you shortly.',
  },
};

export function parseCampaignLandingConfig(
  slug: CampaignLandingSlug,
  data: Record<string, unknown> | undefined
): CampaignLandingConfig {
  const defaults = DEFAULT_CAMPAIGN_LANDING_CONFIG[slug];
  if (!data) return defaults;

  return {
    promoText:
      typeof data.promoText === 'string' && data.promoText.trim()
        ? data.promoText
        : defaults.promoText,
    formIntro: typeof data.formIntro === 'string' ? data.formIntro : defaults.formIntro,
    urgencyText:
      slug === 'strangers-group'
        ? ''
        : typeof data.urgencyText === 'string'
          ? data.urgencyText
          : defaults.urgencyText,
    queryPhone:
      typeof data.queryPhone === 'string' && data.queryPhone.trim()
        ? data.queryPhone
        : defaults.queryPhone,
    complaintPhone:
      typeof data.complaintPhone === 'string' && data.complaintPhone.trim()
        ? data.complaintPhone
        : defaults.complaintPhone,
    pageEnabled: data.pageEnabled !== false,
    cities:
      slug === 'strangers-group'
        ? Array.isArray(data.cities)
          ? parseCitiesList(data.cities)
          : []
        : [],
    enrollmentWhatsapp:
      typeof data.enrollmentWhatsapp === 'string'
        ? data.enrollmentWhatsapp
        : defaults.enrollmentWhatsapp,
    unigatherInstagramUrl:
      typeof data.unigatherInstagramUrl === 'string' && data.unigatherInstagramUrl.trim()
        ? data.unigatherInstagramUrl.trim()
        : defaults.unigatherInstagramUrl,
    enrollmentSuccessMessage:
      typeof data.enrollmentSuccessMessage === 'string' && data.enrollmentSuccessMessage.trim()
        ? data.enrollmentSuccessMessage.trim()
        : defaults.enrollmentSuccessMessage,
  };
}

export function findCampaignCity(
  cities: CampaignCityOption[],
  cityIdOrName: string
): CampaignCityOption | undefined {
  const key = cityIdOrName.trim();
  if (!key) return undefined;
  return (
    cities.find((c) => c.id === key) ??
    cities.find((c) => c.name.toLowerCase() === key.toLowerCase())
  );
}

export const CAMPAIGN_FIELD_LABELS: Record<CampaignFormField, string> = {
  name: 'Name',
  mobile: 'Mobile Number',
  email: 'Email',
  city: 'City',
  instagram: 'Instagram',
  age: 'Age',
  contactInfo: 'Contact info',
  genderPreference: 'Gender preference',
  hobbies: 'Hobbies',
};

export function labelForCampaignGenderPreference(value: string) {
  return GENDER_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
