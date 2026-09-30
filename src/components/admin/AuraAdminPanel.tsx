'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  Save,
  Loader2,
  Search,
  Edit,
  Archive,
  ShoppingBag,
  FileText,
  Trash2,
  Plus,
  RefreshCw,
  UserCircle,
  Mail,
  Phone,
  MapPin,
  IndianRupee,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { DEFAULT_CURRENCY } from '@/constants/countries';
import { formatEventPrice } from '@/lib/formatPrice';
import type { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  auraProductToForm,
  defaultAuraProductForm,
  formToAuraProductPayload,
  type AuraProductFormState,
} from '@/types/aura-product';

type SubTab = 'leads' | 'products' | 'orders';

type AuraLeadRecord = {
  id: string;
  status?: string;
  productTitle?: string;
  quantity?: number;
  amountQuoted?: number;
  amountPaid?: number;
  currency?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPincode?: string;
  bookingId?: string;
  orderId?: string;
  paymentId?: string;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};

function mapAuraLeadDocs(docs: QueryDocumentSnapshot[]): AuraLeadRecord[] {
  return docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const createdAt =
      data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
    const updatedAt =
      data.updatedAt?.toDate?.() || (data.updatedAt ? new Date(data.updatedAt) : null);
    return { id: docSnapshot.id, ...data, createdAt, updatedAt };
  });
}

function formatAuraTimestamp(value?: Date | null) {
  if (!value) return '—';
  try {
    return value.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return value.toISOString();
  }
}

function getAuraLeadStatusStyles(status?: string) {
  switch (status) {
    case 'confirmed':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'payment_order_created':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'payment_cancelled':
    case 'payment_verification_failed':
    case 'payment_error':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    default:
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  }
}

function formatAuraLeadStatus(status?: string) {
  const raw = (status || 'payment_not_started').replace(/_/g, ' ');
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function parseAuraAmount(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/,/g, '').trim();
    if (!cleaned) return 0;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-gray-300 mb-1.5">{children}</label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-base font-semibold text-white flex items-center gap-2 pb-1 border-b border-gray-700/80">
      <span className="w-1 h-5 rounded-full bg-primary-500 shrink-0" aria-hidden />
      {children}
    </h3>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm placeholder:text-gray-500 focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 outline-none"
    />
  );
}

function TextArea({
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full px-3 py-2.5 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm placeholder:text-gray-500 focus:border-primary-500/60 focus:ring-1 focus:ring-primary-500/20 outline-none resize-y min-h-[88px]"
    />
  );
}

