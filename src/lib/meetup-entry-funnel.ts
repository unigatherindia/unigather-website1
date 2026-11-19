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

/**
 * Records a Male choice on the strangers-group gender entry page.
 * Counter only — the name/city lead is created by the Register popup.
 */
export function trackStrangersGroupMaleClick() {
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
      maleButtonClicks: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch((error) => {
    console.error('strangers group male funnel track failed:', error);
  });
}

/**
 * Records a Male visitor opening the Register popup on the strangers-group
 * campaign page. Separate from the gender-choice click so admin can measure
 * the drop-off between selecting Male and starting registration.
 */
export function trackStrangersGroupMaleRegisterClick() {
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
      maleRegisterClicks: increment(1),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  ).catch((error) => {
    console.error('strangers group male register track failed:', error);
  });
}

export type MeetupFunnelStats = {
  femaleButtonClicks: number;
  maleButtonClicks: number;
  maleRegisterClicks: number;
  fillFormClicks: number;
};

export function parseMeetupFunnelStats(data: Record<string, unknown> | undefined): MeetupFunnelStats {
  return {
    femaleButtonClicks:
      typeof data?.femaleButtonClicks === 'number' ? data.femaleButtonClicks : 0,
    maleButtonClicks:
      typeof data?.maleButtonClicks === 'number' ? data.maleButtonClicks : 0,
    maleRegisterClicks:
      typeof data?.maleRegisterClicks === 'number' ? data.maleRegisterClicks : 0,
    fillFormClicks: typeof data?.fillFormClicks === 'number' ? data.fillFormClicks : 0,
  };
}
