'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  HeartHandshake,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Settings,
  Trash2,
  User,
} from 'lucide-react';
import BeyondHellosAdminSettings from '@/components/admin/BeyondHellosAdminSettings';
import { ONE_ON_ONE_MEETUP_LABEL } from '@/constants/beyond-hellos-copy';
import { formatEventPrice } from '@/lib/formatPrice';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import {
  GENDER_OPTIONS,
  GENDER_PREFERENCE_OPTIONS,
  ONE_ON_ONE_MEETUP_COLLECTION,
} from '@/constants/meetup-options';

type MeetupLeadRecord = {
  id: string;
  name?: string;
  age?: number;
  contactInfo?: string;
  gender?: string;
  genderPreference?: string;
  city?: string;
  location?: string;
  state?: string;
  hobbies?: string;
  status?: string;
  amountPaid?: number;
  amountQuoted?: number;
  currency?: string;
  bookingId?: string;
  ticketType?: string;
  ticketLabel?: string;
  customerEmail?: string;
  customerPhone?: string;
  createdAt?: Date | null;
};

function mapMeetupLeadDocs(docs: QueryDocumentSnapshot[]): MeetupLeadRecord[] {
  return docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const createdAt =
      data.createdAt?.toDate?.() || (data.createdAt ? new Date(data.createdAt) : null);
    return { id: docSnapshot.id, ...data, createdAt } as MeetupLeadRecord;
  });
}

function labelForGender(value?: string) {
  return GENDER_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '—';
}

function labelForPreference(value?: string) {
  return GENDER_PREFERENCE_OPTIONS.find((o) => o.value === value)?.label ?? value ?? '—';
}

