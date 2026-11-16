import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';
import { ONE_ON_ONE_FEMALE_FAQ_PATH } from '@/constants/one-on-one-meetup-faq';

/** Female → FAQ, then hidden free one-on-one form. Male → home. */
export default function MeetupStartPage() {
  return (
    <MeetupGenderEntryPage
      femaleRedirect="/free-one-on-one-meetup"
      femaleFaqPath={ONE_ON_ONE_FEMALE_FAQ_PATH}
      trackOneOnOneFunnel
    />
  );
}
