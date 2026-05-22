import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { DEFAULT_LOCALE } from '@/lib/i18n';
import enMessages from '@/messages/en.json';
import GoogleServicesScript from '@/components/GoogleServicesScript';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Ki Business Solutions - Management Consulting',
  description: 'Professional business management consulting services helping companies achieve operational excellence, financial health, and sustainable growth.',
  icons: {
    icon: '/favicon.png',
  },
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
        <NextIntlClientProvider locale={DEFAULT_LOCALE} messages={enMessages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
