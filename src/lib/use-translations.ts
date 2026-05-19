import { useEffect, useMemo, useState } from 'react';
import { DEFAULT_LOCALE, isSupportedLocale, LOCALE_LABELS, type Locale } from './i18n';
import en from '@/messages/en.json';
import tr from '@/messages/tr.json';
import es from '@/messages/es.json';
import fr from '@/messages/fr.json';
import it from '@/messages/it.json';
import ru from '@/messages/ru.json';
import zh from '@/messages/zh.json';
import pt from '@/messages/pt.json';

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en,
  tr,
  es,
  fr,
  it,
  ru,
  zh,
  pt,
};

function getLocaleFromNavigator(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE;
  }
  const language = navigator.language.toLowerCase();
  const [locale] = language.split('-');
  return isSupportedLocale(locale) ? locale : DEFAULT_LOCALE;
}

export function useTranslations() {
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const detected = getLocaleFromNavigator();
    setLocale(detected);
  }, []);

  return useMemo(() => ({
    locale,
    label: LOCALE_LABELS[locale],
    t: (key: string) => TRANSLATIONS[locale][key] || TRANSLATIONS[DEFAULT_LOCALE][key] || key,
  }), [locale]);
}
