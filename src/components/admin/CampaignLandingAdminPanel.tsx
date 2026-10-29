'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Archive,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  CAMPAIGN_FIELD_LABELS,
  CAMPAIGN_LANDING_META,
  DEFAULT_CAMPAIGN_LANDING_CONFIG,
  labelForCampaignGender,
  labelForCampaignGenderPreference,
  parseCampaignLandingConfig,
  UNIGATHER_INSTAGRAM_URL,
  type CampaignCityOption,
  type CampaignLandingConfig,
  type CampaignLandingSlug,
} from '@/types/campaign-landing';
import { isDeveloperAdminSession } from '@/lib/adminAuth';
import { csvDateStamp, csvText, downloadCsv } from '@/lib/csv-download';

type LeadRecord = {
  id: string;
  name?: string;
  mobile?: string;
  email?: string;
  city?: string;
  instagram?: string;
  age?: number;
  contactInfo?: string;
  gender?: string;
  genderPreference?: string;
  hobbies?: string;
  status?: string;
  createdAt?: Date | null;
  cityId?: string;
  cityInstaGroupLink?: string;
  preferredLanguage?: string;
  adminEnglish?: Record<string, string>;
  archivedAt?: Date | null;
};

function isLeadArchived(lead: LeadRecord) {
  return lead.status === 'archived';
}

function adminLeadText(lead: LeadRecord, field: string, fallback: string): string {
  const fromEn = lead.adminEnglish?.[field]?.trim();
  if (fromEn) return fromEn;
  return fallback;
}

function mapLeadDocs(docs: QueryDocumentSnapshot[]): LeadRecord[] {
  return docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const createdAt =
      data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
    const archivedAt =
      data.archivedAt?.toDate?.() || (data.archivedAt ? new Date(data.archivedAt) : null);
    return { id: docSnapshot.id, ...data, createdAt, archivedAt } as LeadRecord;
  });
}

