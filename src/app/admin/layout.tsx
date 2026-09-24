'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { InstitutionalHeader } from '@/components/shared/institutional-header';
import { AdminNav } from '@/components/admin/admin-nav';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else if (
        user.role !== 'SUPER_ADMIN' &&
        user.role !== 'ADMIN' &&
        user.role !== 'SUPERVISOR' &&
        user.role !== 'COOK'
      ) {
        router.push('/unauthorized');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-indigo-700 animate-spin" />
          <span className="text-sm font-semibold text-slate-600">Verifying administrative access...</span>
        </div>
      </div>
    );
  }

  if (
    !user ||
    (user.role !== 'SUPER_ADMIN' &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPERVISOR' &&
      user.role !== 'COOK')
  ) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50/60 flex flex-col pb-12">
      <InstitutionalHeader />
      <AdminNav />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
