'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { UtensilsCrossed, ArrowRight, ShieldCheck, UserCheck, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'ADMIN') {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-slate-900 block leading-tight">
                DH Dining Management System
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Darul Huda Institutional Dining
              </span>
            </div>
          </div>

          <Link href="/login">
            <Button variant="primary" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Phase 1 Production Release • Asia/Kolkata Institutional Clock</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            Institutional Meal Attendance &amp; Scheduling System
          </h1>
          <p className="text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Automating meal declarations with meal-specific attendance windows, strict cutoff locking, table-level mapping, and administrative analytics.
          </p>
        </div>

        {/* Portal Entry Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 text-left">
          {/* Student Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
                <UserCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Student Dining Portal</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Log in to declare meal attendance during scheduled windows, view table assignments, and submit late correction appeals.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Today&apos;s meals schedule &amp; windows
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Instant attendance toggle before cutoff
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Table 31 &amp; Department identity
                </li>
              </ul>
            </div>

            <Link href="/login" className="pt-2">
              <Button variant="primary" className="w-full">
                Enter Student Portal
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>

          {/* Admin Card */}
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">Administrative Supervisor</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Monitor operational summaries, department breakdowns, table allocations, and review student correction requests.
              </p>
              <ul className="text-xs text-slate-600 space-y-1.5 pt-1">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Real-time headcounts &amp; No-Response tracking
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> Meal schedules &amp; attendance windows CRUD
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" /> 1-Click correction adjudication with audit logs
                </li>
              </ul>
            </div>

            <Link href="/login" className="pt-2">
              <Button variant="secondary" className="w-full">
                Enter Admin Portal
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        DH Dining Management System • Phase 1 Vertical Slice
      </footer>
    </div>
  );
}
