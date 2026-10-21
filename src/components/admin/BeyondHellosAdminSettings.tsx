'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { COUNTRIES, getCountryByCode } from '@/constants/countries';
import { formatEventPrice, getCurrencyLabel } from '@/lib/formatPrice';
import {
  BEYOND_HELLOS_CONFIG_COLLECTION,
  BEYOND_HELLOS_CONFIG_DOC_ID,
  DEFAULT_BEYOND_HELLOS_CONFIG,
  parseBeyondHellosConfig,
  type BeyondHellosConfig,
} from '@/types/beyond-hellos';

export default function BeyondHellosAdminSettings() {
  const [form, setForm] = useState<BeyondHellosConfig>(DEFAULT_BEYOND_HELLOS_CONFIG);
  const [highlightsText, setHighlightsText] = useState(
    DEFAULT_BEYOND_HELLOS_CONFIG.highlights.join('\n')
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [isUploadingCover, setIsUploadingCover] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, BEYOND_HELLOS_CONFIG_COLLECTION, BEYOND_HELLOS_CONFIG_DOC_ID));
      const parsed = parseBeyondHellosConfig(snap.data());
      setForm(parsed);
      setHighlightsText(parsed.highlights.join('\n'));
    } catch (error) {
      console.error('Load Beyond Hello\'s config:', error);
      toast.error('Failed to load settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

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
    if (!male || !female) {
      toast.error('Enter Male and Female prices (number, N/A, or any text).');
      return;
    }
    const highlights = highlightsText
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    setIsSaving(true);
    try {
      let imageUrl = form.image.trim();
      if (coverImageFile) {
        imageUrl = await uploadCoverImage(coverImageFile);
      }

      await setDoc(
        doc(db, BEYOND_HELLOS_CONFIG_COLLECTION, BEYOND_HELLOS_CONFIG_DOC_ID),
        {
          ...form,
          image: imageUrl,
          price: { male, female },
          priceMale: male,
          priceFemale: female,
          highlights: highlights.length > 0 ? highlights : DEFAULT_BEYOND_HELLOS_CONFIG.highlights,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      toast.success('1 on 1 Meetup settings saved.');
      setCoverImageFile(null);
      await loadConfig();
    } catch (error) {
      console.error('Save Beyond Hello\'s config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500';

  const currencyLabel = getCurrencyLabel(form.currency);

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-xl bg-dark-700/50 border border-gray-600">
        <div>
          <p className="text-gray-400 text-sm">Public price preview</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
            <p className="text-lg font-bold text-blue-300">
              Male {formatEventPrice(form.price.male, form.currency)}
            </p>
            <p className="text-lg font-bold text-pink-300">
              Female {formatEventPrice(form.price.female, form.currency)}
            </p>
          </div>
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
                src={
                  coverImageFile ? URL.createObjectURL(coverImageFile) : form.image.trim()
                }
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
        Save settings
      </button>
    </div>
  );
}