function formatLeadDate(date: Date | null | undefined) {
  if (!date) return '—';
  return date.toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

type AdminSubTab = 'settings' | 'submissions';

export default function OneOnOneMeetupAdminPanel() {
  const [subTab, setSubTab] = useState<AdminSubTab>('settings');
  const [leads, setLeads] = useState<MeetupLeadRecord[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const loadLeads = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      return;
    }
    setIsLoading(true);
    try {
      const snapshot = await getDocs(
        query(collection(db, ONE_ON_ONE_MEETUP_COLLECTION), orderBy('createdAt', 'desc'))
      );
      setLeads(mapMeetupLeadDocs(snapshot.docs));
      setSelectedIds([]);
    } catch (error: unknown) {
      console.error('Error loading one-on-one meetup leads:', error);
      const code = (error as { code?: string })?.code;
      if (code === 'permission-denied') {
        toast.error('Permission denied. Update Firestore rules for oneOnOneMeetupLeads.');
      } else {
        toast.error('Failed to load meetup submissions.');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'submissions') {
      loadLeads();
    }
  }, [loadLeads, subTab]);

  const confirmedLeads = useMemo(() => leads.filter((l) => l.status === 'confirmed'), [leads]);

  const filteredLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((lead) =>
      [
        lead.name,
        lead.contactInfo,
        lead.city,
        lead.location,
        lead.state,
        lead.hobbies,
        lead.gender,
        lead.genderPreference,
        String(lead.age ?? ''),
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [leads, search]);

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

  const handleDelete = async (lead: MeetupLeadRecord) => {
    if (!db) return;
    const label = lead.name?.trim() || 'this submission';
    if (!window.confirm(`Delete ${label} from Beyond Hello's submissions?`)) return;

    setDeletingId(lead.id);
    try {
      await deleteDoc(doc(db, ONE_ON_ONE_MEETUP_COLLECTION, lead.id));
      setLeads((prev) => prev.filter((l) => l.id !== lead.id));
      setSelectedIds((prev) => prev.filter((id) => id !== lead.id));
      toast.success('Submission deleted.');
    } catch (error: unknown) {
      console.error('Delete meetup lead error:', error);
      toast.error('Failed to delete submission.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (!db || selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (
      !window.confirm(
        `Delete ${count} meetup submission${count === 1 ? '' : 's'}? This cannot be undone.`
      )
    ) {
      return;
    }
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        selectedIds.map((id) => deleteDoc(doc(db, ONE_ON_ONE_MEETUP_COLLECTION, id)))
      );
      setLeads((prev) => prev.filter((l) => !selectedIds.includes(l.id)));
      setSelectedIds([]);
      toast.success(`${count} submission${count === 1 ? '' : 's'} deleted.`);
    } catch (error: unknown) {
      console.error('Bulk delete meetup leads error:', error);
      toast.error('Failed to delete selected submissions.');
    } finally {
      setIsBulkDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
    >
      <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <HeartHandshake className="w-7 h-7 text-primary-400" />
            {ONE_ON_ONE_MEETUP_LABEL}
          </h2>
          <p className="text-gray-400">
            Event card, pricing, and paid bookings for /one-on-one-meetup
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-700 pb-4">
          <button
            type="button"
            onClick={() => setSubTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              subTab === 'settings'
                ? 'bg-primary-500/20 text-primary-300 border border-primary-500/40'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4" />
            Card &amp; amount
          </button>
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

        {subTab === 'settings' && <BeyondHellosAdminSettings />}

        {subTab === 'submissions' && (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name, city, hobbies…"
                  className="pl-10 pr-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => loadLeads()}
                disabled={isLoading}
                className="px-4 py-2 bg-dark-700 border border-gray-600 rounded-lg text-gray-300 hover:bg-dark-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </button>
            </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
            <div className="text-gray-400 text-sm">Total submissions</div>
            <div className="text-2xl font-bold text-white">{leads.length}</div>
          </div>
          <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
            <div className="text-gray-400 text-sm">Paid / confirmed</div>
            <div className="text-2xl font-bold text-green-400">{confirmedLeads.length}</div>
          </div>
          <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
            <div className="text-gray-400 text-sm">Matching search</div>
            <div className="text-2xl font-bold text-primary-400">{filteredLeads.length}</div>
          </div>
          <div className="bg-dark-700 rounded-xl border border-gray-600 p-4">
            <div className="text-gray-400 text-sm">Selected</div>
            <div className="text-2xl font-bold text-amber-300">{selectedIds.length}</div>
          </div>
        </div>

        {isLoading && leads.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading submissions…</p>
          </div>
        ) : filteredLeads.length === 0 ? (
          <div className="text-center py-12 bg-dark-700/40 rounded-xl border border-gray-700">
            <HeartHandshake className="w-14 h-14 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No submissions yet</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              When someone books {ONE_ON_ONE_MEETUP_LABEL}, their details will show up here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4 p-3 bg-dark-700/50 rounded-xl border border-gray-600">
              <label className="flex items-center gap-2 text-gray-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={isBulkDeleting}
                  className="rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500/30"
                />
                <span>Select all ({filteredLeads.length})</span>
              </label>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  disabled={isBulkDeleting}
                  className="px-4 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 transition-colors flex items-center gap-2 disabled:opacity-50"
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

            <div className="space-y-4">
              {filteredLeads.map((lead) => (
                <article
                  key={lead.id}
                  className="bg-dark-700/60 rounded-xl border border-gray-600 p-5 hover:border-gray-500 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => toggleSelect(lead.id)}
                      disabled={isBulkDeleting || deletingId === lead.id}
                      className="mt-1 rounded border-gray-600 bg-dark-700 text-primary-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <User className="w-5 h-5 text-primary-400 shrink-0" />
                        <h3 className="text-lg font-semibold text-white">{lead.name || 'Unknown'}</h3>
                        {lead.age != null && (
                          <span className="text-sm text-gray-400">· {lead.age} yrs</span>
                        )}
                        {(lead.ticketLabel || lead.gender) && (
                          <>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-dark-600 text-gray-300 border border-gray-500">
                              {lead.ticketLabel || labelForGender(lead.gender)}
                            </span>
                            <span className="text-xs text-gray-500">·</span>
                          </>
                        )}
                        <span className="text-xs text-gray-500">prefers</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/30">
                          {labelForPreference(lead.genderPreference)}
                        </span>
                        {lead.status === 'confirmed' ? (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/15 text-green-300 border border-green-500/30">
                            Paid
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-200 border border-amber-500/25">
                            {lead.status || 'pending'}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-300 mb-3">
                        {lead.bookingId ? (
                          <span className="text-primary-300/90">ID: {lead.bookingId}</span>
                        ) : null}
                        {(lead.amountPaid ?? lead.amountQuoted) != null && (
                          <span className="inline-flex items-center gap-1 text-green-300">
                            <IndianRupee className="w-3.5 h-3.5" />
                            {formatEventPrice(
                              lead.amountPaid ?? lead.amountQuoted ?? 0,
                              lead.currency || 'INR'
                            )}
                          </span>
                        )}
                        {lead.contactInfo ? (
                          <span className="inline-flex items-center gap-1">
                            {lead.contactInfo.includes('@') ? (
                              <Mail className="w-4 h-4 text-gray-500" />
                            ) : (
                              <Phone className="w-4 h-4 text-gray-500" />
                            )}
                            {lead.contactInfo}
                          </span>
                        ) : null}
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          {[lead.city, lead.location, lead.state].filter(Boolean).join(', ') || '—'}
                        </span>
                        <span className="text-gray-500">{formatLeadDate(lead.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-400">
                        <span className="text-gray-500 font-medium">Hobbies: </span>
                        {lead.hobbies?.trim() || '—'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(lead)}
                      disabled={deletingId === lead.id || isBulkDeleting}
                      className="shrink-0 px-3 py-2 bg-red-500/10 border border-red-500/25 rounded-lg text-red-300 hover:bg-red-500/20 text-sm flex items-center gap-2 disabled:opacity-50"
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
          </>
        )}
          </>
        )}
      </div>
    </motion.div>
  );
}
