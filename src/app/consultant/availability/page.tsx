'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AvailabilityPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/settings?tab=working_hours');
  }, [router]);
  return null;
}
