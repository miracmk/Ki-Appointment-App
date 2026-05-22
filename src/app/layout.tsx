import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import GoogleServicesScript from '@/components/GoogleServicesScript';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://kibusiness.global'),
  title: {
    default: 'Ki Business Solutions — Management Consulting',
    template: '%s | Ki Business Solutions',
  },
  description: 'Connect with KYC-verified expert consultants in accounting, tax, law, immigration, and finance. Escrow-protected payments and secure video calls.',
  icons: { icon: '/favicon.png' },
  openGraph: {
    siteName: 'Ki Business Solutions',
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

// Prevents FOUC: runs before React hydrates to set the correct theme class
const themeScript = `
(function(){try{
  var t=localStorage.getItem('ki-theme');
  if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)){
    document.documentElement.classList.add('dark');
  }
}catch(e){}})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <GoogleServicesScript />
        {children}
      </body>
    </html>
  );
}
