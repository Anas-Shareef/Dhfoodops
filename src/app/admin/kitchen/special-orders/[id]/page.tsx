'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getKitchenProvider } from '@/lib/kitchen/provider';
import { 
  SpecialMealOrder, 
  SpecialMealOrderStatus 
} from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ArrowLeft, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  User, 
  ChefHat, 
  Calendar, 
  ShieldCheck, 
  XCircle, 
  AlertTriangle,
  ArrowRight,
  FileText
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SpecialOrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const router = useRouter();

  const [order, setOrder] = useState<SpecialMealOrder | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!orderId) return;
    setIsLoading(true);
    try {
      const provider = getKitchenProvider();
      const ord = await provider.getSpecialOrderById(orderId);
      setOrder(ord);
    } catch (err) {
      console.error('Failed to load special order', err);
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center text-slate-400">
        Loading special order record...
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-12 text-center space-y-4">
        <h2 className="text-xl font-bold text-slate-800">Special Order Not Found</h2>
        <Link href="/admin/kitchen/special-orders">
          <Button variant="outline" size="sm" className="text-xs">
            <ArrowLeft className="w-3.5 h-3.5 mr-1" />
            Back to Special Orders
          </Button>
        </Link>
      </div>
    );
  }

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.approveSpecialOrder(order.id, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssign = async () => {
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.assignSpecialOrder(order.id, 'c1111111-1111-1111-1111-111111111111', 'Chef Moideen (Head Cook)');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatus = async (status: SpecialMealOrderStatus) => {
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.updateSpecialOrderStatus(order.id, status, 'c1111111-1111-1111-1111-111111111111', 'Chef Moideen');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert('Cancellation reason required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.cancelSpecialOrder(order.id, cancelReason, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi');
      setCancelReason('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top back link */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/kitchen/special-orders"
          className="text-xs font-bold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Special Orders Ledger
        </Link>
        <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
          {order.order_number}
        </span>
      </div>

      {/* Main Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              {order.audience_type} Special Order
            </span>
            <span className="text-xs font-bold text-slate-400">
              Slot: {order.meal_slot}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
            {order.title}
          </h1>

          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {order.description || 'Institutional special meal requirement'}
          </p>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
          <div className="text-[10px] uppercase font-extrabold text-slate-400">Portions Requested</div>
          <div className="text-2xl font-black text-amber-800 mt-0.5">{order.quantity} meals</div>
          <Badge className="mt-1 font-bold text-[10px]">{order.status}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Workflow Action */}
        <div className="lg:col-span-2 space-y-6">
          {/* Details Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Scheduling &amp; Requester Details
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Target Date &amp; Slot</span>
                <span className="font-extrabold text-slate-900 block mt-1">
                  {order.requested_for_date} ({order.meal_slot})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Requested By</span>
                <span className="font-extrabold text-slate-900 block mt-1">
                  {order.requester_name} ({order.requester_role || 'Staff'})
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl col-span-2">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Dietary &amp; Delivery Instructions</span>
                <span className="font-medium text-slate-800 block mt-1">
                  {order.special_requirements || 'Standard dining hall preparation and utensils'}
                </span>
              </div>
            </div>
          </div>

          {/* Kitchen Assignment Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <ChefHat className="w-4 h-4 text-amber-600" />
              Kitchen Assignment &amp; Approval
            </h2>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Supervisor Approval</span>
                <span className="font-extrabold text-slate-900 block mt-1">
                  {order.approved_by_name || 'Pending Approval'}
                </span>
                <span className="text-[10px] text-slate-400">{order.approved_at?.split('T')[0] || '-'}</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase block">Assigned Cook</span>
                <span className="font-extrabold text-purple-900 block mt-1">
                  {order.assigned_to_name || 'Unassigned'}
                </span>
                <span className="text-[10px] text-slate-400">{order.assigned_at?.split('T')[0] || '-'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-2">
              {order.status === 'SUBMITTED' && (
                <Button
                  onClick={handleApprove}
                  disabled={isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Approve Special Order
                </Button>
              )}

              {order.status === 'APPROVED' && (
                <Button
                  onClick={handleAssign}
                  disabled={isSubmitting}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs"
                >
                  <ChefHat className="w-3.5 h-3.5 mr-1" />
                  Assign to Chef Moideen
                </Button>
              )}

              {order.status === 'ASSIGNED' && (
                <Button
                  onClick={() => handleStatus('PREPARING')}
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Start Kitchen Cooking
                </Button>
              )}

              {order.status === 'PREPARING' && (
                <Button
                  onClick={() => handleStatus('COMPLETED')}
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                >
                  Mark Cooked &amp; Dispatched
                </Button>
              )}
            </div>

            {order.status !== 'CANCELLED' && order.status !== 'COMPLETED' && (
              <div className="border-t border-slate-100 pt-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Cancellation reason..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-xs"
                  >
                    Cancel Order
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-600" />
              Order Audit Timeline
            </h2>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {order.events && order.events.length > 0 ? (
                order.events.map((e, idx) => (
                  <div key={e.id || idx} className="relative">
                    <span className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-amber-600 border-2 border-white ring-2 ring-amber-100" />
                    <div className="text-xs font-extrabold text-slate-900">
                      {e.event_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {e.performed_by_name || 'Staff'} • {e.performed_at.split('T')[1]?.substring(0, 5)} IST
                    </div>
                    {e.notes && (
                      <div className="mt-1 p-2 bg-slate-50 rounded-lg text-[11px] text-slate-600 border border-slate-100">
                        {e.notes}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-400">No events logged yet</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
