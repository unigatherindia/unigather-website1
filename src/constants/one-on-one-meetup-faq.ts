export const ONE_ON_ONE_FEMALE_FAQ_PATH = '/meetup-start/female-faq';
export const ONE_ON_ONE_MEETUP_FORM_PATH = '/free-one-on-one-meetup';

export type MeetupFaqItem = {
  id: string;
  question: string;
  answer: string;
  highlighted?: boolean;
};

export const ONE_ON_ONE_MEETUP_FAQ_ITEMS: MeetupFaqItem[] = [
  {
    id: 'what-is',
    question: 'What exactly is a Unigather One-on-One Meetup?',
    answer:
      'Unigather matches you with a stranger based on your preferences and interests for a fun, relaxed one-on-one conversation at a café. A Unigather host will also be present to assist you.',
  },
  {
    id: 'free',
    question: 'Is the meetup completely free?',
    answer:
      'Yes! The Unigather One-on-One Meetup is completely free of cost. There are no registration or participation charges.',
    highlighted: true,
  },
  {
    id: 'who-meet',
    question: 'Who will I be meeting?',
    answer:
      'You’ll be matched with another participant based on your preferred gender and shared interests, wherever possible.',
  },
  {
    id: 'safety',
    question: 'Is it safe to meet a stranger?',
    answer:
      'Your comfort and safety are our priority. Participant details are verified before confirmation, and a Unigather host will be present at the venue during the meetup.',
    highlighted: true,
  },
  {
    id: 'alone',
    question: 'Will I be meeting the person alone?',
    answer:
      'You’ll enjoy a one-on-one conversation with your matched participant. A Unigather host will also be present at the venue to assist whenever needed.',
  },
  {
    id: 'daytime',
    question: 'Will the meetup take place during the daytime or at night?',
    answer:
      'All our One-on-One Meetups are organised during daytime hours, generally between 4 PM and 5 PM. We want you to enjoy a comfortable and relaxed experience.',
    highlighted: true,
  },
  {
    id: 'choose-cafe',
    question: 'Can I choose the café for my meetup?',
    answer:
      'Absolutely! Female participants have the freedom to choose their preferred café for the meetup. Your comfort and convenience come first.',
    highlighted: true,
  },
  {
    id: 'where',
    question: 'Where will the meetup take place?',
    answer:
      'The meetup will take place at a café in your city during daytime hours. Female participants can choose their preferred café, and the final venue will be coordinated with our team.',
  },
  {
    id: 'choose-match',
    question: 'Can I choose whom I want to meet?',
    answer:
      'You can share your gender preference, hobbies and interests during registration. Our team will use these details to find a suitable match.',
  },
  {
    id: 'after-register',
    question: 'What happens after I register?',
    answer:
      'Once you submit the registration form, our team reviews your details, works on finding a suitable match and contacts you with further confirmation and meetup details.',
  },
  {
    id: 'uncomfortable',
    question: 'What if I feel uncomfortable during the meetup?',
    answer:
      'Your comfort comes first. You can inform the Unigather host at any time if you feel uncomfortable or wish to end the meetup.',
  },
  {
    id: 'privacy',
    question: 'Will my personal information be shared?',
    answer:
      'Your registration information is used for meetup coordination and matching purposes. We respect your privacy and handle your information according to our Privacy Policy.',
  },
];