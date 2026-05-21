import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './src/lib/i18n';

const PUBLIC_FILE = /\.[^/]+$/;

const LOCALE_AWARE_PATHS = ['/', '/login', '/register', '/terms', '/privacy', '/refund'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/robots.txt') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(/|$)`);
  const match = pathname.match(localePattern);

  if (match) {
    const afterLocale = pathname.slice(match[0].length - (match[2] === '/' ? 1 : 0)) || '/';
    const isLocaleAware = LOCALE_AWARE_PATHS.some(p =>
      afterLocale === p || (p !== '/' && afterLocale.startsWith(p + '/'))
    );
    if (!isLocaleAware) {
      const url = request.nextUrl.clone();
      url.pathname = afterLocale === '' ? '/' : afterLocale;
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isLocaleAware = LOCALE_AWARE_PATHS.some(p =>
    pathname === p || (p !== '/' && pathname.startsWith(p + '/'))
  );

  if (isLocaleAware) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
