'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { getKitchenProvider } from '@/lib/kitchen/provider';
import { 
  SpecialMealOrder, 
  SpecialMealOrderStatus, 
  SpecialMealOrderAudienceType,
  MealSlot 
} from '@/types/database';
import { KitchenSubnav } from '@/components/admin/kitchen-subnav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  RotateCcw, 
  Search, 
  CheckCircle2, 
  Clock, 
  Plus, 
  User, 
  ArrowRight, 
  Calendar, 
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  ChefHat
} from 'lucide-react';
import { cn } from '@/lib/utils/cn';

export default function SpecialOrdersPage() {
  const [orders, setOrders] = useState<SpecialMealOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [activeOrderForCancel, setActiveOrderForCancel] = useState<SpecialMealOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states for new order
  const [title, setTitle] = useState('');
  const [requestedDate, setRequestedDate] = useState('2026-09-24');
  const [mealSlot, setMealSlot] = useState<MealSlot>('LUNCH');
  const [quantity, setQuantity] = useState(25);
  const [requesterName, setRequesterName] = useState('');
  const [requesterRole, setRequesterRole] = useState('Programme Coordinator');
  const [audienceType, setAudienceType] = useState<SpecialMealOrderAudienceType>('PROGRAMME');
  const [specialRequirements, setSpecialRequirements] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const provider = getKitchenProvider();
      const allOrders = await provider.getAllSpecialOrders();
      setOrders(allOrders);
    } catch (err) {
      console.error('Failed to load special orders', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleApprove = async (orderId: string) => {
    const provider = getKitchenProvider();
    await provider.approveSpecialOrder(orderId, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi');
    await loadData();
  };

  const handleAssign = async (orderId: string) => {
    const provider = getKitchenProvider();
    await provider.assignSpecialOrder(orderId, 'c1111111-1111-1111-1111-111111111111', 'Chef Moideen (Head Cook)');
    await loadData();
  };

  const handleStatusTransition = async (orderId: string, nextStatus: SpecialMealOrderStatus) => {
    const provider = getKitchenProvider();
    await provider.updateSpecialOrderStatus(orderId, nextStatus, 'c1111111-1111-1111-1111-111111111111', 'Chef Moideen');
    await loadData();
  };

  const handleConfirmCancel = async () => {
    if (!activeOrderForCancel) return;
    if (!cancelReason || cancelReason.trim().length < 5) {
      alert('A valid cancellation reason is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.cancelSpecialOrder(activeOrderForCancel.id, cancelReason, 'a0000000-0000-0000-0000-000000000001', 'Supervisor Shafi');
      setActiveOrderForCancel(null);
      setCancelReason('');
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !requesterName) {
      alert('Please fill out all required fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      const provider = getKitchenProvider();
      await provider.createSpecialOrder({
        title,
        requested_for_date: requestedDate,
        meal_slot: mealSlot,
        quantity,
        requester_name: requesterName,
        requester_role: requesterRole,
        audience_type: audienceType,
        special_requirements: specialRequirements,
      });

      setTitle('');
      setRequesterName('');
      setSpecialRequirements('');
      setIsNewOrderModalOpen(false);
      await loadData();
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        o.order_number.toLowerCase().includes(q) ||
        o.title.toLowerCase().includes(q) ||
        o.requester_name.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' ? true : o.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  const getStatusBadge = (status: SpecialMealOrderStatus) => {
    switch (status) {
      case 'SUBMITTED':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[11px] animate-pulse">
            Pending Review
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge className="bg-blue-100 text-blue-900 border-blue-300 font-bold text-[11px]">
            Approved (Unassigned)
          </Badge>
        );
      case 'ASSIGNED':
        return (
          <Badge className="bg-purple-100 text-purple-900 border-purple-300 font-bold text-[11px]">
            Assigned to Cook
          </Badge>
        );
      case 'PREPARING':
        return (
          <Badge className="bg-amber-100 text-amber-900 border-amber-300 font-extrabold text-[11px] animate-pulse">
            Preparing
          </Badge>
        );
      case 'PREPARED':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[11px]">
            Ready to Dispatch
          </Badge>
        );
      case 'SERVED':
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[11px]">
            <CheckCircle2 className="w-3 h-3 mr-1 inline" />
            Completed
          </Badge>
        );
      case 'CANCELLED':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-300 font-bold text-[11px]">
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <KitchenSubnav onOpenNewOrderModal={() => setIsNewOrderModalOpen(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header Banner */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                PRD Section 12–22 • Special &amp; Party Meal Orders
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-1">
              <RotateCcw className="w-6 h-6 text-indigo-600" />
              Special Meal Orders Ledger
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Hospitality orders for academic programme candidates, guests, institutional meetings, and seminars. Operates independently without altering normal student table attendance.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsNewOrderModalOpen(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Special Order
            </Button>
            <Button variant="outline" onClick={loadData} className="text-xs font-semibold">
              <RotateCcw className={cn("w-3.5 h-3.5 mr-1", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by order #, title, requester..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 focus:bg-white focus:outline-indigo-600 font-medium"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="font-bold text-slate-500 uppercase text-[10px]">Filter Status:</span>
            {[
              { id: 'ALL', label: 'All Orders' },
              { id: 'SUBMITTED', label: 'Pending Review' },
              { id: 'APPROVED', label: 'Approved' },
              { id: 'ASSIGNED', label: 'Assigned' },
              { id: 'PREPARING', label: 'Preparing' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap',
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Order #</th>
                  <th className="py-3 px-4">Title &amp; Audience</th>
                  <th className="py-3 px-4">Date &amp; Slot</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Requester</th>
                  <th className="py-3 px-4">Assigned Cook</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Workflow Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">Loading orders...</td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-slate-400">No special orders found.</td>
                  </tr>
                ) : (
                  filteredOrders.map((o) => (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-indigo-700">
                        {o.order_number}
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{o.title}</div>
                        <div className="text-[10px] text-slate-400">{o.audience_type} • {o.special_requirements || 'Standard prep'}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-800">{o.requested_for_date}</div>
                        <div className="text-[10px] text-slate-500">{o.meal_slot}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {o.quantity} portions
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-medium text-slate-900">{o.requester_name}</div>
                        <div className="text-[10px] text-slate-400">{o.requester_role || 'Staff'}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {o.assigned_to_name ? (
                          <div className="font-semibold text-purple-900 flex items-center gap-1">
                            <ChefHat className="w-3 h-3 text-purple-600" />
                            {o.assigned_to_name}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getStatusBadge(o.status)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {o.status === 'SUBMITTED' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(o.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] h-7 px-2.5"
                            >
                              Approve
                            </Button>
                          )}

                          {o.status === 'APPROVED' && (
                            <Button
                              size="sm"
                              onClick={() => handleAssign(o.id)}
                              className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] h-7 px-2.5"
                            >
                              Assign Cook
                            </Button>
                          )}

                          {o.status === 'ASSIGNED' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusTransition(o.id, 'PREPARING')}
                              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] h-7 px-2.5"
                            >
                              Start Prep
                            </Button>
                          )}

                          {o.status === 'PREPARING' && (
                            <Button
                              size="sm"
                              onClick={() => handleStatusTransition(o.id, 'COMPLETED')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] h-7 px-2.5"
                            >
                              Mark Completed
                            </Button>
                          )}

                          {o.status !== 'CANCELLED' && o.status !== 'COMPLETED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setActiveOrderForCancel(o)}
                              className="border-rose-200 text-rose-700 hover:bg-rose-50 font-bold text-[11px] h-7 px-2"
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cancel Order Modal */}
      {activeOrderForCancel && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <XCircle className="w-5 h-5 text-rose-600" />
              Cancel Special Order ({activeOrderForCancel.order_number})
            </h3>
            <p className="text-xs text-slate-500">
              PRD Section 22 requires a mandatory cancellation justification for audit records.
            </p>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Reason for Cancellation *</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Visiting delegation trip postponed..."
                rows={3}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveOrderForCancel(null)}>Keep Order</Button>
              <Button size="sm" onClick={handleConfirmCancel} disabled={isSubmitting} className="bg-rose-600 text-white font-bold">
                {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* New Special Order Modal */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-600" />
              Submit Special / Party Meal Order
            </h3>
            <form onSubmit={handleCreateOrder} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PG Certificate Programme Lunch"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={requestedDate}
                    onChange={(e) => setRequestedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Meal Slot *</label>
                  <select
                    value={mealSlot}
                    onChange={(e) => setMealSlot(e.target.value as MealSlot)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="BREAKFAST">Breakfast</option>
                    <option value="LUNCH">Lunch</option>
                    <option value="EVENING_SNACKS">Evening Snacks</option>
                    <option value="DINNER">Dinner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Requester Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Prof. Faisal Hameed"
                    value={requesterName}
                    onChange={(e) => setRequesterName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Audience Type</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-bold"
                  >
                    <option value="PROGRAMME">Academic Programme</option>
                    <option value="GUEST">Official Guests / Delegation</option>
                    <option value="SEMINAR">Conference / Seminar</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Dietary &amp; Delivery Notes</label>
                <textarea
                  value={specialRequirements}
                  onChange={(e) => setSpecialRequirements(e.target.value)}
                  placeholder="Deliver to VIP dining room at 1:00 PM..."
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsNewOrderModalOpen(false)}>Cancel</Button>
                <Button size="sm" type="submit" disabled={isSubmitting} className="bg-amber-600 text-white font-bold">
                  {isSubmitting ? 'Submitting...' : 'Submit Order'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
