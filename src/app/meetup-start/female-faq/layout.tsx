import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ | One-on-One Meetup | Unigather',
  robots: { index: false, follow: false },
};

export default function OneOnOneFemaleFaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}