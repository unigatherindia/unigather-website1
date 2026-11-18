'use client';

import React from 'react';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import {
  MONTHLY_MEETUP_CITY_STATS,
  MONTHLY_MEETUP_TOTAL,
} from '@/lib/meetup-entry-stats';

export default function MeetupEntryStats({
  femaleCount,
}: {
  /** null while the counter is still loading */
  femaleCount: number | null;
}) {
  return (
    <div className="mx-auto mb-3 w-full max-w-md space-y-3 sm:max-w-lg">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <Users className="h-3.5 w-3.5 text-primary-400" aria-hidden />
            Females enrolled
          </p>
          <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-white">
            {femaleCount === null ? '—' : femaleCount}
          </p>
          <p className="mt-1.5 text-[11px] text-gray-500">this month</p>
        </div>

        <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-4 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
            <CalendarDays className="h-3.5 w-3.5 text-primary-400" aria-hidden />
            Meetups
          </p>
          <p className="mt-2 text-2xl font-bold leading-none tracking-tight text-white">
            {MONTHLY_MEETUP_TOTAL}
          </p>
          <p className="mt-1.5 text-[11px] text-gray-500">this month</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          <MapPin className="h-3.5 w-3.5 text-primary-400" aria-hidden />
          Meetups by city
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MONTHLY_MEETUP_CITY_STATS.map(({ city, meetups }) => (
            <span
              key={city}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-2.5 pr-1.5 text-[11px] text-gray-300"
            >
              {city}
              <span className="rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                {meetups}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
