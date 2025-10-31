import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Unigather - Gathering Minds, Uniting Hearts',
  description: 'Join Unigather events and turn strangers into lifelong friends. Experience the joy of meeting new people through fun and engaging activities.',
  keywords: ['social events', 'networking', 'friendship', 'community', 'strangers', 'meetup'],
  authors: [{ name: 'Unigather Team' }],
  icons: {
    icon: '/favicon.png',
    apple: '/favicon.png',
  },
  openGraph: {
    title: 'Unigather - Gathering Minds, Uniting Hearts',
    description: 'Join Unigather events and turn strangers into lifelong friends.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Unigather',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Unigather - Gathering Minds, Uniting Hearts',
    description: 'Join Unigather events and turn strangers into lifelong friends.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${inter.className} bg-dark-900 text-white antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#27272a',
              color: '#fff',
              border: '1px solid #3f3f46',
            },
            success: {
              iconTheme: {
                primary: '#f97316',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}

