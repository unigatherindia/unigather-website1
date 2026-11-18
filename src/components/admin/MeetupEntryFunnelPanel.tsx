'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Loader2, MousePointerClick, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import {
  MEETUP_ENTRY_FUNNEL_COLLECTION,
  ONE_ON_ONE_FUNNEL_DOC_ID,
  STRANGERS_GROUP_FUNNEL_DOC_ID,
  parseMeetupFunnelStats,
  type MeetupFunnelStats,
} from '@/lib/meetup-entry-funnel';
import { ONE_ON_ONE_FEMALE_FAQ_PATH } from '@/constants/one-on-one-meetup-faq';

type FunnelMetric = {
  label: string;
  caption: string;
  value: number;
  /** Tailwind text color class for the icon. */
  accentClassName: string;
};

type FunnelPanelProps = {
  docId: string;
  title: string;
  description: React.ReactNode;
  path: string;
  buildMetrics: (stats: MeetupFunnelStats) => FunnelMetric[];
};

function FunnelPanel({ docId, title, description, path, buildMetrics }: FunnelPanelProps) {
  const [stats, setStats] = useState<MeetupFunnelStats>({
    femaleButtonClicks: 0,
    fillFormClicks: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = useCallback(async () => {
    if (!db) {
      toast.error('Firebase is not initialized.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const snap = await getDoc(doc(db, MEETUP_ENTRY_FUNNEL_COLLECTION, docId));
      setStats(parseMeetupFunnelStats(snap.data() as Record<string, unknown> | undefined));
    } catch (error) {
      console.error('Load meetup funnel stats:', error);
      toast.error('Could not load click counts.');
    } finally {
      setIsLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const metrics = buildMetrics(stats);

  return (
    <div className="rounded-xl border border-primary-500/25 bg-primary-500/5 p-4 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
          <p className="text-sm text-gray-400 max-w-2xl">{description}</p>
          <div className="mt-2 flex flex-wrap gap-3">
            <a
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-400 hover:text-primary-300 text-sm font-medium inline-flex items-center gap-1"
            >
              {path}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
        <button
          type="button"
          onClick={loadStats}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-600 bg-dark-700 text-gray-300 text-sm hover:border-primary-500/40 disabled:opacity-60"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          Refresh
        </button>
      </div>

      <div
        className={`grid grid-cols-1 gap-3 ${metrics.length > 1 ? 'sm:grid-cols-2' : ''}`}
      >
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-gray-700 bg-dark-800/80 p-4"
          >
            <div className="flex items-center gap-2 text-gray-400 text-xs uppercase tracking-wider mb-2">
              <MousePointerClick className={`w-4 h-4 ${metric.accentClassName}`} />
              {metric.label}
            </div>
            <p className="text-3xl font-bold text-white tabular-nums">
              {isLoading ? '—' : metric.value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{metric.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MeetupEntryFunnelPanel() {
  return (
    <FunnelPanel
      docId={ONE_ON_ONE_FUNNEL_DOC_ID}
      title="Gender entry → one-on-one (Male / Female)"
      description={
        <>
          Male → home. Female → FAQ ({ONE_ON_ONE_FEMALE_FAQ_PATH}), then fill form →{' '}
          <code className="text-primary-300/90">/free-one-on-one-meetup</code>. Not in site
          navigation.
        </>
      }
      path="/meetup-start"
      buildMetrics={(stats) => [
        {
          label: 'Female button clicks',
          caption: 'On /meetup-start → Female',
          value: stats.femaleButtonClicks,
          accentClassName: 'text-primary-400',
        },
        {
          label: 'Fill the form clicks',
          caption: 'FAQ page → Fill the form / Register for Free',
          value: stats.fillFormClicks,
          accentClassName: 'text-emerald-400',
        },
      ]}
    />
  );
}

export function StrangersGroupFunnelPanel() {
  return (
    <FunnelPanel
      docId={STRANGERS_GROUP_FUNNEL_DOC_ID}
      title="Gender entry → strangers group (Male / Female)"
      description={
        <>
          Male → home. Female → Register popup on{' '}
          <code className="text-primary-300/90">/strangers-group-meetup</code>. Female choices are
          counted here instead of being stored as submissions. Not in site navigation.
        </>
      }
      path="/meetup-start-strangers"
      buildMetrics={(stats) => [
        {
          label: 'Female button clicks',
          caption: 'On /meetup-start-strangers → Female',
          value: stats.femaleButtonClicks,
          accentClassName: 'text-primary-400',
        },
      ]}
    />
  );
}
