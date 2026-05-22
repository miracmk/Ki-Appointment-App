import type { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection('marketplace_listings').doc(params.id).get();
    if (!snap.exists) return {};
    const d = snap.data()!;
    const title = d.title ?? 'Consulting Service';
    const description = d.description
      ? String(d.description).slice(0, 155)
      : `Book a session with a KYC-verified consultant. ${title}.`;
    return {
      title,
      description,
      alternates: { canonical: `https://kibusiness.global/listings/${params.id}` },
      openGraph: {
        title,
        description,
        url: `https://kibusiness.global/listings/${params.id}`,
        type: 'website',
      },
    };
  } catch {
    return {};
  }
}

export default function ListingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
