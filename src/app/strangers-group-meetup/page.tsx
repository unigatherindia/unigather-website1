import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import CampaignLandingPage from '@/components/campaign/CampaignLandingPage';

export const metadata: Metadata = {
  title: 'Strangers Group Meetup | Unigather',
  robots: { index: false, follow: false },
};

type SearchParams = Record<string, string | string[] | undefined>;

export default function StrangersGroupMeetupCampaignPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { register, gender } = searchParams;
  const isGenderFlow =
    register === 'male' || register === 'female' || gender === 'male';

  if (!isGenderFlow) {
    // Direct visits should choose a gender first; keep any tracking params.
    const query = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (typeof value === 'string') query.set(key, value);
      else if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    });
    const suffix = query.toString();
    redirect(suffix ? `/meetup-start-strangers?${suffix}` : '/meetup-start-strangers');
  }

  return <CampaignLandingPage slug="strangers-group" />;
}
