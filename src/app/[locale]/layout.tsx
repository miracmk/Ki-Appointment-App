import { NextIntlProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { SUPPORTED_LOCALES, type Locale } from '@/lib/i18n';

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: { locale: string };
};

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

async function loadMessages(locale: Locale) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch (error) {
    return null;
  }
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const locale = params.locale as Locale;
  if (!SUPPORTED_LOCALES.includes(locale)) {
    return notFound();
  }

  const messages = await loadMessages(locale);
  if (!messages) {
    return notFound();
  }

  return (
    <NextIntlProvider locale={locale} messages={messages}>
      {children}
    </NextIntlProvider>
  );
}
