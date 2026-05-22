import { NextRequest, NextResponse } from 'next/server';

const SUPPORTED_LOCALES = ['en', 'tr', 'es', 'fr', 'it', 'ru', 'zh', 'pt'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Redirect old locale-prefixed URLs to the canonical path
  // e.g. /en/marketplace → /marketplace, /tr → /
  const localePattern = new RegExp(`^/(${SUPPORTED_LOCALES.join('|')})(\/|$)`);
  const match = pathname.match(localePattern);
  if (match) {
    const afterLocale = pathname.slice(match[1].length + 1) || '/';
    const url = request.nextUrl.clone();
    url.pathname = afterLocale.startsWith('/') ? afterLocale : '/' + afterLocale;
    return NextResponse.redirect(url, { status: 308 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|api|favicon|robots.txt|sitemap.xml|llms.txt|.*\\.(?:png|ico|svg|jpg|jpeg|webp|css|js|woff2?|ttf)).*)'],
};
