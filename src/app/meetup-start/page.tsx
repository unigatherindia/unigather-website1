import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';

/** Female → hidden free one-on-one campaign form. */
export default function MeetupStartPage() {
  return <MeetupGenderEntryPage femaleRedirect="/free-one-on-one-meetup" />;
}
