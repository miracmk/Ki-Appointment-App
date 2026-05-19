export const SUPPORTED_LOCALES = ['en', 'tr', 'es', 'fr', 'it', 'ru', 'zh', 'pt'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  tr: 'Türkçe',
  es: 'Español',
  fr: 'Français',
  it: 'Italiano',
  ru: 'Русский',
  zh: '中文',
  pt: 'Português',
};

export function isSupportedLocale(locale: string): locale is Locale {
  return SUPPORTED_LOCALES.includes(locale as Locale);
}
