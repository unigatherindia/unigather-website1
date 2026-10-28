import type { Metadata } from 'next';
import CampaignLandingPage from '@/components/campaign/CampaignLandingPage';

export const metadata: Metadata = {
  title: 'Free 1 on 1 Meetup | Unigather',
  robots: { index: false, follow: false },
};

export default function FreeOneOnOneMeetupCampaignPage() {
  return <CampaignLandingPage slug="free-one-on-one" />;
}
