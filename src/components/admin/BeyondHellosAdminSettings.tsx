'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';
import { formatEventPrice, getCurrencyLabel } from '@/lib/formatPrice';
import { isTicketPriceListed } from '@/lib/ticket-price-utils';
import {
  BEYOND_HELLOS_CONFIG_COLLECTION,
  BEYOND_HELLOS_CONFIG_DOC_ID,
  BEYOND_HELLOS_SUBSCRIPTION_PLANS,
  DEFAULT_BEYOND_HELLOS_CONFIG,
  parseBeyondHellosOffer,
  type BeyondHellosConfig,
  type BeyondHellosOffer,
} from '@/types/beyond-hellos';

function cloneConfig(config: BeyondHellosConfig): BeyondHellosConfig {
  return {
    ...config,
    price: { ...config.price },
    subscriptionPrices: { ...config.subscriptionPrices },
    highlights: [...config.highlights],
  };
}

function subscriptionSummary(offer: BeyondHellosConfig) {
  return BEYOND_HELLOS_SUBSCRIPTION_PLANS.map(
    (plan) => `${plan.label} ${formatEventPrice(offer.subscriptionPrices[plan.key], offer.currency)}`
  ).join(' · ');
}

function countryLabel(code: string) {
  const country = getCountryByCode(code);
  return country ? `${country.name} (${country.currency})` : code;
}

