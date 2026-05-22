import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join Ki Business Solutions. Create a client account to book consultants, or register as a consultant to offer your expertise.',
  alternates: { canonical: 'https://kibusiness.global/register' },
  openGraph: {
    title: 'Join Ki Business Solutions',
    description: 'Connect with KYC-verified consultants or offer your own expertise on the Ki Business marketplace.',
    url: 'https://kibusiness.global/register',
    type: 'website',
  },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
