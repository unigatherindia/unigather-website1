import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const STRANGERS_GROUP_LEADS_COLLECTION = 'strangersGroupMeetupLeads';

export type StrangersGroupLeadKind = 'register_name' | 'city_join';

type StrangersGroupLeadInput = {
  kind: StrangersGroupLeadKind;
  name?: string;
  gender?: string;
  cityId?: string;
  cityName?: string;
  cityInstaGroupLink?: string;
  preferredLanguage?: string;
};

/**
 * Saves an entry-funnel event for the strangers group page into the campaign
 * leads collection, so the admin can see it under Campaign Forms → submissions.
 */
export async function saveStrangersGroupLead(
  input: StrangersGroupLeadInput
): Promise<void> {
  if (!db) return;

  try {
    await addDoc(collection(db, STRANGERS_GROUP_LEADS_COLLECTION), {
      campaignSlug: 'strangers-group',
      kind: input.kind,
      status: 'submitted',
      preferredLanguage: input.preferredLanguage ?? 'en',
      createdAt: Timestamp.now(),
      adminEnglish: {},
      ...(input.name ? { name: input.name } : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...(input.cityId ? { cityId: input.cityId } : {}),
      ...(input.cityName ? { city: input.cityName } : {}),
      ...(input.cityInstaGroupLink
        ? { cityInstaGroupLink: input.cityInstaGroupLink }
        : {}),
    });
  } catch (error) {
    console.error('Save strangers group lead failed:', input.kind, error);
  }
}
