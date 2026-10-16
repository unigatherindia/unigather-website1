export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'non_binary', label: 'Non-binary' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
] as const;

export const GENDER_PREFERENCE_OPTIONS = [
  { value: 'male', label: 'Men' },
  { value: 'female', label: 'Women' },
  { value: 'any', label: 'Anyone' },
] as const;

export type GenderValue = (typeof GENDER_OPTIONS)[number]['value'];
export type GenderPreferenceValue = (typeof GENDER_PREFERENCE_OPTIONS)[number]['value'];

export const ONE_ON_ONE_MEETUP_COLLECTION = 'oneOnOneMeetupLeads';
