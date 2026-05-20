type HeroProps = {
  locale?: string;
};

export function Hero({ locale = 'en' }: HeroProps) {
  const localeHref = (path: string) => (path === '/' ? `/${locale}` : `/${locale}${path}`);

  return (
    <section className="relative overflow-hidden bg-[#0A0B0F] pt-32 pb-24">
      {/* Aurora blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[#0047FF]/20 blur-[120px]" />
      <div className="pointer-events-none absolute top-0 right-0 h-[500px] w-[500px] rounded-full bg-[#B000FF]/15 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[#00F0FF]/10 blur-[100px]" />

      {/* Grid pattern overlay */}
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-[0.03]" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#00F0FF]/20 bg-[#00F0FF]/5 px-4 py-1.5 text-sm font-medium text-[#00F0FF]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00F0FF] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#00F0FF]" />
            </span>
            KYC Doğrulamalı Danışman Ağı
          </div>

          {/* Heading */}
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Uzman Danışmanlara{' '}
            <span className="gradient-text">
              Anında Erişin
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-white/60 sm:text-xl">
            Muhasebe, hukuk, göç, yatırım ve daha fazlası için doğrulanmış uzmanlarla bağlanın.
            Güvenli ödeme, takvim entegrasyonu ve Google Meet ile profesyonel danışmanlık.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={localeHref('/marketplace')}
              className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-8 py-4 text-base font-semibold text-white shadow-[0_0_40px_rgba(0,71,255,0.4)] transition hover:opacity-90 hover:shadow-[0_0_60px_rgba(0,71,255,0.6)]"
            >
              Danışman Bul
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href={localeHref('/#how-it-works')}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 backdrop-blur-sm transition hover:border-white/20 hover:bg-white/10 hover:text-white"
            >
              Nasıl Çalışır?
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-white/40">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              KYC Doğrulanmış
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Güvenli Escrow Ödeme
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" />
              </svg>
              Google Meet Entegrasyonu
            </div>
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
              </svg>
              6 Uzman Kategorisi
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
