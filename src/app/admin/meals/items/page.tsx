'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getFoodPlanningProvider } from '@/lib/food/provider';
import { FoodItem, FoodItemCategory, FoodUnit } from '@/types/database';
import { MealsSubnav } from '@/components/admin/meals-subnav';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { 
  Utensils, 
  Plus, 
  Edit3, 
  Search, 
  RefreshCw, 
  Info, 
  CheckCircle2,
  Scale
} from 'lucide-react';

export default function FoodItemsConfigPage() {
  const [items, setItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<FoodItemCategory>('main_dish');
  const [unit, setUnit] = useState<FoodUnit>('portions');
  const [factor, setFactor] = useState<number>(1.0);
  const [isSaving, setIsSaving] = useState(false);

  const toast = useToast();

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const provider = getFoodPlanningProvider();
    const data = await provider.getFoodItems();
    setItems(data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setName('');
    setCategory('main_dish');
    setUnit('portions');
    setFactor(1.0);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: FoodItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setFactor(item.default_consumption_factor);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Item name is required.');
      return;
    }
    if (factor <= 0) {
      toast.error('Consumption factor must be greater than zero.');
      return;
    }

    setIsSaving(true);
    const provider = getFoodPlanningProvider();
    const res = await provider.saveFoodItem({
      id: editingItem?.id,
      name,
      category,
      unit,
      default_consumption_factor: Number(factor),
      is_active: true,
    });
    setIsSaving(false);

    if (res.success) {
      toast.success(editingItem ? 'Food item updated successfully.' : 'New food item added.');
      setIsModalOpen(false);
      loadData();
    } else {
      toast.error(res.error || 'Failed to save food item');
    }
  };

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q) || item.unit.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider block">
            Phase 4 • Menu &amp; Ingredients Configuration
          </span>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 mt-0.5">
            <Utensils className="w-6 h-6 text-indigo-600" />
            Food Items &amp; Consumption Factors Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure unit measurement types and student consumption factors for reproducible kitchen requirement calculations
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
          <Plus className="w-4 h-4 mr-1.5" />
          Add Food Item
        </Button>
      </div>

      {/* 2. Subnav */}
      <MealsSubnav />

      {/* 3. Consumption Factor Guidance Card */}
      <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 text-xs text-indigo-950 flex items-start gap-3">
        <div className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 mt-0.5">
          <Scale className="w-4 h-4" />
        </div>
        <div>
          <p className="font-bold text-sm">Consumption Factor Formulation (PRD Section 11 &amp; 12)</p>
          <p className="text-indigo-800 mt-0.5 leading-relaxed">
            The consumption factor represents the average amount of a food item consumed per student.
            For example, <strong>Idli</strong> uses <em>1 portion/student</em>, <strong>Sambar</strong> uses <em>0.200 L/student</em>,
            and <strong>Ghee Rice</strong> uses <em>0.250 kg/student</em>. The system multiplies confirmed attendees by this factor
            before applying the institutional safety buffer.
          </p>
        </div>
      </div>

      {/* 4. Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Food Item, Category, Unit..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <span className="text-xs text-slate-500 font-semibold">
          {filteredItems.length} Food Preparations
        </span>
      </div>

      {/* 5. Food Items Table */}
      <Card className="bg-white border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Measurement Unit</th>
                <th className="py-3 px-4">Consumption Factor</th>
                <th className="py-3 px-4">Sample Requirement (286 Students)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.map((item) => {
                const sampleRaw = 286 * item.default_consumption_factor;
                const sampleRecommended = Math.ceil(sampleRaw * 1.05);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <span className="font-black text-slate-900 text-sm">{item.name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-slate-100 text-slate-700 uppercase font-bold text-[10px]">
                        {item.category.replace('_', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold text-slate-900 text-xs">
                        {item.default_consumption_factor} {item.unit} / student
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <strong>{sampleRecommended} {item.unit}</strong>{' '}
                      <span className="text-[10px] text-slate-400">(with 5% buffer)</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(item)}
                        className="text-xs h-7 text-indigo-700 border-indigo-200 hover:bg-indigo-50"
                      >
                        <Edit3 className="w-3 h-3 mr-1" />
                        Edit Factor
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit / Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Food Item & Factor' : 'Add Food Item'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sambar, Ghee Rice, Chicken Curry"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as FoodItemCategory)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
              >
                <option value="main_dish">Main Dish</option>
                <option value="curry">Curry / Gravy</option>
                <option value="side">Side Dish / Chutney</option>
                <option value="beverage">Beverage (Tea / Milk)</option>
                <option value="staple">Staple (Rice / Bread)</option>
                <option value="dessert">Dessert</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Measurement Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as FoodUnit)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden"
              >
                <option value="portions">portions</option>
                <option value="kg">kg (weight)</option>
                <option value="litres">litres (volume)</option>
                <option value="cups">cups</option>
                <option value="pieces">pieces</option>
                <option value="packets">packets</option>
                <option value="trays">trays</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Default Consumption Factor (per student) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              required
              value={factor}
              onChange={(e) => setFactor(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-mono font-bold"
            />
            <p className="text-[11px] text-slate-500">
              Example: 1 for 1 portion; 0.200 for 200 ml of Sambar; 0.250 for 250 g of Rice.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
            >
              {isSaving ? 'Saving...' : 'Save Food Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
