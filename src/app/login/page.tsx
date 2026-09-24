'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { UtensilsCrossed, Lock, Mail, ArrowRight, UserCheck, ShieldCheck } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your institutional email.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.success) {
      toast.success('Authenticated successfully.');
      if (email.toLowerCase().includes('admin')) {
        router.push('/admin');
      } else {
        router.push('/student');
      }
    } else {
      toast.error(result.error || 'Authentication failed. Please verify credentials.');
    }
  };

  const handleQuickDemo = async (role: 'student' | 'admin') => {
    setIsSubmitting(true);
    if (role === 'student') {
      setEmail('student@example.com');
      setPassword('StudentPass123!');
      await signIn('student@example.com', 'StudentPass123!');
      router.push('/student');
    } else {
      setEmail('admin@example.com');
      setPassword('AdminPass123!');
      await signIn('admin@example.com', 'AdminPass123!');
      router.push('/admin');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Institutional Icon */}
        <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lg mx-auto mb-3">
          <UtensilsCrossed className="w-7 h-7 text-amber-400" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          DH Dining Management System
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-1">
          Phase 1: Student Authentication &amp; Meal Attendance
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-xl border border-slate-200/80 rounded-3xl space-y-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Institutional Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="student@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-sm pl-10 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full py-3" isLoading={isSubmitting}>
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Quick Demo Logins Helper */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick Test Sign In
            </span>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickDemo('student')}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-900 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Student (Muhammed)</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-900 text-xs font-bold text-slate-700 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Administrator</span>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          DH Institutional Dining System • Integrated with Asia/Kolkata Standard Clock
        </p>
      </div>
    </div>
  );
}
