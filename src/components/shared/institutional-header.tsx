'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { UtensilsCrossed, Clock, LogOut, ShieldCheck, User, RefreshCw } from 'lucide-react';
import { formatTimeIST } from '@/lib/utils/timezone';

export function InstitutionalHeader() {
  const { user, signOut, signIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    // Update live IST clock every second
    const update = () => setCurrentTime(formatTimeIST(new Date()));
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRoleToggle = async () => {
    if (user?.role === 'STUDENT') {
      await signIn('admin@example.com');
      router.push('/admin');
    } else {
      await signIn('student@example.com');
      router.push('/student');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo and Institution Title */}
        <Link
          href={user?.role === 'ADMIN' ? '/admin' : '/student'}
          className="flex items-center gap-3 group"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs group-hover:bg-slate-800 transition-colors">
            <UtensilsCrossed className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
              DH Dining System
            </span>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Phase 1 • Attendance & Scheduling
            </span>
          </div>
        </Link>

        {/* Center Live IST Clock */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>Institutional Time (IST):</span>
          <span className="font-mono font-bold text-slate-900">{currentTime || '--:-- --'}</span>
        </div>

        {/* Right User & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Demo Switcher */}
          <button
            onClick={handleRoleToggle}
            className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors cursor-pointer"
            title="Switch between Student & Admin view instantly"
          >
            <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
            <span className="hidden sm:inline">Switch to</span>
            <span className="font-bold underline decoration-amber-400">
              {user?.role === 'STUDENT' ? 'Admin Portal' : 'Student Portal'}
            </span>
          </button>

          {/* User Badge */}
          {user && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
              {user.role === 'ADMIN' ? (
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
              ) : (
                <User className="w-4 h-4 text-emerald-600" />
              )}
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-none">
                  {user.role === 'STUDENT' ? user.studentProfile?.name || 'Muhammed' : 'Admin'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium leading-none">
                  {user.role === 'STUDENT'
                    ? `Table ${user.studentProfile?.table_number || 31} • ${user.studentProfile?.department?.code || 'QS2'}`
                    : 'Supervisor'}
                </span>
              </div>
            </div>
          )}

          {/* Logout */}
          <button
            onClick={handleSignOut}
            className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
