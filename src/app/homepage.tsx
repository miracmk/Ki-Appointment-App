import Link from 'next/link';
import { Navbar } from '@/components/navbar';
import { Hero } from '@/components/hero';
import { Footer } from '@/components/footer';
import { CATEGORIES } from '@/lib/categories';

type HomepageProps = {
  locale: string;
};

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Danışman Seçin',
    description: 'KYC doğrulamalı uzmanlar arasından filtreleme yapın. Kategori, dil, fiyat ve puana göre arama yapın.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Randevu Alın',
    description: 'Müsait saatleri görün, randevu oluşturun ve güvenli escrow ödeme ile işlemi tamamlayın.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Google Meet ile Görüşün',
    description: 'Onay sonrası otomatik Google Meet linki oluşturulur. Danışmanınızla güvenle görüşün.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
      </svg>
    ),
  },
];

const MOCK_CONSULTANTS = [
  {
    name: 'Ahmet Yılmaz',
    title: 'Kurumsal Vergi Uzmanı',
    category: 'Muhasebe & Vergi',
    rating: 4.9,
    reviews: 127,
    rate: 150,
    languages: ['Türkçe', 'İngilizce'],
    initials: 'AY',
    gradient: 'from-[#0047FF] to-[#00F0FF]',
  },
  {
    name: 'Sophie Laurent',
    title: 'Göç & Vize Hukuku',
    category: 'Göç & Vize',
    rating: 4.8,
    reviews: 89,
    rate: 200,
    languages: ['İngilizce', 'Fransızca'],
    initials: 'SL',
    gradient: 'from-[#B000FF] to-[#0047FF]',
  },
  {
    name: 'Mehmet Kaya',
    title: 'Yatırım Stratejisti',
    category: 'Finansal & Yatırım',
    rating: 4.7,
    reviews: 64,
    rate: 175,
    languages: ['Türkçe', 'Arapça', 'İngilizce'],
    initials: 'MK',
    gradient: 'from-[#00F0FF] to-[#B000FF]',
  },
];

const TRUST_ITEMS = [
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'KYC Doğrulamalı',
    description: 'Stripe Identity ile doğrulanmış tüm danışmanlar. Sahte profil yok.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Escrow Koruması',
    description: 'Ödemeniz görüşme tamamlanana kadar güvencede tutulur.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Stripe ile Güvenli Ödeme',
    description: 'Tüm ödemeler Stripe üzerinden işlenir. Kredi kartı ve banka transferi desteklenir.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '7/24 Destek',
    description: 'Teknik sorun veya şikayet için destek ekibimiz her zaman yanınızda.',
  },
];

function localeHref(locale: string, path: string) {
  if (path === '/') return `/${locale}`;
  return `/${locale}${path}`;
}

export default function Homepage({ locale }: HomepageProps) {
  return (
    <div className="bg-[#0A0B0F]">
      <Navbar />
      <Hero locale={locale} />

      {/* ── Categories ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Uzman Kategorileri
            </h2>
            <p className="text-white/50">
              İhtiyacınıza uygun kategoriyi seçin, KYC doğrulamalı danışmanlarla bağlanın.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const colorMap: Record<string, string> = {
                cyan: 'border-[#00F0FF]/20 hover:border-[#00F0FF]/40 hover:shadow-[0_0_30px_rgba(0,240,255,0.1)]',
                blue: 'border-[#0047FF]/20 hover:border-[#0047FF]/40 hover:shadow-[0_0_30px_rgba(0,71,255,0.1)]',
                purple: 'border-[#B000FF]/20 hover:border-[#B000FF]/40 hover:shadow-[0_0_30px_rgba(176,0,255,0.1)]',
                pink: 'border-[#FF006E]/20 hover:border-[#FF006E]/40 hover:shadow-[0_0_30px_rgba(255,0,110,0.1)]',
                green: 'border-emerald-500/20 hover:border-emerald-500/40 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]',
                orange: 'border-orange-500/20 hover:border-orange-500/40 hover:shadow-[0_0_30px_rgba(249,115,22,0.1)]',
              };
              const textColorMap: Record<string, string> = {
                cyan: 'text-[#00F0FF]', blue: 'text-[#0047FF]', purple: 'text-[#B000FF]',
                pink: 'text-[#FF006E]', green: 'text-emerald-400', orange: 'text-orange-400',
              };
              return (
                <Link
                  key={cat.id}
                  href={localeHref(locale, `/marketplace/${cat.id}`)}
                  className={`group flex items-start gap-4 rounded-2xl border bg-white/[0.03] p-6 backdrop-blur-sm transition duration-300 ${colorMap[cat.color]}`}
                >
                  <span className="text-3xl">{cat.icon}</span>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-white">{cat.label}</h3>
                    <p className="mt-0.5 text-sm text-white/40">{cat.labelTr}</p>
                    <p className="mt-2 text-sm text-white/50 line-clamp-2">{cat.description}</p>
                    <p className={`mt-3 text-xs font-medium ${textColorMap[cat.color]}`}>
                      Danışman Bul →
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Nasıl Çalışır?
            </h2>
            <p className="text-white/50">Üç adımda profesyonel danışmanlığa ulaşın.</p>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {HOW_IT_WORKS.map((item, i) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] p-8 backdrop-blur-sm"
              >
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 translate-x-1/2 md:block">
                    <svg className="h-5 w-5 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#00F0FF]/20 bg-[#00F0FF]/10 text-[#00F0FF]">
                    {item.icon}
                  </div>
                  <span className="text-4xl font-black text-white/[0.06]">{item.step}</span>
                </div>
                <h3 className="mb-2 text-lg font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Consultants ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 flex items-end justify-between">
            <div>
              <h2 className="mb-2 text-3xl font-bold text-white sm:text-4xl">
                Öne Çıkan Danışmanlar
              </h2>
              <p className="text-white/50">KYC doğrulamalı, yüksek puanlı uzmanlar.</p>
            </div>
            <Link
              href={localeHref(locale, '/marketplace')}
              className="hidden text-sm font-medium text-[#00F0FF] transition hover:opacity-80 sm:block"
            >
              Tümünü Gör →
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {MOCK_CONSULTANTS.map((consultant) => (
              <div key={consultant.name} className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-6">
                <div className={`mb-6 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-gradient-to-br ${consultant.gradient} text-lg font-bold text-white`}>
                  {consultant.initials}
                </div>
                <p className="text-sm uppercase tracking-[0.35em] text-white/40">{consultant.category}</p>
                <h3 className="mt-3 text-xl font-semibold text-white">{consultant.name}</h3>
                <p className="mt-2 text-sm text-white/50">{consultant.title}</p>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/40">
                  {consultant.languages.map((language) => (
                    <span key={language} className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                      {language}
                    </span>
                  ))}
                </div>
                <div className="mt-6 flex items-center justify-between text-sm text-white/60">
                  <span>{consultant.rating} ★</span>
                  <span>{consultant.reviews} yorum</span>
                  <span>{consultant.rate} USD</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust ── */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">Neden Ki Business?</h2>
            <p className="text-white/50">Tüm danışmanları aynı çatı altında kolayca bulun.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {TRUST_ITEMS.map((item) => (
              <div key={item.title} className="rounded-3xl border border-white/[0.08] bg-white/[0.03] p-8">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-3xl bg-white/5 text-[#00F0FF]">
                  {item.icon}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{item.title}</h3>
                <p className="text-sm leading-relaxed text-white/50">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer locale={locale} />
    </div>
  );
}
