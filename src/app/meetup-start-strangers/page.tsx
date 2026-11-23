import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';

/** Both gender choices open the group city picker here, so closing it stays on this page. */
export default function MeetupStartStrangersPage() {
  return (
    <MeetupGenderEntryPage
      femaleRedirect="/strangers-group-meetup?register=female"
      maleRedirect="/strangers-group-meetup?register=male"
      showEntryStats
      showCountryStats
      groupCityPicker
    />
  );
}
