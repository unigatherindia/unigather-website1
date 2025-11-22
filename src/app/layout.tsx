import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Unigather - Gathering Minds, Uniting Hearts',
  description: 'Join Unigather events and turn strangers into lifelong friends. Experience the joy of meeting new people through fun and engaging activities.',
  keywords: ['social events', 'networking', 'friendship', 'community', 'strangers', 'meetup'],
  authors: [{ name: 'Unigather Team' }],
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/favicon.png',
    shortcut: '/favicon.png',
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
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#f97316" />
      </head>
      <body className={`${inter.className} bg-dark-900 text-white antialiased`}>
        <AuthProvider>
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
        </AuthProvider>
      </body>
    </html>
  );
}

