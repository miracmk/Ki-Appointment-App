'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserRole, hasConsultantAccess } from '@/lib/use-user-role';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading } = useUserRole();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!hasConsultantAccess(user.role)) {
      router.replace('/unauthorized');
    }
  }, [user, loading, router]);

  if (loading || !user || !hasConsultantAccess(user.role)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0A0B0F]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-ki-primary border-t-transparent" />
      </div>
    );
  }

  return <>{children}</>;
}
