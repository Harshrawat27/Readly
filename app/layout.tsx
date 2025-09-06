import type { Metadata } from 'next';
import { Geist, Geist_Mono, DM_Sans, Archivo_Black } from 'next/font/google';
import './globals.css';
import { Analytics } from '@vercel/analytics/next';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
});

const archivoBlack = Archivo_Black({
  variable: '--font-archivo-black',
  subsets: ['latin'],
  weight: ['400'],
});

export const metadata: Metadata = {
  title: 'ReaditEasy - The Modern Way to Read',
  description:
    'Make your reading fast and easy with ReaditEasy. Convert your PDFs to audio with AI-powered text-to-speech technology. Multilingual support, customizable voices, and clear, accurate readings.',
  keywords:
    'PDF to audio, text to speech, AI reading, multilingual TTS, document reader, accessibility',
  authors: [{ name: 'ReaditEasy' }],
  openGraph: {
    title: 'ReaditEasy - The Modern Way to Read',
    description:
      'Convert your PDFs to audio with AI-powered text-to-speech technology. Multilingual support, customizable voices, and clear, accurate readings.',
    url: 'https://readiteasy.co',
    siteName: 'ReaditEasy',
    images: [
      {
        url: '/open-graph.png',
        width: 1200,
        height: 630,
        alt: 'ReaditEasy - The Modern Way to Read',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ReaditEasy - The Modern Way to Read',
    description:
      'Convert your PDFs to audio with AI-powered text-to-speech technology. Multilingual support and customizable voices.',
    images: ['/open-graph.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'ZlpbLsnM0tNruN7z8TiQFkssPkQjUK93YVhWvO9K9FI', // Replace with your actual verification code
  },
};

if (process.env.NODE_ENV !== 'development') {
  console.log = function () {};
  console.debug = function () {};
  console.info = function () {};
  console.warn = function () {};
  console.error = function () {};
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en'>
      <head>
        <link
          href='https://fonts.googleapis.com/css2?family=Archivo+Black&display=swap'
          rel='stylesheet'
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} ${archivoBlack.variable} antialiased`}
      >
        {children}
        <Analytics />
      </body>
    </html>
  );
}
