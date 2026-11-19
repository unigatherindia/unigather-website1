import { addDoc, collection, doc, Timestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const STRANGERS_GROUP_LEADS_COLLECTION = 'strangersGroupMeetupLeads';

export type StrangersGroupLeadKind = 'register_name' | 'city_join';

type StrangersGroupLeadInput = {
  kind: StrangersGroupLeadKind;
  name?: string;
  gender?: string;
  cityId?: string;
  cityName?: string;
  cityWhatsappNumber?: string;
  preferredLanguage?: string;
};

/**
 * Saves an entry-funnel event for the strangers group page into the campaign
 * leads collection, so the admin can see it under Campaign Forms → submissions.
 * Returns the created document id (or null when the write failed).
 */
export async function saveStrangersGroupLead(
  input: StrangersGroupLeadInput
): Promise<string | null> {
  if (!db) return null;

  const name = input.name?.trim();

  try {
    const ref = await addDoc(collection(db, STRANGERS_GROUP_LEADS_COLLECTION), {
      campaignSlug: 'strangers-group',
      kind: input.kind,
      status: 'submitted',
      preferredLanguage: input.preferredLanguage ?? 'en',
      createdAt: Timestamp.now(),
      adminEnglish: {},
      ...(name ? { name } : {}),
      ...(input.gender ? { gender: input.gender } : {}),
      ...(input.cityId ? { cityId: input.cityId } : {}),
      ...(input.cityName ? { city: input.cityName } : {}),
      ...(input.cityWhatsappNumber
        ? { cityWhatsappNumber: input.cityWhatsappNumber }
        : {}),
    });
    return ref.id;
  } catch (error) {
    console.error('Save strangers group lead failed:', input.kind, error);
    return null;
  }
}

type CityJoinDetails = {
  cityId: string;
  cityName: string;
  cityWhatsappNumber?: string;
};

/**
 * Adds the chosen city to the registration lead created when the female
 * entered her name, so the register submission keeps the name and the city
 * in one place.
 */
export async function addCityToStrangersGroupRegisterLead(
  leadId: string,
  city: CityJoinDetails
): Promise<void> {
  if (!db || !leadId) return;

  try {
    await updateDoc(doc(db, STRANGERS_GROUP_LEADS_COLLECTION, leadId), {
      cityId: city.cityId,
      city: city.cityName,
      ...(city.cityWhatsappNumber
        ? { cityWhatsappNumber: city.cityWhatsappNumber }
        : {}),
      cityJoinedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Update register lead with city failed:', error);
  }
}
