import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from './src/lib/i18n';

const PUBLIC_FILE = /\.[^/]+$/;

// Only these routes exist under src/app/[locale]/ — everything else passes through
const LOCALE_AWARE_ROUTES = ['/', '/login', '/register', '/terms', '/privacy', '/refund'];

function needsLocalePrefix(pathname: string): boolean {
  for (const route of LOCALE_AWARE_ROUTES) {
    if (pathname === route) return true;
    if (route !== '/' && pathname.startsWith(route + '/')) return true;
  }
  return false;
}

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

  // Already has a locale prefix → pass through
  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(?:/|$)`);
  if (localePattern.test(pathname)) {
    return NextResponse.next();
  }

  // Only add locale prefix to routes that actually have a [locale] version
  if (!needsLocalePrefix(pathname)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: '/:path*',
};
