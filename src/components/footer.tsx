import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';

type FooterProps = {
  locale?: string;
};

function localeHref(locale: string | undefined, path: string) {
  if (!locale) {
    return path;
  }

  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}

export function Footer({ locale }: FooterProps) {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0A0B0F]">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href={localeHref(locale, '/')}>
              <img
                src="/logo.png"
                alt="Ki Business Solutions"
                className="h-8 w-auto"
              />
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-white/40">
              KYC doğrulamalı uzman danışmanlarla bağlanın. Güvenli escrow ödeme, takvim
              entegrasyonu ve Google Meet ile profesyonel danışmanlık hizmetleri.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition hover:border-[#00F0FF]/30 hover:text-[#00F0FF]"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Twitter / X"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40 transition hover:border-[#00F0FF]/30 hover:text-[#00F0FF]"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Categories */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Kategoriler
            </h3>
            <ul className="space-y-2.5">
              {CATEGORIES.map((cat) => (
                <li key={cat.id}>
                  <Link
                    href={localeHref(locale, `/marketplace/${cat.id}`)}
                    className="flex items-center gap-2 text-sm text-white/40 transition hover:text-white"
                  >
                    <span className="text-base">{cat.icon}</span>
                    {cat.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              Platform
            </h3>
            <ul className="space-y-2.5 text-sm text-white/40">
              <li><Link href={localeHref(locale, '/marketplace')} className="transition hover:text-white">Danışmanlar</Link></li>
              <li><Link href={localeHref(locale, '/#how-it-works')} className="transition hover:text-white">Nasıl Çalışır</Link></li>
              <li><Link href={localeHref(locale, '/dashboard')} className="transition hover:text-white">Müşteri Paneli</Link></li>
              <li><Link href={localeHref(locale, '/consultant')} className="transition hover:text-white">Danışman Paneli</Link></li>
              <li><Link href={localeHref(locale, '/login')} className="transition hover:text-white">Giriş Yap</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/50">
              İletişim
            </h3>
            <ul className="space-y-2.5 text-sm text-white/40">
              <li className="flex items-center gap-2">
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                info@kibusiness.co
              </li>
              <li className="flex items-start gap-2">
                <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                5013 S Louise Ave #1111,<br />Sioux Falls, SD 57108
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-sm text-white/30">
            © 2026 Ki Business Solutions. Tüm hakları saklıdır.
          </p>
          <div className="flex gap-6 text-sm text-white/30">
            <Link href={localeHref(locale, '/terms')} className="transition hover:text-white">Kullanım Koşulları</Link>
            <Link href={localeHref(locale, '/privacy')} className="transition hover:text-white">Gizlilik Politikası</Link>
            <Link href={localeHref(locale, '/refund')} className="transition hover:text-white">İade Politikası</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
