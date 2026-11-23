import MeetupGenderEntryPage from '@/components/meetup/MeetupGenderEntryPage';
import { ONE_ON_ONE_FEMALE_FAQ_PATH } from '@/constants/one-on-one-meetup-faq';

/** Both gender choices collect a city, then open WhatsApp with a city-specific message. */
export default function MeetupStartPage() {
  return (
    <MeetupGenderEntryPage
      femaleRedirect="/free-one-on-one-meetup"
      femaleFaqPath={ONE_ON_ONE_FEMALE_FAQ_PATH}
      trackOneOnOneFunnel
      description="Two Strangers, One Meetup, Endless Possibilities. Connect with Someone New, Share Experiences, and Turn a Simple Meeting into a Meaningful Relation ✨"
      collectCityBeforeWhatsapp
      femaleWhatsappRedirect={{
        number: '9779284637',
        message:
          'Hi Unigather ✨! I am from {city} , Can I get more information about your 1-on-1 Meetup?',
      }}
      maleWhatsappRedirect={{
        number: '9779284637',
        message:
          "Hey Unigather 🤗 ! I am from {city} I'd love to know more about your 1-on-1 Meetup. Please share the details.",
      }}
      showCountryStats
    />
  );
}
