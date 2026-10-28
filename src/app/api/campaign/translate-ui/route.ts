import { NextResponse } from 'next/server';
import { isCampaignLocale, type CampaignLocale } from '@/lib/campaign-i18n/languages';
import { buildMessagesFromValues, messagesToValues } from '@/lib/campaign-i18n/messages-index';
import { EN_CAMPAIGN_MESSAGES } from '@/lib/campaign-i18n/messages-en';
import { translateTexts } from '@/lib/campaign-i18n/translate-text';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { locale?: string };
    const locale = body.locale;
    if (!locale || !isCampaignLocale(locale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }
    if (locale === 'en') {
      return NextResponse.json({ messages: EN_CAMPAIGN_MESSAGES });
    }

    const values = messagesToValues(EN_CAMPAIGN_MESSAGES);
    const translated = await translateTexts(values, locale, 'en');
    const messages = buildMessagesFromValues(translated);

    return NextResponse.json({ messages });
  } catch (error) {
    console.error('translate-ui:', error);
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}
