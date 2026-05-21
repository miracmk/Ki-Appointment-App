import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './src/lib/i18n';

const PUBLIC_FILE = /\.[^/]+$/;

// Sadece bu route'lar [locale] klasörü altında var
const LOCALE_AWARE_ROUTES = ['/', '/login', '/register', '/terms', '/privacy', '/refund'];

function needsLocalePrefix(pathname: string): boolean {
  for (const route of LOCALE_AWARE_ROUTES) {
    if (pathname === route) return true;
    if (route !== '/' && pathname.startsWith(route + '/')) return true;
  }
  return false;
}

function stripLocalePrefix(pathname: string): string {
  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(/.*)$`);
  const match = pathname.match(localePattern);
  return match ? match[2] : pathname;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static dosyalar ve API'ler — dokunma
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Locale prefix var mı kontrol et
  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?:/|$)`);
  const hasLocalePrefix = localePattern.test(pathname);

  if (hasLocalePrefix) {
    // Locale prefix var — ama bu route locale-aware mi?
    const withoutLocale = stripLocalePrefix(pathname);
    const isLocaleAware = needsLocalePrefix(withoutLocale) || withoutLocale === '';

    if (!isLocaleAware) {
      // /en/marketplace → /marketplace gibi locale'i at
      const url = request.nextUrl.clone();
      url.pathname = withoutLocale || '/';
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  }

  // Locale prefix yok — bu route locale-aware mi?
  if (needsLocalePrefix(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
