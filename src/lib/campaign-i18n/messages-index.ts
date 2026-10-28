import type { CampaignMessages } from '@/lib/campaign-i18n/messages-types';
import { EN_CAMPAIGN_MESSAGES } from '@/lib/campaign-i18n/messages-en';
import type { CampaignLocale } from '@/lib/campaign-i18n/languages';

export function getEnglishCampaignMessages(): CampaignMessages {
  return EN_CAMPAIGN_MESSAGES;
}

export function campaignMessageKeys(): (keyof CampaignMessages)[] {
  return Object.keys(EN_CAMPAIGN_MESSAGES) as (keyof CampaignMessages)[];
}

export function buildMessagesFromValues(values: string[]): CampaignMessages {
  const keys = campaignMessageKeys();
  const messages = { ...EN_CAMPAIGN_MESSAGES };
  keys.forEach((key, index) => {
    if (values[index]) messages[key] = values[index];
  });
  return messages;
}

export function messagesToValues(messages: CampaignMessages): string[] {
  return campaignMessageKeys().map((key) => messages[key]);
}

export function getCampaignMessages(locale: CampaignLocale): CampaignMessages {
  if (locale === 'en') return EN_CAMPAIGN_MESSAGES;
  return EN_CAMPAIGN_MESSAGES;
}
