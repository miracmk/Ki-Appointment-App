import type { Metadata } from 'next';
import { getAdminFirestore } from '@/lib/firebase-admin';

interface Props {
  params: { uid: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const db = getAdminFirestore();
    const snap = await db.collection('users').doc(params.uid).get();
    if (!snap.exists) return {};
    const d = snap.data()!;
    const name = d.display_name ?? d.displayName ?? d.name ?? 'Consultant';
    const title = d.title ? `${name} — ${d.title}` : name;
    const description = d.bio
      ? String(d.bio).slice(0, 155)
      : `View ${name}'s consultant profile on Ki Business. Book a verified session.`;
    return {
      title,
      description,
      alternates: { canonical: `https://kibusiness.global/profile/${params.uid}` },
      openGraph: {
        title,
        description,
        url: `https://kibusiness.global/profile/${params.uid}`,
        type: 'profile',
        images: d.photo_url ? [{ url: d.photo_url }] : [],
      },
      twitter: {
        card: 'summary',
        title,
        description,
        images: d.photo_url ? [d.photo_url] : [],
      },
    };
  } catch {
    return {};
  }
}

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
