import type { Metadata } from 'next';
import CampaignLandingPage from '@/components/campaign/CampaignLandingPage';

export const metadata: Metadata = {
  title: 'Strangers Group Meetup | Unigather',
  robots: { index: false, follow: false },
};

export default function StrangersGroupMeetupCampaignPage() {
  return <CampaignLandingPage slug="strangers-group" />;
}
