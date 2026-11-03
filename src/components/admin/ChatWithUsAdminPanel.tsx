'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Instagram, Loader2, MessageCircle, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import {
  CHAT_WITH_US_CONFIG_COLLECTION,
  CHAT_WITH_US_CONFIG_DOC_ID,
  DEFAULT_CHAT_WITH_US_CONFIG,
  isAllowedRedirectUrl,
  parseChatWithUsConfig,
  type ChatWithUsConfig,
} from '@/types/chat-with-us-config';

export default function ChatWithUsAdminPanel() {
  const [form, setForm] = useState<ChatWithUsConfig>(DEFAULT_CHAT_WITH_US_CONFIG);
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
        doc(db, CHAT_WITH_US_CONFIG_COLLECTION, CHAT_WITH_US_CONFIG_DOC_ID)
      );
      setForm(parseChatWithUsConfig(snap.data() as Record<string, unknown> | undefined));
    } catch (error) {
      console.error('Load Chat with us config:', error);
      toast.error('Failed to load Chat with us settings.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    if (!db) return;

    const instagramUrl = form.instagramUrl.trim();
    const whatsappUrl = form.whatsappUrl.trim();

    if (!instagramUrl || !whatsappUrl) {
      toast.error('Enter both Instagram and WhatsApp redirect URLs.');
      return;
    }
    if (!isAllowedRedirectUrl(instagramUrl)) {
      toast.error('Instagram URL must start with http:// or https://');
      return;
    }
    if (!isAllowedRedirectUrl(whatsappUrl)) {
      toast.error('WhatsApp URL must start with http:// or https://');
      return;
    }

    setIsSaving(true);
    try {
      await setDoc(
        doc(db, CHAT_WITH_US_CONFIG_COLLECTION, CHAT_WITH_US_CONFIG_DOC_ID),
        {
          instagramUrl,
          whatsappUrl,
          updatedAt: Timestamp.now(),
        },
        { merge: true }
      );
      toast.success('Chat with us links saved.');
      await loadConfig();
    } catch (error) {
      console.error('Save Chat with us config:', error);
      toast.error('Failed to save settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400 mr-3" />
        Loading Chat with us settings…
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-dark-800 rounded-2xl border border-gray-700 p-6">
        <div className="flex items-start gap-3 mb-6">
          <MessageCircle className="w-8 h-8 text-primary-400 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-2xl font-bold text-white">Chat with us</h2>
            <p className="text-gray-400 text-sm mt-1 max-w-2xl">
              Set where home → <strong className="text-gray-300">Chat with us</strong> sends people.
              The public page shows two buttons; each opens the URL you save below in a new tab.
            </p>
          </div>
        </div>

        <div className="space-y-8">
          <section className="rounded-xl border border-gray-700/80 bg-dark-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <Instagram className="w-5 h-5 text-pink-400" />
              <h3 className="text-lg font-semibold text-white">Instagram redirect</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Used by <span className="text-gray-400">Chat on Instagram</span> on{' '}
              <code className="text-primary-300/90">/chat-with-us</code>
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">Redirect URL</label>
            <input
              type="url"
              value={form.instagramUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, instagramUrl: e.target.value }))}
              placeholder="https://instagram.com/unigather_india"
              className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </section>

          <section className="rounded-xl border border-gray-700/80 bg-dark-900/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <svg
                className="w-5 h-5 text-green-400"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <h3 className="text-lg font-semibold text-white">WhatsApp redirect</h3>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Used by <span className="text-gray-400">Chat on WhatsApp</span>. Use a full{' '}
              <code className="text-primary-300/90">wa.me</code> or WhatsApp API link.
            </p>
            <label className="block text-sm font-medium text-gray-300 mb-2">Redirect URL</label>
            <input
              type="url"
              value={form.whatsappUrl}
              onChange={(e) => setForm((prev) => ({ ...prev, whatsappUrl: e.target.value }))}
              placeholder="https://wa.me/917901751593"
              className="w-full px-4 py-3 bg-dark-700 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </section>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors"
        >
          {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          Save links
        </button>
      </div>
    </div>
  );
}