export default function AuraAdminPanel() {
  const [subTab, setSubTab] = useState<SubTab>('leads');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [leads, setLeads] = useState<AuraLeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AuraProductFormState>(defaultAuraProductForm());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [leadSearchQuery, setLeadSearchQuery] = useState('');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [deletingLeadId, setDeletingLeadId] = useState<string | null>(null);
  const [isBulkDeletingLeads, setIsBulkDeletingLeads] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  const patchForm = (patch: Partial<AuraProductFormState>) => {
    setForm((f) => ({ ...f, ...patch }));
  };

  const loadProducts = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'auraProducts'), orderBy('createdAt', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'auraProducts'));
      }
      setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'auraProductOrders'), orderBy('createdAt', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'auraProductOrders'));
      }
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLeads = useCallback(async () => {
    if (!db) return;
    setLoading(true);
    try {
      let snap;
      try {
        snap = await getDocs(query(collection(db, 'auraProductLeads'), orderBy('createdAt', 'desc')));
      } catch {
        snap = await getDocs(collection(db, 'auraProductLeads'));
      }
      setLeads(mapAuraLeadDocs(snap.docs));
      setSelectedLeadIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'products') loadProducts();
    if (subTab === 'orders') loadOrders();
    if (subTab === 'leads') loadLeads();
  }, [subTab, loadProducts, loadOrders, loadLeads]);

  const uploadImage = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok || !data.url) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSaving(true);
    try {
      let imageUrl = form.imageUrl.trim();
      if (imageFile) {
        imageUrl = await uploadImage(imageFile);
      }

      const payload = formToAuraProductPayload(form, imageUrl, DEFAULT_CURRENCY);

      if (editingId) {
        const existing = products.find((p) => p.id === editingId);
        await updateDoc(doc(db, 'auraProducts', editingId), {
          ...payload,
          unitsSold: existing?.unitsSold ?? 0,
          updatedAt: Timestamp.now(),
        });
        toast.success('Product updated');
      } else {
        await addDoc(collection(db, 'auraProducts'), {
          ...payload,
          unitsSold: 0,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
        toast.success('Product created');
      }

      setEditingId(null);
      setForm(defaultAuraProductForm());
      setImageFile(null);
      loadProducts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (p: Record<string, unknown> & { id: string }) => {
    setEditingId(p.id);
    setForm(auraProductToForm(p));
    setImageFile(null);
    setSubTab('products');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startNew = () => {
    setEditingId(null);
    setForm(defaultAuraProductForm());
    setImageFile(null);
  };

  const archiveProduct = async (id: string) => {
    if (!db || !confirm('Archive this product? It will hide from Buy Your Aura.')) return;
    await updateDoc(doc(db, 'auraProducts', id), {
      status: 'archived',
      updatedAt: Timestamp.now(),
    });
    toast.success('Archived');
    loadProducts();
  };

  const deleteProduct = async (id: string, title?: string) => {
    if (!db) return;
    const label = title?.trim() || 'this product';
    if (
      !window.confirm(
        `Permanently delete "${label}"? This removes it from Firestore and cannot be undone.`
      )
    ) {
      return;
    }
    setDeletingProductId(id);
    try {
      await deleteDoc(doc(db, 'auraProducts', id));
      if (editingId === id) startNew();
      toast.success('Product deleted');
      loadProducts();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Update Firestore rules for auraProducts.');
      } else {
        toast.error(error?.message || 'Failed to delete product');
      }
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleDeleteLead = async (lead: AuraLeadRecord) => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }
    const leadLabel = lead.customerName || lead.productTitle || 'this lead';
    if (
      !window.confirm(`Delete ${leadLabel} from Aura leads? This will only remove the lead record.`)
    ) {
      return;
    }
    setDeletingLeadId(lead.id);
    try {
      await deleteDoc(doc(db, 'auraProductLeads', lead.id));
      setLeads((prev) => prev.filter((item) => item.id !== lead.id));
      setSelectedLeadIds((prev) => prev.filter((id) => id !== lead.id));
      toast.success('Aura lead deleted successfully.');
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Update Firestore rules for auraProductLeads.');
      } else {
        toast.error(error?.message || 'Failed to delete lead.');
      }
    } finally {
      setDeletingLeadId(null);
    }
  };

  const handleDeleteSelectedLeads = async () => {
    if (!db || selectedLeadIds.length === 0) return;
    const count = selectedLeadIds.length;
    if (
      !window.confirm(
        `Delete ${count} Aura lead${count === 1 ? '' : 's'}? This will only remove the lead records.`
      )
    ) {
      return;
    }
    setIsBulkDeletingLeads(true);
    try {
      await Promise.all(
        selectedLeadIds.map((leadId) => deleteDoc(doc(db, 'auraProductLeads', leadId)))
      );
      setLeads((prev) => prev.filter((item) => !selectedLeadIds.includes(item.id)));
      setSelectedLeadIds([]);
      toast.success(`${count} Aura lead${count === 1 ? '' : 's'} deleted successfully.`);
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (error?.code === 'permission-denied') {
        toast.error('Permission denied. Update Firestore rules for auraProductLeads.');
      } else {
        toast.error(error?.message || 'Failed to delete selected leads.');
      }
    } finally {
      setIsBulkDeletingLeads(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const search = leadSearchQuery.trim().toLowerCase();
    if (!search) return leads;
    return leads.filter((lead) =>
      [
        lead.customerName,
        lead.customerEmail,
        lead.customerPhone,
        lead.productTitle,
        lead.status,
        lead.bookingId,
        lead.orderId,
        lead.paymentId,
        lead.shippingCity,
        lead.shippingState,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search))
    );
  }, [leads, leadSearchQuery]);

  const confirmedLeads = useMemo(
    () => leads.filter((lead) => lead.status === 'confirmed'),
    [leads]
  );

  const confirmedAuraEarnedTotals = useMemo(() => {
    const totals = confirmedLeads.reduce<Record<string, number>>((acc, lead) => {
      const currency = String(lead.currency || DEFAULT_CURRENCY).toUpperCase();
      const amount = parseAuraAmount(lead.amountPaid ?? lead.amountQuoted ?? 0);
      acc[currency] = (acc[currency] || 0) + amount;
      return acc;
    }, {});
    return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b));
  }, [confirmedLeads]);

  const filteredLeadIds = filteredLeads.map((lead) => lead.id);
  const allFilteredLeadsSelected =
    filteredLeadIds.length > 0 && filteredLeadIds.every((id) => selectedLeadIds.includes(id));

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const toggleSelectAllFilteredLeads = () => {
    if (allFilteredLeadsSelected) {
      setSelectedLeadIds((prev) => prev.filter((id) => !filteredLeadIds.includes(id)));
      return;
    }
    setSelectedLeadIds((prev) => Array.from(new Set([...prev, ...filteredLeadIds])));
  };

  const orderFilterText = orderSearchQuery.trim().toLowerCase();
  const activeProducts = products.filter((p) => p.status !== 'archived');

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'leads' as SubTab, label: 'Aura Leads', icon: FileText },
            { id: 'products' as SubTab, label: 'Products', icon: Sparkles },
            { id: 'orders' as SubTab, label: 'Paid orders', icon: ShoppingBag },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubTab(id)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium border ${
              subTab === id
                ? 'border-primary-500/50 bg-primary-500/10 text-primary-400'
                : 'border-gray-700 text-gray-400 hover:text-gray-300'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {subTab === 'products' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(280px,320px)] gap-6 xl:gap-8 items-start">
          <form
            onSubmit={handleSaveProduct}
            className="bg-dark-800 rounded-2xl border border-gray-700 flex flex-col max-h-[calc(100vh-11rem)] min-h-[420px]"
          >
            <div className="shrink-0 px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-gray-700">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary-400" />
                    {editingId ? 'Edit product' : 'Add product'}
                  </h2>
                  <p className="text-sm text-gray-500 mt-1 max-w-lg">
                    All fields are optional — save whenever you&apos;re ready. Empty sections simply
                    won&apos;t show on the shop.
                  </p>
                </div>
                {editingId ? (
                  <button
                    type="button"
                    onClick={startNew}
                    className="text-sm flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-600 text-gray-300 hover:border-primary-500/40 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add another
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={startNew}
                    className="text-sm px-3 py-2 rounded-lg text-gray-500 hover:text-gray-300 transition-colors"
                  >
                    Reset form
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto admin-panel-scroll px-5 sm:px-6 py-5 space-y-8">
            <section className="space-y-4">
              <SectionTitle>Name &amp; branding</SectionTitle>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <FieldLabel>Product name</FieldLabel>
                  <TextInput value={form.title} onChange={(v) => patchForm({ title: v })} placeholder="The Aura" />
                </div>
                <div>
                  <FieldLabel>Subtitle</FieldLabel>
                  <TextInput value={form.subtitle} onChange={(v) => patchForm({ subtitle: v })} placeholder="Limited Edition" />
                </div>
                <div>
                  <FieldLabel>Tagline (on product card)</FieldLabel>
                  <TextInput
                    value={form.tagline}
                    onChange={(v) => patchForm({ tagline: v })}
                    placeholder="More than a fragrance — it's a feeling"
                  />
                </div>
                <div>
                  <FieldLabel>Brand line</FieldLabel>
                  <TextInput value={form.brandLine} onChange={(v) => patchForm({ brandLine: v })} placeholder="unigather Fragrance" />
                </div>
                <div>
                  <FieldLabel>SKU / product code</FieldLabel>
                  <TextInput value={form.sku} onChange={(v) => patchForm({ sku: v })} placeholder="AURA-7ML-001" />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle>Pricing &amp; size</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Selling price (INR)</FieldLabel>
                  <TextInput value={form.price} onChange={(v) => patchForm({ price: v })} placeholder="250" />
                </div>
                <div>
                  <FieldLabel>MRP (optional)</FieldLabel>
                  <TextInput value={form.compareAtPrice} onChange={(v) => patchForm({ compareAtPrice: v })} placeholder="e.g. 399" />
                </div>
                <div>
                  <FieldLabel>Volume</FieldLabel>
                  <TextInput value={form.volume} onChange={(v) => patchForm({ volume: v })} placeholder="7 ML" />
                </div>
                <div>
                  <FieldLabel>Edition label</FieldLabel>
                  <TextInput value={form.edition} onChange={(v) => patchForm({ edition: v })} placeholder="Limited Edition" />
                </div>
                <div>
                  <FieldLabel>Stock limit</FieldLabel>
                  <TextInput value={form.maxStock} onChange={(v) => patchForm({ maxStock: v })} placeholder="500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => patchForm({ featured: e.target.checked })}
                      className="accent-primary-500 rounded"
                    />
                    Featured product
                  </label>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle>Descriptions</SectionTitle>
              <div>
                <FieldLabel>Short description (card teaser)</FieldLabel>
                <TextArea
                  value={form.description}
                  onChange={(v) => patchForm({ description: v })}
                  rows={3}
                  placeholder="One or two sentences customers see first"
                />
              </div>
              <div>
                <FieldLabel>Full description (details section)</FieldLabel>
                <TextArea
                  value={form.longDescription}
                  onChange={(v) => patchForm({ longDescription: v })}
                  rows={6}
                  placeholder="Story, notes, who it's for, what makes it special..."
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle>Highlights &amp; features</SectionTitle>
              <div>
                <FieldLabel>Highlight badges (one per line)</FieldLabel>
                <TextArea
                  value={form.highlightsText}
                  onChange={(v) => patchForm({ highlightsText: v })}
                  rows={4}
                  placeholder={'Lasts 900+ minutes\nPremium fragrance\n7 ML oil'}
                />
              </div>
              <div>
                <FieldLabel>Feature bullets (one per line)</FieldLabel>
                <TextArea
                  value={form.featuresText}
                  onChange={(v) => patchForm({ featuresText: v })}
                  rows={4}
                  placeholder="Extra points shown in product details"
                />
              </div>
              <div>
                <FieldLabel>Occasions (comma-separated)</FieldLabel>
                <TextInput
                  value={form.occasionsText}
                  onChange={(v) => patchForm({ occasionsText: v })}
                  placeholder="Work, Party, Date, Travel, Everyday"
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle>Usage &amp; promo</SectionTitle>
              <div>
                <FieldLabel>Ingredients / composition</FieldLabel>
                <TextArea value={form.ingredients} onChange={(v) => patchForm({ ingredients: v })} rows={2} />
              </div>
              <div>
                <FieldLabel>How to use</FieldLabel>
                <TextArea value={form.howToUse} onChange={(v) => patchForm({ howToUse: v })} rows={2} />
              </div>
              <div>
                <FieldLabel>Promo banner text</FieldLabel>
                <TextInput
                  value={form.promoBanner}
                  onChange={(v) => patchForm({ promoBanner: v })}
                  placeholder="Available only for 1 month — Limited Edition"
                />
              </div>
            </section>

            <section className="space-y-4">
              <SectionTitle>Product image</SectionTitle>
              <label className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700/50 hover:border-primary-500/50 transition-colors px-4 py-6">
                <span className="text-sm text-gray-400 text-center">
                  Click to upload image (PNG, JPG)
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                />
              </label>
              {imageFile && (
                <p className="text-xs text-gray-500 truncate">{imageFile.name}</p>
              )}
              <div>
                <FieldLabel>Or image URL</FieldLabel>
                <TextInput value={form.imageUrl} onChange={(v) => patchForm({ imageUrl: v })} />
              </div>
              {(form.imageUrl || imageFile) && (
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : form.imageUrl}
                  alt="Preview"
                  className="h-32 rounded-xl object-cover border border-gray-600"
                />
              )}
            </section>
            </div>

            <div className="shrink-0 flex gap-2 px-5 sm:px-6 py-4 border-t border-gray-700 bg-dark-800/95 backdrop-blur-sm rounded-b-2xl">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-r from-primary-500 to-primary-400 text-white font-semibold flex items-center justify-center gap-2 hover:from-primary-600 hover:to-primary-500 transition-all disabled:opacity-60"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {editingId ? 'Update product' : 'Publish product'}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={startNew}
                  className="px-4 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-dark-700"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>

          <div className="bg-dark-800 rounded-2xl border border-gray-700 p-5 sm:p-6 xl:sticky xl:top-24">
            <h3 className="text-lg font-semibold text-white mb-1">Your catalog</h3>
            <p className="text-xs text-gray-500 mb-4">
              {activeProducts.length} live on Buy Your Aura
            </p>
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            ) : products.length === 0 ? (
              <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-700 rounded-xl">
                No products yet. Publish your first product using the form.
              </p>
            ) : (
              <ul className="space-y-3 max-h-[min(70vh,640px)] overflow-y-auto admin-panel-scroll pr-1">
                {products.map((p) => (
                  <li
                    key={p.id}
                    className={`flex gap-3 p-3 rounded-xl border ${
                      p.status === 'archived'
                        ? 'bg-dark-900/50 border-gray-800 opacity-60'
                        : 'bg-dark-700/50 border-gray-700'
                    }`}
                  >
                    <img
                      src={p.image || '/media/the-aura-poster.jpg'}
                      alt={p.title || 'Product'}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-dark-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">{p.title?.trim() || 'Untitled product'}</p>
                      <p className="text-primary-400 text-sm">
                        {p.price != null && p.price !== '' ? `₹${p.price}` : 'No price set'}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{p.description}</p>
                      <p className="text-xs text-gray-600 mt-1">
                        Sold {p.unitsSold ?? 0}
                        {p.maxStock != null ? ` / ${p.maxStock}` : ''}
                        {p.status === 'archived' ? ' · archived' : ''}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button type="button" onClick={() => startEdit(p)} className="p-2 text-gray-400 hover:text-primary-400" title="Edit">
                        <Edit className="w-4 h-4" />
                      </button>
                      {p.status !== 'archived' && (
                        <button type="button" onClick={() => archiveProduct(p.id)} className="p-2 text-gray-400 hover:text-amber-400" title="Archive">
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => deleteProduct(p.id, p.title)}
                        disabled={deletingProductId === p.id}
                        className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50"
                        title="Delete permanently"
                      >
                        {deletingProductId === p.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {subTab === 'orders' && (
        <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Paid orders</h2>
              <p className="text-gray-400">Confirmed Aura purchases recorded after successful payment.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  value={orderSearchQuery}
                  onChange={(e) => setOrderSearchQuery(e.target.value)}
                  placeholder="Search orders..."
                  className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-full sm:w-72"
                />
              </div>
              <button
                type="button"
                onClick={() => loadOrders()}
                disabled={loading}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Refresh</span>
              </button>
            </div>
          </div>
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading orders...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders
                .filter((o) => {
                  if (!orderFilterText) return true;
                  return JSON.stringify(o).toLowerCase().includes(orderFilterText);
                })
                .map((o) => (
                  <div key={o.id} className="p-4 rounded-xl bg-dark-700/50 border border-gray-700 text-sm">
                    <div className="flex flex-wrap justify-between gap-2 mb-2">
                      <span className="text-amber-400 font-mono">{o.bookingId}</span>
                      <span className="text-green-400">{o.status}</span>
                    </div>
                    <p className="text-white font-medium">{o.productTitle}</p>
                    <p className="text-gray-400">
                      {o.customerName} · {o.customerEmail} · {o.customerPhone}
                    </p>
                    <p className="text-gray-500 mt-1">
                      Qty {o.quantity} · ₹{o.amountPaid} · {o.shippingCity}, {o.shippingState}{' '}
                      {o.shippingPincode}
                    </p>
                    <p className="text-gray-600 text-xs mt-1">{o.shippingAddress}</p>
                    {o.paymentId && <p className="text-gray-600 text-xs">Payment: {o.paymentId}</p>}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {subTab === 'leads' && (
        <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Aura Leads</h2>
              <p className="text-gray-400">
                All Buy Your Aura checkout submissions appear here before and after payment.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={leadSearchQuery}
                  onChange={(e) => setLeadSearchQuery(e.target.value)}
                  placeholder="Search leads..."
                  className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-full sm:w-72"
                />
              </div>
              <button
                type="button"
                onClick={() => loadLeads()}
                disabled={loading}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
              <div className="text-gray-400 text-sm">Total leads</div>
              <div className="text-2xl font-bold text-white">{leads.length}</div>
            </div>
            <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
              <div className="text-gray-400 text-sm">Not paid yet</div>
              <div className="text-2xl font-bold text-amber-300">
                {leads.filter((lead) => lead.status !== 'confirmed').length}
              </div>
            </div>
            <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
              <div className="text-gray-400 text-sm">Confirmed</div>
              <div className="text-2xl font-bold text-green-400">{confirmedLeads.length}</div>
            </div>
            <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
              <div className="text-gray-400 text-sm">Total earned</div>
              {confirmedAuraEarnedTotals.length === 0 ? (
                <div className="text-2xl font-bold text-green-400">
                  {formatEventPrice(0, DEFAULT_CURRENCY)}
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {confirmedAuraEarnedTotals.map(([currency, total]) => (
                    <div key={currency} className="text-2xl font-bold text-green-400 leading-tight">
                      {formatEventPrice(total, currency)}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
              <div className="text-gray-400 text-sm">Matching search</div>
              <div className="text-2xl font-bold text-primary-400">{filteredLeads.length}</div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading Aura leads...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="text-center py-12 bg-dark-700/40 rounded-xl border border-gray-700">
              <FileText className="w-14 h-14 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Aura leads found</h3>
              <p className="text-gray-400">
                When someone starts Buy Your Aura checkout, their details will appear here before payment.
              </p>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-dark-700/50 rounded-xl border border-gray-600">
                <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allFilteredLeadsSelected}
                    onChange={toggleSelectAllFilteredLeads}
                    disabled={isBulkDeletingLeads}
                    className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500/30 disabled:opacity-50"
                  />
                  <span>
                    Select all ({filteredLeads.length})
                    {selectedLeadIds.length > 0 && (
                      <span className="text-primary-400 ml-1">· {selectedLeadIds.length} selected</span>
                    )}
                  </span>
                </label>
                {selectedLeadIds.length > 0 && (
                  <button
                    type="button"
                    onClick={handleDeleteSelectedLeads}
                    disabled={isBulkDeletingLeads}
                    className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isBulkDeletingLeads ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>
                      {isBulkDeletingLeads
                        ? 'Deleting...'
                        : `Delete selected (${selectedLeadIds.length})`}
                    </span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {filteredLeads.map((lead) => {
                  const leadAmount = lead.amountPaid ?? lead.amountQuoted ?? 0;
                  const leadCurrency = lead.currency || DEFAULT_CURRENCY;
                  const isDeleting = deletingLeadId === lead.id;
                  const isSelected = selectedLeadIds.includes(lead.id);

                  return (
                    <div
                      key={lead.id}
                      className={`bg-dark-800 rounded-xl border p-5 transition-colors ${
                        isSelected
                          ? 'border-primary-500/60 ring-1 ring-primary-500/30'
                          : 'border-gray-700 hover:border-primary-500/50'
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                        <div className="min-w-0 flex gap-3">
                          <label className="flex items-start pt-1 cursor-pointer flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleLeadSelection(lead.id)}
                              disabled={isBulkDeletingLeads || isDeleting}
                              className="mt-0.5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500/30 disabled:opacity-50"
                              aria-label={`Select ${lead.customerName || lead.productTitle || 'lead'}`}
                            />
                          </label>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <span
                                className={`px-2.5 py-1 rounded-full border text-xs font-medium ${getAuraLeadStatusStyles(lead.status)}`}
                              >
                                {formatAuraLeadStatus(lead.status)}
                              </span>
                              <span className="px-2.5 py-1 rounded-full bg-dark-700 border border-gray-600 text-gray-300 text-xs">
                                {lead.status === 'confirmed' ? 'Paid' : 'Payment required'}
                              </span>
                            </div>
                            <h3 className="text-lg font-semibold text-white break-words">
                              {lead.productTitle || 'Untitled product'}
                            </h3>
                            {lead.quantity != null && (
                              <p className="text-sm text-gray-400">Quantity: {lead.quantity}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row lg:flex-col sm:items-center lg:items-end gap-3 text-left lg:text-right">
                          <div>
                            <div className="text-sm text-gray-400">Captured</div>
                            <div className="text-white text-sm">{formatAuraTimestamp(lead.createdAt)}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteLead(lead)}
                            disabled={isDeleting}
                            className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Delete Aura lead"
                          >
                            {isDeleting ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                            <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="space-y-2">
                          <h4 className="text-primary-400 font-semibold flex items-center space-x-2">
                            <UserCircle className="w-4 h-4" />
                            <span>Customer</span>
                          </h4>
                          <div>
                            <span className="text-gray-400">Name: </span>
                            <span className="text-white break-words">{lead.customerName || '—'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white break-all">{lead.customerEmail || '—'}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            <span className="text-white break-words">{lead.customerPhone || '—'}</span>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-primary-400 font-semibold flex items-center space-x-2">
                            <IndianRupee className="w-4 h-4" />
                            <span>Order</span>
                          </h4>
                          <div>
                            <span className="text-gray-400">Amount: </span>
                            <span className="text-green-400 font-semibold">
                              {formatEventPrice(leadAmount as number | string, leadCurrency)}
                            </span>
                          </div>
                          {lead.bookingId && (
                            <div>
                              <span className="text-gray-400">Booking ID: </span>
                              <span className="text-white font-mono text-xs break-all">{lead.bookingId}</span>
                            </div>
                          )}
                          {lead.orderId && (
                            <div>
                              <span className="text-gray-400">Order ID: </span>
                              <span className="text-white font-mono text-xs break-all">{lead.orderId}</span>
                            </div>
                          )}
                          {lead.paymentId && (
                            <div>
                              <span className="text-gray-400">Payment ID: </span>
                              <span className="text-white font-mono text-xs break-all">{lead.paymentId}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <h4 className="text-primary-400 font-semibold flex items-center space-x-2">
                            <MapPin className="w-4 h-4" />
                            <span>Delivery</span>
                          </h4>
                          {lead.shippingAddress ? (
                            <div className="text-white break-words">{lead.shippingAddress}</div>
                          ) : (
                            <div className="text-gray-500">No address yet.</div>
                          )}
                          {(lead.shippingCity || lead.shippingState || lead.shippingPincode) && (
                            <div className="text-gray-400 break-words">
                              {[lead.shippingCity, lead.shippingState, lead.shippingPincode]
                                .filter(Boolean)
                                .join(', ')}
                            </div>
                          )}
                          <div>
                            <span className="text-gray-400">Last update: </span>
                            <span className="text-white">{formatAuraTimestamp(lead.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700 text-sm text-gray-400">
                Showing {filteredLeads.length} lead{filteredLeads.length === 1 ? '' : 's'}
                {leadSearchQuery.trim() ? ' matching search' : ''}
              </div>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
}
