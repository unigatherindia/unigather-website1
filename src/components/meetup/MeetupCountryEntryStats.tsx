'use client';

import React from 'react';
import { CalendarDays, Globe2, Users } from 'lucide-react';
import {
  FEMALE_ENROLLMENT_BASELINE,
  MONTHLY_MEETUP_COUNTRIES,
  MONTHLY_MEETUP_TOTAL_BASELINE,
} from '@/lib/meetup-entry-stats';

type Props = {
  /** Monthly counter added on top of the baseline (0 when not tracked on this page). */
  femaleCount?: number;
};

export default function MeetupCountryEntryStats({ femaleCount = 0 }: Props) {
  return (
    <div className="mx-auto mt-3 w-full max-w-md space-y-3 sm:max-w-lg">
      <div className="flex w-full gap-2.5 sm:gap-3">
        <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-black/35 p-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            <Users className="h-3.5 w-3.5 shrink-0 text-primary-400" aria-hidden />
            Females
          </span>
          <span className="mt-2 block text-2xl font-bold leading-none tracking-tight text-white">
            {FEMALE_ENROLLMENT_BASELINE + femaleCount}
          </span>
          <span className="mt-1.5 block whitespace-nowrap text-[11px] text-gray-500">
            enrolled this month
          </span>
        </div>
        <div className="min-w-0 flex-1 rounded-2xl border border-white/[0.08] bg-black/35 p-3 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:p-4">
          <span className="flex items-center gap-1.5 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-500">
            <CalendarDays className="h-3.5 w-3.5 shrink-0 text-primary-400" aria-hidden />
            Meetups
          </span>
          <span className="mt-2 block text-2xl font-bold leading-none tracking-tight text-white">
            {MONTHLY_MEETUP_TOTAL_BASELINE}
          </span>
          <span className="mt-1.5 block whitespace-nowrap text-[11px] text-gray-500">
            this month
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.08] bg-black/35 p-3.5 backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-500">
          <Globe2 className="h-3.5 w-3.5 shrink-0 text-primary-400" aria-hidden />
          Monthly Meetups Done
        </span>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {MONTHLY_MEETUP_COUNTRIES.map((country) => (
            <span
              key={country.name}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] py-1 pl-2.5 pr-1.5 text-[11px] text-gray-300"
            >
              {country.name}
              <span className="rounded-full bg-primary-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-primary-300">
                {country.count}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
