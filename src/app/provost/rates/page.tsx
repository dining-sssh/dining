'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { MessSettings } from '@/types';
import { DataService } from '@/lib/dataService';
import { useProvostData } from '@/components/provost/ProvostData';
import { BTN_PRIMARY, Card, INPUT, PageHeader } from '@/components/admin/ui';

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
    {children}
  </label>
);

export default function ProvostRatesPage() {
  const { settings, setSettings } = useProvostData();
  const [form, setForm] = useState<MessSettings | null>(settings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings && !form) setForm(settings);
  }, [settings, form]);

  if (!form) return <p className="py-10 text-center text-sm text-slate-400">Loading settings…</p>;

  const num = (v: string) => (v === '' ? 0 : parseFloat(v) || 0);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await DataService.updateSettings(form);
    setSettings(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <>
      <PageHeader
        title="Rates & policies"
        subtitle="Rates apply to diet billing and the monthly fixed and establishment charges"
      />

      <Card className="max-w-2xl">
        {saved && (
          <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-800">
            <CheckCircle className="h-4 w-4" />
            Settings saved.
          </div>
        )}

        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Diet rate (₹ per diet)">
              <input
                type="number"
                min="10"
                step="0.5"
                value={form.diet_rate}
                onChange={(e) => setForm({ ...form, diet_rate: num(e.target.value) })}
                className={`${INPUT} font-bold`}
              />
            </Field>
            <Field label="Active session">
              <input
                type="text"
                value={form.session}
                onChange={(e) => setForm({ ...form, session: e.target.value })}
                className={`${INPUT} font-mono`}
              />
            </Field>
            <Field label="Monthly fixed charges (₹)">
              <input
                type="number"
                min="0"
                value={form.fixed_charges}
                onChange={(e) => setForm({ ...form, fixed_charges: num(e.target.value) })}
                className={INPUT}
              />
            </Field>
            <Field label="Establishment charges (₹)">
              <input
                type="number"
                min="0"
                value={form.establishment_charges}
                onChange={(e) => setForm({ ...form, establishment_charges: num(e.target.value) })}
                className={INPUT}
              />
            </Field>
            <Field label="Provost name">
              <input
                type="text"
                value={form.provost_name}
                onChange={(e) => setForm({ ...form, provost_name: e.target.value })}
                className={INPUT}
              />
            </Field>
            <Field label="Senior Munshi in charge">
              <input
                type="text"
                value={form.munshi_name}
                onChange={(e) => setForm({ ...form, munshi_name: e.target.value })}
                className={INPUT}
              />
            </Field>
          </div>

          <button type="submit" className={BTN_PRIMARY}>
            Save settings
          </button>
        </form>
      </Card>
    </>
  );
}
