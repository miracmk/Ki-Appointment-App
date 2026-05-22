import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to your Ki Business Solutions account to manage appointments and consultations.',
  alternates: { canonical: 'https://kibusiness.global/login' },
  robots: { index: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
