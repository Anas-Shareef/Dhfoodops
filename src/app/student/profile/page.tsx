'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { 
  UserCircle, 
  Lock, 
  Mail, 
  Hash, 
  School, 
  Utensils, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

export default function StudentProfilePage() {
  const { user, updatePassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const toast = useToast();

  const student = user?.studentProfile;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }

    setIsUpdating(true);
    const result = await updatePassword(newPassword);
    setIsUpdating(false);

    if (result.success) {
      toast.success('Your password has been changed successfully.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(result.error || 'Failed to update password.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          <UserCircle className="w-6 h-6 text-amber-500" />
          Student Profile & Account Settings
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          View official institutional enrollment details and manage your account security
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Academic & Dining Assignment (2 Cols) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Official Academic & Dining Profile</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Full Name
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-bold text-slate-900">
                    {student?.name || 'Muhammed'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Enrollment Number
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-mono font-bold text-slate-900 flex items-center gap-2">
                    <Hash className="w-4 h-4 text-slate-400" />
                    {student?.enrollment_no || '16889'}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Department / Faculty
                  </label>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-sm font-semibold text-slate-900 flex items-center gap-2">
                    <School className="w-4 h-4 text-sky-600" />
                    {student?.department?.name || 'Qira\'at & Studies Year 2'} ({student?.department?.code || 'QS2'})
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1">
                    Assigned Dining Table
                  </label>
                  <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-sm font-bold text-amber-900 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Utensils className="w-4 h-4 text-amber-600" />
                      <span>Table {student?.table_number || 31}</span>
                    </div>
                    <span className="text-xs font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md">
                      {student?.table_number && student.table_number >= 31 && student.table_number <= 36
                        ? 'First Floor CHS Side'
                        : student?.table_number && student.table_number >= 21 && student.table_number <= 26
                        ? 'First Floor Other Side'
                        : student?.table_number && student.table_number >= 11 && student.table_number <= 16
                        ? 'Ground Floor PG Side'
                        : 'First Floor CHS Side'}
                    </span>
                  </div>
                </div>
              </div>

              {/* READ ONLY EMAIL (PRD Section 10) */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    Registered Institutional Email
                  </label>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Read-Only
                  </span>
                </div>
                <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 cursor-not-allowed flex items-center justify-between">
                  <span>{student?.email || user?.email || 'student@example.com'}</span>
                  <Lock className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  As per institutional policy, student emails are read-only and managed by the registry.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Password Change Form (1 Col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-700" />
                Security
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-sm p-2.5 rounded-xl border border-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900 outline-none transition-all"
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full" isLoading={isUpdating}>
                  Update Password
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Quick Notice */}
          <div className="p-4 rounded-xl bg-slate-100 text-xs text-slate-600 leading-relaxed space-y-1">
            <span className="font-bold text-slate-800 block">Phase 1 Seating Notice</span>
            Table number is currently linked to your student profile. In Phase 2, full dynamic seating and monthly supplier assignments will be activated.
          </div>
        </div>
      </div>
    </div>
  );
}
