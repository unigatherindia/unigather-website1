import { NextResponse } from 'next/server';
import { isCampaignLocale } from '@/lib/campaign-i18n/languages';
import { translateText } from '@/lib/campaign-i18n/translate-text';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { text?: string; locale?: string };
    const text = typeof body.text === 'string' ? body.text : '';
    const locale = body.locale;
    if (!text.trim()) {
      return NextResponse.json({ text: '' });
    }
    if (!locale || !isCampaignLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }
    if (locale === 'en') {
      return NextResponse.json({ text });
    }

    const translated = await translateText(text, locale, 'en');
    return NextResponse.json({ text: translated });
  } catch (error) {
    console.error('translate-text:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
