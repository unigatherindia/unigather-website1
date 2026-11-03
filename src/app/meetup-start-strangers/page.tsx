import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';

/** Female → hidden strangers group campaign form. */
export default function MeetupStartStrangersPage() {
  return <MeetupGenderEntryPage femaleRedirect="/strangers-group-meetup" />;
}
