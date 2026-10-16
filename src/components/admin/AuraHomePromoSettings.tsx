'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
  AURA_HOME_PROMO_CONFIG_COLLECTION,
  AURA_HOME_PROMO_CONFIG_DOC_ID,
  DEFAULT_AURA_HOME_PROMO_CONFIG,
  parseAuraHomePromoConfig,
  type AuraHomePromoConfig,
} from '@/types/aura-promo-config';

export default function AuraHomePromoSettings() {
  const [form, setForm] = useState<AuraHomePromoConfig>(DEFAULT_AURA_HOME_PROMO_CONFIG);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadConfig = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await getDoc(
        doc(db, AURA_HOME_PROMO_CONFIG_COLLECTION, AURA_HOME_PROMO_CONFIG_DOC_ID)
      );
      setForm(parseAuraHomePromoConfig(snap.data()));
    } catch (error) {
      console.error('Load Aura home promo config:', error);
      toast.error('Failed to load home popup settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!db) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(db, AURA_HOME_PROMO_CONFIG_COLLECTION, AURA_HOME_PROMO_CONFIG_DOC_ID),
        {
          ...form,
          ctaLabel: form.ctaLabel.trim() || DEFAULT_AURA_HOME_PROMO_CONFIG.ctaLabel,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      toast.success('Home Aura popup settings saved.');
      await loadConfig();
    } catch (error) {
      console.error('Save Aura home promo config:', error);
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass =
    'w-full px-3 py-2 bg-dark-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-primary-500';

  if (isLoading) {
    return (
      <div className="py-12 text-center">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin mx-auto mb-3" />
        <p className="text-gray-400">Loading home popup settings…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-dark-800 rounded-2xl border border-gray-700 p-5 sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-white">Home page Aura popup</h2>
        <p className="text-sm text-gray-500 mt-1 max-w-2xl">
          Controls the poster that appears on unigather.co.in home after a short delay (once per
          browser tab). Changes apply immediately after you save.
        </p>
      </div>

      <div className="space-y-4 p-4 rounded-xl bg-dark-700/50 border border-gray-600">
        <label className="flex items-start gap-3 text-gray-200 cursor-pointer">
          <input
            type="checkbox"
            checked={form.popupEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, popupEnabled: e.target.checked }))}
            className="mt-1 rounded border-gray-600"
          />
          <span>
            <span className="font-medium block">Show popup on home page</span>
            <span className="text-sm text-gray-500">
              When off, visitors never see the Aura poster modal on the home page.
            </span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 cursor-pointer ${
            form.popupEnabled ? 'text-gray-200' : 'text-gray-500 pointer-events-none opacity-60'
          }`}
        >
          <input
            type="checkbox"
            checked={form.ctaEnabled}
            disabled={!form.popupEnabled}
            onChange={(e) => setForm((prev) => ({ ...prev, ctaEnabled: e.target.checked }))}
            className="mt-1 rounded border-gray-600"
          />
          <span>
            <span className="font-medium block">Enable “Tap to explore” button</span>
            <span className="text-sm text-gray-500">
              When off, the poster still shows (if popup is on) but tapping does not go to Buy Your
              Aura — only the close button works.
            </span>
          </span>
        </label>
      </div>

      <div className={form.popupEnabled && form.ctaEnabled ? '' : 'opacity-60 pointer-events-none'}>
        <label className="text-sm text-gray-400 mb-1 block">CTA text (bottom of popup)</label>
        <input
          className={inputClass}
          value={form.ctaLabel}
          onChange={(e) => setForm((prev) => ({ ...prev, ctaLabel: e.target.value }))}
          placeholder={DEFAULT_AURA_HOME_PROMO_CONFIG.ctaLabel}
        />
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isSaving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium disabled:opacity-50"
      >
        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save settings
      </button>
    </div>
  );
}
