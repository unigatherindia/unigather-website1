import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';

export default function MeetupStartStrangersPage() {
  return (
    <MeetupGenderEntryPage
      femaleRedirect="/strangers-group-meetup"
      maleRedirect="/strangers-group-meetup?gender=male"
      showEntryStats
    />
  );
}