export default function BeyondHellosAdminSettings() {
  const [offers, setOffers] = useState<BeyondHellosOffer[]>([]);
  const [editingId, setEditingId] = useState<string | null>(BEYOND_HELLOS_CONFIG_DOC_ID);
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState<BeyondHellosConfig>(DEFAULT_BEYOND_HELLOS_CONFIG);
  const [highlightsText, setHighlightsText] = useState(
    DEFAULT_BEYOND_HELLOS_CONFIG.highlights.join('\n')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const applyOfferToForm = (offer: BeyondHellosOffer | BeyondHellosConfig) => {
    const next = cloneConfig(offer);
    setForm(next);
    setHighlightsText(next.highlights.join('\n'));
    setCoverImageFile(null);
  };

  const loadOffers = useCallback(async (selectId?: string | null) => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await getDocs(collection(db, BEYOND_HELLOS_CONFIG_COLLECTION));
      const loaded = snap.docs.map((item) => parseBeyondHellosOffer(item.id, item.data()));
      loaded.sort((a, b) => {
        if (a.id === BEYOND_HELLOS_CONFIG_DOC_ID) return -1;
        if (b.id === BEYOND_HELLOS_CONFIG_DOC_ID) return 1;
        return a.title.localeCompare(b.title);
      });
      setOffers(loaded);

      if (loaded.length === 0) {
        setIsCreating(false);
        setEditingId(BEYOND_HELLOS_CONFIG_DOC_ID);
        applyOfferToForm(DEFAULT_BEYOND_HELLOS_CONFIG);
        return;
      }

      const selected =
        (selectId ? loaded.find((item) => item.id === selectId) : undefined) ?? loaded[0];
      setIsCreating(false);
      setEditingId(selected.id);
      applyOfferToForm(selected);
    } catch (error) {
      console.error("Load Beyond Hello's config:", error);
      toast.error('Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

  const setField = <K extends keyof BeyondHellosConfig>(key: K, value: BeyondHellosConfig[K]) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'countryCode') {
        const country = getCountryByCode(String(value));
        if (country) next.currency = country.currency;
      }
      return next;
    });
  };

  const startNewCard = () => {
    const source = offers[0] ? cloneConfig(offers[0]) : cloneConfig(DEFAULT_BEYOND_HELLOS_CONFIG);
    setIsCreating(true);
    setEditingId(null);
    applyOfferToForm(source);
    toast('Pick the country, then save to add a new card on /one-on-one-meetup.');
  };

  const selectOffer = (offer: BeyondHellosOffer) => {
    setIsCreating(false);
    setEditingId(offer.id);
    applyOfferToForm(offer);
  };

  const uploadCoverImage = async (file: File): Promise<string> => {
    setIsUploadingCover(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body: fd });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }
      const url = result.data?.secure_url || result.data?.url;
      if (!url || typeof url !== 'string') {
        throw new Error('Upload did not return an image URL');
      }
      return url;
    } finally {
      setIsUploadingCover(false);
    }
  };

  const handleSave = async () => {
    if (!db) return;
    const male = String(form.price.male).trim();
    const female = String(form.price.female).trim();
    const week1 = String(form.subscriptionPrices.week1).trim();
    const week2 = String(form.subscriptionPrices.week2).trim();
    const week4 = String(form.subscriptionPrices.week4).trim();
    if (form.subscriptionEnabled) {
      const hasPlan = [week1, week2, week4].some((price) => isTicketPriceListed(price));
      if (!hasPlan) {
        toast.error('Enter a price for at least one plan: 1 week, 2 weeks, or 4 weeks.');
        return;
      }
    } else if (!male || !female) {
      toast.error('Enter Male and Female prices (number, N/A, or any text).');
      return;
    }
    const highlights = highlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const country = getCountryByCode(form.countryCode);

    setIsSaving(true);
    try {
      let imageUrl = form.image.trim();
      if (coverImageFile) {
        imageUrl = await uploadCoverImage(coverImageFile);
      }

      const payload = {
        ...form,
        image: imageUrl,
        country: country?.name ?? '',
        currency: country?.currency ?? form.currency,
        price: { male: male || 'N/A', female: female || 'N/A' },
        priceMale: male || 'N/A',
        priceFemale: female || 'N/A',
        subscriptionEnabled: form.subscriptionEnabled,
        subscriptionPrices: { week1, week2, week4 },
        subscriptionPriceWeek1: week1,
        subscriptionPriceWeek2: week2,
        subscriptionPriceWeek4: week4,
        highlights: highlights.length > 0 ? highlights : DEFAULT_BEYOND_HELLOS_CONFIG.highlights,
        updatedAt: Timestamp.now(),
      };

      let savedId = editingId;
      if (isCreating || !savedId) {
        const ref = await addDoc(collection(db, BEYOND_HELLOS_CONFIG_COLLECTION), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        savedId = ref.id;
        toast.success('New 1 on 1 Meetup card added.');
      } else {
        await setDoc(doc(db, BEYOND_HELLOS_CONFIG_COLLECTION, savedId), payload, { merge: true });
        toast.success('1 on 1 Meetup card saved.');
      }
      setCoverImageFile(null);
      await loadOffers(savedId);
    } catch (error) {
      console.error("Save Beyond Hello's config:", error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (offer: BeyondHellosOffer) => {
    if (!db) return;
    if (
      !window.confirm(
        `Delete the ${countryLabel(offer.countryCode)} card “${offer.title}”? It will disappear from /one-on-one-meetup.`
      )
    ) {
      return;
    }
    setDeletingId(offer.id);
    try {
      await deleteDoc(doc(db, BEYOND_HELLOS_CONFIG_COLLECTION, offer.id));
      toast.success('Card deleted.');
      const remaining = offers.filter((item) => item.id !== offer.id);
      await loadOffers(remaining[0]?.id ?? null);
    } catch (error) {
      console.error("Delete Beyond Hello's card:", error);
      toast.error('Failed to delete card.');
    } finally {
      setDeletingId(null);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500';

  const currencyLabel = getCurrencyLabel(form.currency);
  const editorTitle = isCreating
    ? 'New country card'
    : editingId
      ? `Editing: ${form.title}`
      : 'Card details';

  if (isLoading && offers.length === 0) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-600 bg-dark-700/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-white font-semibold">Country cards</h3>
            <p className="text-sm text-gray-400">
              Add one card per country, the same way events work. Each card has its own prices and
              currency on /one-on-one-meetup.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewCard}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add card for another country
          </button>
        </div>

        {offers.length === 0 ? (
          <p className="text-sm text-gray-500">
            No cards saved yet. Fill in the form below and save to create the first one.
          </p>
        ) : (
          <div className="space-y-2">
            {offers.map((offer) => {
              const selected = !isCreating && editingId === offer.id;
              return (
                <div
                  key={offer.id}
                  className={`flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border px-3 py-3 ${
                    selected
                      ? 'border-primary-500/50 bg-primary-500/10'
                      : 'border-gray-700 bg-dark-800/70'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => selectOffer(offer)}
                    className="flex-1 text-left min-w-0"
                  >
                    <p className="text-white font-medium truncate">{offer.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {countryLabel(offer.countryCode)} ·{' '}
                      {offer.subscriptionEnabled
                        ? `Subscription · ${subscriptionSummary(offer)}`
                        : `Male ${formatEventPrice(offer.price.male, offer.currency)} · Female ${formatEventPrice(offer.price.female, offer.currency)}`}
                      {!offer.enabled ? ' · bookings off' : ''}
                    </p>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => selectOffer(offer)}
                      className="p-2 rounded-lg bg-primary-500/20 border border-primary-500/30 text-primary-300 hover:bg-primary-500/30"
                      title="Edit card"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(offer)}
                      disabled={deletingId === offer.id}
                      className="p-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 disabled:opacity-50"
                      title="Delete card"
                    >
                      {deletingId === offer.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-white font-semibold">{editorTitle}</h3>
        {isCreating ? (
          <span className="text-xs px-2 py-1 rounded-full bg-primary-500/15 text-primary-300 border border-primary-500/30">
            New card
          </span>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-700/50 border border-gray-600">
        <div>
          <p className="text-gray-400 text-sm">Public price preview</p>
          {form.subscriptionEnabled ? (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              {BEYOND_HELLOS_SUBSCRIPTION_PLANS.map((plan) => (
                <p key={plan.key} className="text-lg font-bold text-primary-300">
                  {plan.label} {formatEventPrice(form.subscriptionPrices[plan.key], form.currency) || '—'}
                </p>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <p className="text-lg font-bold text-blue-300">
                Male {formatEventPrice(form.price.male, form.currency)}
              </p>
              <p className="text-lg font-bold text-pink-300">
                Female {formatEventPrice(form.price.female, form.currency)}
              </p>
            </div>
          )}
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(e) => setField('enabled', e.target.checked)}
              className="rounded border-gray-600"
            />
            Accept bookings on site
          </label>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Price (Male) ({currencyLabel}, N/A, or any text) *
          </label>
          <input
            type="text"
            className={inputClass}
            value={form.price.male}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                price: { ...prev.price, male: e.target.value },
              }))
            }
            placeholder="899, N/A, Sold Out, Contact for pricing"
          />
          <p className="mt-1 text-xs text-gray-500">
            Number for online pay; any other text shows on the card (like events).
            {form.subscriptionEnabled ? ' Hidden while subscription pricing is on.' : ''}
          </p>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">
            Price (Female) ({currencyLabel}, N/A, or any text) *
          </label>
          <input
            type="text"
            className={inputClass}
            value={form.price.female}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                price: { ...prev.price, female: e.target.value },
              }))
            }
            placeholder="799, N/A, Sold Out, Contact for pricing"
          />
        </div>
        <div className="md:col-span-2 rounded-xl border border-gray-600 bg-dark-800/60 p-4 space-y-4">
          <label className="flex items-start gap-2 text-gray-200 cursor-pointer">
            <input
              type="checkbox"
              checked={form.subscriptionEnabled}
              onChange={(e) => setField('subscriptionEnabled', e.target.checked)}
              className="mt-1 rounded border-gray-600"
            />
            <span>
              <span className="block font-medium">Use subscription pricing</span>
              <span className="block text-sm text-gray-400 mt-1">
                When this is on, the user picks 1 week, 2 weeks, or 4 weeks and pays that plan&apos;s
                price. Turn it off to keep the one-time male and female price.
              </span>
            </span>
          </label>
          {form.subscriptionEnabled ? (
            <div className="grid sm:grid-cols-3 gap-4">
              {BEYOND_HELLOS_SUBSCRIPTION_PLANS.map((plan) => (
                <div key={plan.key}>
                  <label className="text-sm text-gray-400 mb-1 block">
                    {plan.label} ({currencyLabel})
                  </label>
                  <input
                    type="text"
                    className={inputClass}
                    value={form.subscriptionPrices[plan.key]}
                    onChange={(e) => {
                      const key = plan.key;
                      setForm((prev) => ({
                        ...prev,
                        subscriptionPrices: {
                          ...prev.subscriptionPrices,
                          [key]: e.target.value,
                        },
                      }));
                    }}
                    placeholder="1499, N/A, Sold Out"
                  />
                </div>
              ))}
              <p className="sm:col-span-3 text-xs text-gray-500">
                Leave a plan blank or N/A to hide it. A number is paid online. Other text is shown
                and collected without online payment.
              </p>
            </div>
          ) : null}
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Country / currency</label>
          <select
            className={inputClass}
            value={form.countryCode}
            onChange={(e) => setField('countryCode', e.target.value)}
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.currency})
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">Card title</label>
          <input
            className={inputClass}
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">Description (event card)</label>
          <textarea
            rows={5}
            className={inputClass}
            value={form.description}
            onChange={(e) => setField('description', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Category</label>
          <input
            className={inputClass}
            value={form.category}
            onChange={(e) => setField('category', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Difficulty</label>
          <select
            className={inputClass}
            value={form.difficulty}
            onChange={(e) =>
              setField('difficulty', e.target.value as BeyondHellosConfig['difficulty'])
            }
          >
            <option value="Easy">Easy</option>
            <option value="Moderate">Moderate</option>
            <option value="Challenging">Challenging</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Schedule note</label>
          <input
            className={inputClass}
            value={form.scheduleNote}
            onChange={(e) => setField('scheduleNote', e.target.value)}
          />
        </div>
        <div>
          <label className="text-sm text-gray-400 mb-1 block">Duration / time</label>
          <input
            className={inputClass}
            value={form.duration}
            onChange={(e) => setField('duration', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">Location label</label>
          <input
            className={inputClass}
            value={form.locationLabel}
            onChange={(e) => setField('locationLabel', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">
            Group line (people icon on card)
          </label>
          <input
            className={inputClass}
            value={form.groupLabel}
            onChange={(e) => setField('groupLabel', e.target.value)}
            placeholder="You + match + Unigather host"
          />
        </div>
        <div className="md:col-span-2 space-y-3">
          <label className="text-sm text-gray-400 mb-1 block">Cover image (event card)</label>
          <label className="flex flex-col items-center justify-center w-full min-h-[120px] border-2 border-dashed border-gray-600 rounded-xl cursor-pointer bg-dark-700/50 hover:border-primary-500/50 transition-colors px-4 py-6">
            <span className="text-sm text-gray-400 text-center">
              {isUploadingCover ? 'Uploading…' : 'Click to upload image (PNG, JPG)'}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploadingCover || isSaving}
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setCoverImageFile(file);
                e.target.value = '';
              }}
            />
          </label>
          {coverImageFile && (
            <p className="text-xs text-primary-400 truncate">Selected: {coverImageFile.name}</p>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Or paste image URL</label>
            <input
              className={inputClass}
              value={form.image}
              onChange={(e) => {
                setCoverImageFile(null);
                setField('image', e.target.value);
              }}
              placeholder="https://..."
              disabled={isUploadingCover || isSaving}
            />
          </div>
          {(coverImageFile || form.image.trim()) && (
            <div className="relative w-full max-w-sm aspect-[16/10] rounded-xl overflow-hidden border border-gray-600 bg-dark-900">
              <Image
                src={coverImageFile ? URL.createObjectURL(coverImageFile) : form.image.trim()}
                alt="Cover preview"
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          )}
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-400 mb-1 block">Highlights (one per line)</label>
          <textarea
            rows={4}
            className={inputClass}
            value={highlightsText}
            onChange={(e) => setHighlightsText(e.target.value)}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving || isUploadingCover}
        className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {isCreating ? 'Add card' : 'Save card'}
      </button>
    </div>
  );
}
