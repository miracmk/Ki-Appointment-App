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
    title: 'Find a Consultant',
    description: 'Browse KYC-verified experts. Filter by category, language, price, and rating to find the right match.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    step: '02',
    title: 'Book an Appointment',
    description: 'View available time slots, schedule your session, and complete payment securely via escrow.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    step: '03',
    title: 'Meet via Secure Video Call',
    description: 'After confirmation, a secure video call link is automatically generated. Meet your consultant with confidence.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
      </svg>
    ),
  },
];

const MOCK_CONSULTANTS = [
  {
    name: 'James Mitchell',
    title: 'Corporate Tax Specialist',
    category: 'Accounting & Tax',
    rating: 4.9,
    reviews: 127,
    rate: 150,
    languages: ['English', 'French'],
    initials: 'JM',
    gradient: 'from-[#0047FF] to-[#00F0FF]',
  },
  {
    name: 'Sophie Laurent',
    title: 'Immigration & Visa Law',
    category: 'Immigration & Visa',
    rating: 4.8,
    reviews: 89,
    rate: 200,
    languages: ['English', 'French'],
    initials: 'SL',
    gradient: 'from-[#B000FF] to-[#0047FF]',
  },
  {
    name: 'David Chen',
    title: 'Investment Strategist',
    category: 'Financial & Investment',
    rating: 4.7,
    reviews: 64,
    rate: 175,
    languages: ['English', 'Mandarin'],
    initials: 'DC',
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
    title: 'KYC Verified Experts',
    description: 'All consultants pass identity verification before going live. No fake profiles.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Escrow Protection',
    description: 'Your payment is held securely until the session is completed. Full refund if cancelled.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Secure Payments',
    description: 'All transactions processed via encrypted payment infrastructure. Cards and bank transfers supported.',
  },
  {
    icon: (
      <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: '24/7 Support',
    description: 'Our support team is always available for technical issues or disputes.',
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
      <Hero />

      {/* ── Categories ── */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">
              Expert Categories
            </h2>
            <p className="text-white/50">
              Choose your area of need and connect with KYC-verified specialists.
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
                    <p className="mt-2 text-sm text-white/50 line-clamp-2">{cat.description}</p>
                    <p className={`mt-3 text-xs font-medium ${textColorMap[cat.color]}`}>
                      Browse Consultants →
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
              How It Works
            </h2>
            <p className="text-white/50">Get professional advice in three simple steps.</p>
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
                Featured Consultants
              </h2>
              <p className="text-white/50">KYC-verified experts with top ratings.</p>
            </div>
            <Link
              href={localeHref(locale, '/marketplace')}
              className="hidden text-sm font-medium text-[#00F0FF] transition hover:opacity-80 sm:block"
            >
              View All →
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
                  <span>{consultant.reviews} reviews</span>
                  <span>${consultant.rate}/hr</span>
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
            <h2 className="mb-3 text-3xl font-bold text-white sm:text-4xl">Why Ki Business?</h2>
            <p className="text-white/50">Everything you need for professional consulting, in one place.</p>
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

      {/* ── CTA ── */}
      <section className="pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-[#0047FF]/10 to-[#B000FF]/10 p-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-white sm:text-4xl">
              Ready to get started?
            </h2>
            <p className="mx-auto mb-8 max-w-xl text-white/50">
              Join thousands of clients who connect with verified experts through our platform.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={localeHref(locale, '/marketplace')}
                className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(0,71,255,0.3)] transition hover:opacity-90"
              >
                Find a Consultant
              </Link>
              <Link
                href={localeHref(locale, '/register?type=consultant')}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
              >
                Join as a Consultant
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
