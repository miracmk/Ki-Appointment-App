import type { MetadataRoute } from 'next';
import { getFirestoreClient } from '@/lib/firebase-client';
import { collection, getDocs, query, where } from 'firebase/firestore';

const BASE_URL = 'https://kibusiness.global';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${BASE_URL}/marketplace`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${BASE_URL}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${BASE_URL}/register`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
  ];

  let listingRoutes: MetadataRoute.Sitemap = [];
  let profileRoutes: MetadataRoute.Sitemap = [];

  try {
    const db = getFirestoreClient();
    if (db) {
      const listingsSnap = await getDocs(
        query(collection(db, 'marketplace_listings'), where('status', '==', 'active'))
      );
      listingRoutes = listingsSnap.docs.map((doc) => ({
        url: `${BASE_URL}/listings/${doc.id}`,
        lastModified: doc.data().updated_at ? new Date(doc.data().updated_at) : new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }));

      const usersSnap = await getDocs(
        query(collection(db, 'users'), where('role', '==', 'consultant'), where('kyc_status', '==', 'approved'))
      );
      profileRoutes = usersSnap.docs.map((doc) => ({
        url: `${BASE_URL}/profile/${doc.id}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }));
    }
  } catch {
    // Firestore unavailable during build — return static routes only
  }

  return [...staticRoutes, ...listingRoutes, ...profileRoutes];
}
