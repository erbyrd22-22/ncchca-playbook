import './globals.css';
import './print.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NCCHCA Conference & Event Playbook',
  description:
    'Operating manual for every event NCCHCA runs — annual conference, virtual workgroups, hybrid learning series.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800&family=Roboto:wght@300;400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
