import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';
import { ONE_ON_ONE_FEMALE_FAQ_PATH } from '@/constants/one-on-one-meetup-faq';

/** Both gender choices open a WhatsApp chat; stats show hardcoded monthly meetups. */
export default function MeetupStartPage() {
  return (
    <MeetupGenderEntryPage
      femaleRedirect="/free-one-on-one-meetup"
      femaleFaqPath={ONE_ON_ONE_FEMALE_FAQ_PATH}
      trackOneOnOneFunnel
      femaleWhatsappRedirect={{
        number: '9779284637',
        message: 'Hi Unigather! Can I get more information about your 1-on-1 Meetup? \u2728',
      }}
      maleWhatsappRedirect={{
        number: '9779284637',
        message:
          "Hey! I'd love to know more about your 1-on-1 Meetup. Please share the details. \uD83E\uDD17",
      }}
      showCountryStats
    />
  );
}