function formatLeadDate(date: Date | null | undefined) {
  if (!date) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

type AdminSubTab = 'content' | 'cities' | 'submissions';
type SubmissionView = 'active' | 'archived';

const SLUGS: CampaignLandingSlug[] = ['strangers-group', 'free-one-on-one'];

export default function CampaignLandingAdminPanel() {
  const [activeSlug, setActiveSlug] = useState<CampaignLandingSlug>('strangers-group');
  const [subTab, setSubTab] = useState<AdminSubTab>('content');
  const meta = CAMPAIGN_LANDING_META[activeSlug];

  const [form, setForm] = useState<CampaignLandingConfig>(
    DEFAULT_CAMPAIGN_LANDING_CONFIG['strangers-group']
  );
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [search, setSearch] = useState('');
  const [submissionView, setSubmissionView] = useState<SubmissionView>('active');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isLoadingLeads, setIsLoadingLeads] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkArchiving, setIsBulkArchiving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      setIsLoadingConfig(false);
      return;
    }
    setIsLoadingConfig(true);
    try {
      const snap = await getDoc(doc(db, meta.configCollection, meta.configDocId));
      setForm(parseCampaignLandingConfig(activeSlug, snap.data() as Record<string, unknown>));
    } catch (error) {
      console.error('Load campaign config:', error);
      toast.error('Failed to load page content.');
      setForm(DEFAULT_CAMPAIGN_LANDING_CONFIG[activeSlug]);
    } finally {
      setIsLoadingConfig(false);
    }
  }, [activeSlug, meta.configCollection, meta.configDocId]);

  const loadLeads = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }
    setIsLoadingLeads(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, meta.leadsCollection), orderBy('createdAt', 'desc'))
      );
      setLeads(mapLeadDocs(snapshot.docs));
      setSelectedIds([]);
    } catch (error: unknown) {
      console.error('Load campaign leads:', error);
      const code = (error as { code?: string })?.code;
      if (code === 'permission-denied') {
        toast.error(`Permission denied. Update Firestore rules for ${meta.leadsCollection}.`);
      } else {
        toast.error('Failed to load submissions.');
      }
    } finally {
      setIsLoadingLeads(false);
    }
  }, [meta.leadsCollection]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (subTab === 'submissions') {
      loadLeads();
    }
  }, [loadLeads, subTab]);

  const handleSave = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      const cities = form.cities
        .map((c) => ({
          ...c,
          name: c.name.trim(),
          instaGroupLink: c.instaGroupLink.trim(),
        }))
        .filter((c) => c.name);

      await setDoc(
        doc(db, meta.configCollection, meta.configDocId),
        {
          ...form,
          cities,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      setForm((prev) => ({ ...prev, cities }));
      toast.success('Saved.');
    } catch (error) {
      console.error('Save campaign config:', error);
      toast.error('Failed to save.');
    } finally {
      setIsSaving(false);
    }
  };

  const activeLeads = useMemo(() => leads.filter((l) => !isLeadArchived(l)), [leads]);
  const archivedLeads = useMemo(() => leads.filter((l) => isLeadArchived(l)), [leads]);

  const filteredLeads = useMemo(() => {
    const pool = submissionView === 'archived' ? archivedLeads : activeLeads;
    const q = search.trim().toLowerCase();
    if (!q) return pool;
    return pool.filter((lead) =>
      [
        lead.name,
        lead.mobile,
        lead.email,
        lead.city,
        lead.instagram,
        lead.contactInfo,
        lead.hobbies,
        lead.gender,
        lead.genderPreference,
        String(lead.age ?? ''),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeLeads, archivedLeads, search, submissionView]);

  const filteredIds = filteredLeads.map((l) => l.id);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.includes(id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
      return;
    }
    setSelectedIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
  };

  const exportCsv = () => {
    if (!isDeveloperAdminSession() || filteredLeads.length === 0) return;
    const headers = ['Submitted at', ...meta.formFields.map((f) => CAMPAIGN_FIELD_LABELS[f])];
    const rows = filteredLeads.map((lead) => [
      formatLeadDate(lead.createdAt),
      ...meta.formFields.map((field) => {
        if (field === 'age') return lead.age != null ? String(lead.age) : '';
        if (field === 'gender') {
          return labelForCampaignGender(lead.gender || 'female');
        }
        if (field === 'genderPreference') {
          return labelForCampaignGenderPreference(lead.genderPreference || '');
        }
        const raw = lead[field as keyof LeadRecord];
        const text =
          typeof raw === 'string' || typeof raw === 'number'
            ? adminLeadText(lead, field, String(raw ?? ''))
            : '';
        return csvText(text);
      }),
    ]);
    downloadCsv(`${activeSlug}-submissions-${csvDateStamp()}.csv`, [headers, ...rows]);
    toast.success(`Exported ${filteredLeads.length} row(s).`);
  };

  const handleDelete = async (lead: LeadRecord) => {
    if (!db) return;
    if (!window.confirm(`Delete submission from ${lead.name || 'this user'}?`)) return;
    setDeletingId(lead.id);
    try {
      await deleteDoc(doc(db, meta.leadsCollection, lead.id));
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelectedIds((prev) => prev.filter((id) => id !== lead.id));
      toast.success('Submission deleted.');
    } catch (error) {
      console.error('Delete campaign lead:', error);
      toast.error('Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!db || selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} submission${count === 1 ? '' : 's'} permanently? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => deleteDoc(doc(db, meta.leadsCollection, id)))
      );
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      toast.success(`${count} submission${count === 1 ? '' : 's'} deleted.`);
    } catch (error) {
      console.error('Bulk delete campaign leads:', error);
      toast.error('Failed to delete selected submissions.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  const handleBulkArchive = async () => {
    if (!db || selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Archive ${count} submission${count === 1 ? '' : 's'}? They will move to Archived.`
      )
    ) {
      return;
    }
    setIsBulkArchiving(true);
    const archivedAt = Timestamp.now();
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateDoc(doc(db, meta.leadsCollection, id), {
            status: 'archived',
            archivedAt,
          })
        )
      );
      setLeads((prev) =>
        prev.map((l) =>
          selectedIds.includes(l.id)
            ? { ...l, status: 'archived', archivedAt: archivedAt.toDate() }
            : l
        )
      );
      setSelectedIds([]);
      toast.success(`${count} submission${count === 1 ? '' : 's'} archived.`);
    } catch (error) {
      console.error('Bulk archive campaign leads:', error);
      toast.error('Failed to archive selected submissions.');
    } finally {
      setIsBulkArchiving(false);
    }
  };

  const setField = <K extends keyof CampaignLandingConfig>(key: K, value: CampaignLandingConfig[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateCity = (index: number, patch: Partial<CampaignCityOption>) => {
    setForm((prev) => {
      const cities = [...prev.cities];
      cities[index] = { ...cities[index], ...patch };
      return { ...prev, cities };
    });
  };

  const addCity = () => {
    setForm((prev) => ({
      ...prev,
      cities: [
        ...prev.cities,
        { id: `city-${Date.now()}`, name: '', instaGroupLink: '' },
      ],
    }));
  };

  const removeCity = (index: number) => {
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.filter((_, i) => i !== index),
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="space-y-6"
    >
      <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <FileText className="w-7 h-7 text-primary-400" />
          Campaign form pages
        </h2>
        <p className="text-gray-400 mb-6">
          Hidden signup links (not in site navigation). Edit copy and view submissions below.
        </p>

        <div className="flex flex-wrap gap-2 mb-6">
          {SLUGS.map((slug) => {
            const item = CAMPAIGN_LANDING_META[slug];
            const isActive = activeSlug === slug;
            return (
              <button
                key={slug}
                type="button"
                onClick={() => {
                  setActiveSlug(slug);
                  setSubTab('content');
                  setSearch('');
                  setSubmissionView('active');
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                    : 'bg-dark-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                }`}
              >
                {item.adminTitle}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-dark-700/50 rounded-xl border border-gray-600">
          <span className="text-sm text-gray-400">Public URL:</span>
          <a
            href={meta.path}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-300 text-sm font-medium inline-flex items-center gap-1"
          >
            {meta.path}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
          <button
            type="button"
            onClick={() => setSubTab('content')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              subTab === 'content'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Page content
          </button>
          {activeSlug === 'strangers-group' && (
            <button
              type="button"
              onClick={() => setSubTab('cities')}
              className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                subTab === 'cities'
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Cities &amp; Insta links
            </button>
          )}
          <button
            type="button"
            onClick={() => setSubTab('submissions')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              subTab === 'submissions'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <User className="w-4 h-4" />
            Submissions
          </button>
        </div>

        {subTab === 'content' && (
          <>
            {isLoadingConfig ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto" />
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                <label className="flex items-center gap-3 text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.pageEnabled}
                    onChange={(e) => setField('pageEnabled', e.target.checked)}
                    className="rounded border-gray-600 bg-dark-700 text-primary-500"
                  />
                  Form open (accept submissions)
                </label>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Promo / event copy (shown above the form)
                  </label>
                  <textarea
                    value={form.promoText}
                    onChange={(e) => setField('promoText', e.target.value)}
                    rows={16}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Text above form fields (optional)
                  </label>
                  <input
                    type="text"
                    value={form.formIntro}
                    onChange={(e) => setField('formIntro', e.target.value)}
                    className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                  />
                </div>

                {activeSlug !== 'strangers-group' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Urgency line (optional, e.g. slots left)
                    </label>
                    <input
                      type="text"
                      value={form.urgencyText}
                      onChange={(e) => setField('urgencyText', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                )}

                {activeSlug === 'free-one-on-one' && (
                  <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Message after enrollment (success popup)
                    </label>
                    <textarea
                      value={form.enrollmentSuccessMessage}
                      onChange={(e) => setField('enrollmentSuccessMessage', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                      placeholder="Thank you for your enrollment! Our team will contact you shortly."
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Query phone
                      </label>
                      <input
                        type="text"
                        value={form.queryPhone}
                        onChange={(e) => setField('queryPhone', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Complaints phone
                      </label>
                      <input
                        type="text"
                        value={form.complaintPhone}
                        onChange={(e) => setField('complaintPhone', e.target.value)}
                        className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      />
                    </div>
                  </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save page content
                </button>
              </div>
            )}
          </>
        )}

        {subTab === 'cities' && activeSlug === 'strangers-group' && (
          <>
            {isLoadingConfig ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-400 mx-auto" />
              </div>
            ) : (
              <div className="space-y-6 max-w-3xl">
                <p className="text-gray-400 text-sm">
                  Cities listed here appear in the enrollment dropdown. Each city needs its own
                  Instagram group link—the link is shown in the thank-you popup after someone
                  submits.
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Query phone (shown above form)
                    </label>
                    <input
                      type="text"
                      value={form.queryPhone}
                      onChange={(e) => setField('queryPhone', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="7568861945"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Complaints phone (shown above form)
                    </label>
                    <input
                      type="text"
                      value={form.complaintPhone}
                      onChange={(e) => setField('complaintPhone', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="7901751593"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      WhatsApp (enquiries on success popup)
                    </label>
                    <input
                      type="text"
                      value={form.enrollmentWhatsapp}
                      onChange={(e) => setField('enrollmentWhatsapp', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder="7901751593"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Unigather Instagram URL
                    </label>
                    <input
                      type="url"
                      value={form.unigatherInstagramUrl}
                      onChange={(e) => setField('unigatherInstagramUrl', e.target.value)}
                      className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                      placeholder={UNIGATHER_INSTAGRAM_URL}
                    />
                  </div>
                </div>

                {form.cities.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-600 bg-dark-700/30 p-6 text-center">
                    <p className="text-gray-400 text-sm">
                      No cities yet — the public form dropdown stays empty until you add cities here
                      and save.
                    </p>
                  </div>
                ) : null}

                <div className="space-y-3">
                  {form.cities.map((city, index) => (
                    <div
                      key={city.id}
                      className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] items-end p-4 bg-dark-700/60 border border-gray-600 rounded-xl"
                    >
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">City name</label>
                        <input
                          type="text"
                          value={city.name}
                          onChange={(e) => updateCity(index, { name: e.target.value })}
                          className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                          placeholder="Ludhiana"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">
                          Instagram group link
                        </label>
                        <input
                          type="url"
                          value={city.instaGroupLink}
                          onChange={(e) => updateCity(index, { instaGroupLink: e.target.value })}
                          className="w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:border-primary-500"
                          placeholder="https://instagram.com/..."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeCity(index)}
                        className="px-3 py-2 text-red-300 hover:bg-red-500/10 border border-red-500/25 rounded-lg text-sm flex items-center gap-1 justify-center sm:mb-0"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addCity}
                  className="px-4 py-2 border border-dashed border-gray-500 rounded-lg text-gray-300 hover:border-primary-500/50 hover:text-primary-300 flex items-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add city
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-primary-500 hover:bg-primary-600 rounded-lg font-semibold text-white flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  Save cities &amp; links
                </button>
              </div>
            )}
          </>
        )}

        {subTab === 'submissions' && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              <button
                type="button"
                onClick={() => {
                  setSubmissionView('active');
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  submissionView === 'active'
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                    : 'bg-dark-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                }`}
              >
                Active ({activeLeads.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setSubmissionView('archived');
                  setSelectedIds([]);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                  submissionView === 'archived'
                    ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                    : 'bg-dark-700 text-gray-400 border border-gray-600 hover:text-gray-200'
                }`}
              >
                <Archive className="w-4 h-4" />
                Archived ({archivedLeads.length})
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search submissions…"
                  className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white w-full focus:outline-none focus:border-primary-500"
                />
              </div>
              <div className="flex gap-2">
                {isDeveloperAdminSession() && (
                  <button
                    type="button"
                    onClick={exportCsv}
                    disabled={isLoadingLeads || filteredLeads.length === 0}
                    className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 flex items-center gap-2 disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => loadLeads()}
                  disabled={isLoadingLeads}
                  className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoadingLeads ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Refresh
                </button>
              </div>
            </div>

            {isLoadingLeads && leads.length === 0 ? (
              <div className="text-center py-12">
                <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-400">Loading submissions…</p>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12 bg-dark-700/40 rounded-xl border border-gray-700">
                <p className="text-gray-400">
                  {submissionView === 'archived'
                    ? 'No archived submissions for this form.'
                    : 'No active submissions for this form.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-500">
                  Submissions are shown in English. Original language is stored on each record.
                </p>

                <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-dark-700/50 rounded-xl border border-gray-600">
                  <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none text-sm">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      disabled={isBulkDeleting || isBulkArchiving}
                      className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500/30"
                    />
                    Select all ({filteredLeads.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {submissionView === 'active' && selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkArchive}
                        disabled={isBulkArchiving || isBulkDeleting}
                        className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-200 hover:bg-amber-500/20 text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {isBulkArchiving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                        Archive selected ({selectedIds.length})
                      </button>
                    )}
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={isBulkDeleting || isBulkArchiving}
                        className="px-4 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 hover:bg-red-500/20 text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {isBulkDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete selected ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>

                {filteredLeads.map((lead) => (
                  <article
                    key={lead.id}
                    className="bg-dark-700/60 rounded-xl border border-gray-600 p-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(lead.id)}
                        onChange={() => toggleSelect(lead.id)}
                        disabled={isBulkDeleting || isBulkArchiving || deletingId === lead.id}
                        className="mt-1 rounded border-gray-600 bg-dark-700 text-primary-500 shrink-0"
                      />
                      <div className="space-y-1 text-sm text-gray-300 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white">
                            {adminLeadText(lead, 'name', lead.name || 'Unknown')}
                          </h3>
                          {lead.preferredLanguage && lead.preferredLanguage !== 'en' ? (
                            <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded bg-dark-600 text-gray-400 border border-gray-500">
                              lang: {lead.preferredLanguage}
                            </span>
                          ) : null}
                        </div>
                        {meta.formFields.map((field) => {
                          if (field === 'name') return null;
                          let value: string;
                          if (field === 'age') value = lead.age != null ? String(lead.age) : '—';
                          else if (field === 'gender') {
                            value = labelForCampaignGender(lead.gender || 'female');
                          } else if (field === 'genderPreference') {
                            value = labelForCampaignGenderPreference(lead.genderPreference || '') || '—';
                          } else {
                            const raw = String(lead[field as keyof LeadRecord] ?? '—');
                            value =
                              raw === '—'
                                ? raw
                                : adminLeadText(lead, field, raw);
                          }
                          return (
                            <p key={field}>
                              <span className="text-gray-500">{CAMPAIGN_FIELD_LABELS[field]}:</span>{' '}
                              {value}
                            </p>
                          );
                        })}
                        {activeSlug === 'strangers-group' && lead.cityInstaGroupLink ? (
                          <p className="text-primary-300/90 break-all">
                            <span className="text-gray-500">Group link:</span>{' '}
                            <a
                              href={lead.cityInstaGroupLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline hover:text-primary-200"
                            >
                              {lead.cityInstaGroupLink}
                            </a>
                          </p>
                        ) : null}
                        <p className="text-gray-500 pt-1">
                          Submitted: {formatLeadDate(lead.createdAt)}
                          {submissionView === 'archived' && lead.archivedAt ? (
                            <> · Archived: {formatLeadDate(lead.archivedAt)}</>
                          ) : null}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(lead)}
                        disabled={deletingId === lead.id}
                        className="shrink-0 h-fit px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 hover:bg-red-500/20 text-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {deletingId === lead.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}
