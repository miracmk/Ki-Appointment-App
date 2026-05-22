import Link from 'next/link';

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[var(--surface)] pt-32 pb-24">
      {/* Ki teal glow blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-ki-primary/25 blur-[120px]" />
      <div className="pointer-events-none absolute top-10 right-0 h-[500px] w-[500px] rounded-full bg-ki-accent/20 blur-[100px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-ki-secondary/10 blur-[100px]" />

      {/* Grid pattern overlay */}
      <div className="hero-grid pointer-events-none absolute inset-0" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-ki-primary/25 bg-ki-primary/8 px-4 py-1.5 text-sm font-medium text-ki-primary">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ki-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-ki-primary" />
            </span>
            KYC-Verified Consultant Network
          </div>

          {/* Heading */}
          <h1 className="mb-6 text-5xl font-extrabold leading-tight tracking-tight text-[var(--text-primary)] sm:text-6xl lg:text-7xl">
            Instant Access to{' '}
            <span className="gradient-text">Expert Consultants</span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-[var(--text-secondary)] sm:text-xl">
            Connect with verified specialists in accounting, law, immigration, investment, and more.
            Secure escrow payments, calendar integration, and encrypted video calls.
          </p>

          {/* CTAs */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/en/marketplace"
              className="inline-flex items-center gap-2 rounded-2xl bg-ki-gradient px-8 py-4 text-base font-semibold text-white shadow-glow-ki transition-all duration-300 hover:opacity-90 hover:shadow-[0_0_60px_rgba(38,166,154,0.55)]"
            >
              Browse Consultants
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
            <Link
              href="/en/#how-it-works"
              className="btn-ghost inline-flex items-center gap-2 rounded-2xl px-8 py-4 text-base font-semibold"
            >
              How It Works
            </Link>
          </div>

          {/* Trust signals */}
          <div className="mt-14 flex flex-wrap items-center justify-center gap-8 text-sm text-[var(--text-muted)]">
            {[
              {
                label: 'KYC Verified',
                icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
              },
              {
                label: 'Secure Escrow Payment',
                icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
              },
              {
                label: 'Encrypted Video Calls',
                icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.869V15.13a1 1 0 01-1.447.894L15 14M3 8h12a2 2 0 012 2v4a2 2 0 01-2 2H3a2 2 0 01-2-2V10a2 2 0 012-2z" /></svg>,
              },
              {
                label: '6 Expert Categories',
                icon: <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" /></svg>,
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-ki-primary">{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
