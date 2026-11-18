import { db } from '@/lib/firebase';
import { doc, increment, serverTimestamp, setDoc } from 'firebase/firestore';

export const MEETUP_ENTRY_FUNNEL_COLLECTION = 'meetupEntryFunnel';
export const ONE_ON_ONE_FUNNEL_DOC_ID = 'one-on-one';
export const STRANGERS_GROUP_FUNNEL_DOC_ID = 'strangers-group';

export type MeetupFunnelEvent = 'female_button' | 'fill_form';

const FIELD_BY_EVENT: Record<MeetupFunnelEvent, string> = {
  female_button: 'femaleButtonClicks',
  fill_form: 'fillFormClicks',
};

/** Fire-and-forget funnel counters for hidden meetup entry (client-safe). */
export function trackMeetupFunnelEvent(event: MeetupFunnelEvent) {
  if (!db) return;

  const field = FIELD_BY_EVENT[event];
  const ref = doc(db, MEETUP_ENTRY_FUNNEL_COLLECTION, ONE_ON_ONE_FUNNEL_DOC_ID);

  void setDoc(
    ref,
    {
      funnel: 'one-on-one',
      [field]: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch((error) => {
    console.error('meetup funnel track failed:', event, error);
  });
}

/**
 * Records a Female choice on the strangers-group gender entry page.
 * Stored as a counter only — not as an individual submission.
 */
export function trackStrangersGroupFemaleClick() {
  if (!db) return;

  const ref = doc(
    db,
    MEETUP_ENTRY_FUNNEL_COLLECTION,
    STRANGERS_GROUP_FUNNEL_DOC_ID
  );

  void setDoc(
    ref,
    {
      funnel: 'strangers-group',
      femaleButtonClicks: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch((error) => {
    console.error('strangers group funnel track failed:', error);
  });
}

export type MeetupFunnelStats = {
  femaleButtonClicks: number;
  fillFormClicks: number;
};

export function parseMeetupFunnelStats(data: Record<string, unknown> | undefined): MeetupFunnelStats {
  return {
    femaleButtonClicks:
      typeof data?.femaleButtonClicks === 'number' ? data.femaleButtonClicks : 0,
    fillFormClicks: typeof data?.fillFormClicks === 'number' ? data.fillFormClicks : 0,
  };
}
