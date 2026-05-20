'use client';

import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0A0B0F] flex items-center justify-center px-4">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-red-500 opacity-10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-[#B000FF] opacity-10 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        <div className="mb-6 flex items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
            <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-white">Access Denied</h1>
        <p className="mt-3 text-white/50">
          You don't have permission to access this page. Please contact an administrator if you believe this is an error.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className="rounded-xl bg-gradient-to-r from-[#0047FF] to-[#00F0FF] px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-white/10 bg-white/5 px-6 py-3 text-sm font-medium text-white/70 transition hover:text-white"
          >
            Sign In with Different Account
          </Link>
        </div>
      </div>
    </div>
  );
}
