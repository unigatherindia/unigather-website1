import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Welcome | Unigather',
  robots: { index: false, follow: false },
};

export default function MeetupStartStrangersLayout({ children }: { children: React.ReactNode }) {
  return children;
}
