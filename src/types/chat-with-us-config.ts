export const CHAT_WITH_US_CONFIG_COLLECTION = 'chatWithUsConfig';
export const CHAT_WITH_US_CONFIG_DOC_ID = 'default';

export type ChatWithUsConfig = {
  /** Full URL where “Chat on Instagram” opens (profile, DM link, etc.). */
  instagramUrl: string;
  /** Full URL where “Chat on WhatsApp” opens (e.g. https://wa.me/91…). */
  whatsappUrl: string;
};

export const DEFAULT_CHAT_WITH_US_CONFIG: ChatWithUsConfig = {
  instagramUrl: 'https://instagram.com/unigather_india',
  whatsappUrl: 'https://wa.me/917901751593',
};

function normalizeUrl(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

export function parseChatWithUsConfig(
  data: Record<string, unknown> | undefined
): ChatWithUsConfig {
  if (!data) return DEFAULT_CHAT_WITH_US_CONFIG;
  return {
    instagramUrl: normalizeUrl(data.instagramUrl, DEFAULT_CHAT_WITH_US_CONFIG.instagramUrl),
    whatsappUrl: normalizeUrl(data.whatsappUrl, DEFAULT_CHAT_WITH_US_CONFIG.whatsappUrl),
  };
}

export function isAllowedRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}
