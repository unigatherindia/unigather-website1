import { campaignLocaleToApiLang, type CampaignLocale } from '@/lib/campaign-i18n/languages';

const CHUNK_SIZE = 450;

function chunkText(text: string): string[] {
  if (text.length <= CHUNK_SIZE) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > CHUNK_SIZE) {
    let splitAt = rest.lastIndexOf('\n', CHUNK_SIZE);
    if (splitAt < CHUNK_SIZE / 2) splitAt = rest.lastIndexOf(' ', CHUNK_SIZE);
    if (splitAt < CHUNK_SIZE / 2) splitAt = CHUNK_SIZE;
    parts.push(rest.slice(0, splitAt));
    rest = rest.slice(splitAt).trimStart();
  }
  if (rest) parts.push(rest);
  return parts;
}

async function translateWithGoogle(
  texts: string[],
  targetLang: string,
  sourceLang: string
): Promise<string[] | null> {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY?.trim();
  if (!key) return null;

  const url = `https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: texts,
      source: sourceLang,
      target: targetLang,
      format: 'text',
    }),
  });

  if (!response.ok) {
    console.error('Google Translate error:', await response.text());
    return null;
  }

  const data = (await response.json()) as {
    data?: { translations?: { translatedText: string }[] };
  };
  const out = data.data?.translations?.map((t) => t.translatedText);
  return out && out.length === texts.length ? out : null;
}

async function translateWithMyMemory(
  text: string,
  targetLang: string,
  sourceLang: string
): Promise<string> {
  const langpair = `${sourceLang}|${targetLang}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(langpair)}`;
  const response = await fetch(url);
  if (!response.ok) return text;
  const data = (await response.json()) as {
    responseData?: { translatedText?: string };
  };
  const translated = data.responseData?.translatedText?.trim();
  if (!translated || translated.toUpperCase() === text.toUpperCase()) return text;
  return translated;
}

async function translateLongText(
  text: string,
  targetLang: string,
  sourceLang: string
): Promise<string> {
  const chunks = chunkText(text);
  const parts = await Promise.all(
    chunks.map((chunk) => translateWithMyMemory(chunk, targetLang, sourceLang))
  );
  return parts.join(chunks.length > 1 ? '\n' : '');
}

export async function translateTexts(
  texts: string[],
  targetLocale: CampaignLocale,
  sourceLocale: CampaignLocale = 'en'
): Promise<string[]> {
  if (targetLocale === sourceLocale) return texts;

  const targetLang = campaignLocaleToApiLang(targetLocale);
  const sourceLang = campaignLocaleToApiLang(sourceLocale);

  const google = await translateWithGoogle(texts, targetLang, sourceLang);
  if (google) return google;

  return Promise.all(texts.map((text) => translateLongText(text, targetLang, sourceLang)));
}

export async function translateText(
  text: string,
  targetLocale: CampaignLocale,
  sourceLocale: CampaignLocale = 'en'
): Promise<string> {
  const [out] = await translateTexts([text], targetLocale, sourceLocale);
  return out ?? text;
}
