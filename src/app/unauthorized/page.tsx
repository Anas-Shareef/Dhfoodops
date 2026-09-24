'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-xl p-8 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Access Restricted
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed">
            You do not have administrative permissions to view this section. Student accounts are restricted to the student dining portal.
          </p>
        </div>

        <div className="pt-2">
          <Link href="/student">
            <Button variant="primary" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Student Portal
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
