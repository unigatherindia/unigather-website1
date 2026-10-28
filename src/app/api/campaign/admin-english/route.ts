import { NextResponse } from 'next/server';
import { isCampaignLocale } from '@/lib/campaign-i18n/languages';
import { translateText } from '@/lib/campaign-i18n/translate-text';

type Body = {
  locale?: string;
  fields?: Record<string, string>;
};

const TRANSLATABLE_KEYS = ['name', 'hobbies', 'instagram', 'contactInfo', 'city'] as const;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const locale = body.locale;
    const fields = body.fields ?? {};

    if (!locale || !isCampaignLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }

    if (locale === 'en') {
      const adminEnglish: Record<string, string> = {};
      for (const key of TRANSLATABLE_KEYS) {
        const value = fields[key]?.trim();
        if (value) adminEnglish[key] = value;
      }
      return NextResponse.json({ adminEnglish });
    }

    const adminEnglish: Record<string, string> = {};
    await Promise.all(
      TRANSLATABLE_KEYS.map(async (key) => {
        const value = fields[key]?.trim();
        if (!value) return;
        adminEnglish[key] = await translateText(value, 'en', locale);
      })
    );

    return NextResponse.json({ adminEnglish });
  } catch (error) {
    console.error('admin-english:', error);
    return NextResponse.json({ error: 'Normalization failed' }, { status: 500 });
  }
}
