export interface AuraProduct {
  id: string;
  title: string;
  subtitle?: string;
  tagline?: string;
  description: string;
  longDescription?: string;
  price: number | string;
  compareAtPrice?: number | string;
  currency?: string;
  volume?: string;
  edition?: string;
  sku?: string;
  image: string;
  highlights?: string[];
  features?: string[];
  occasions?: string[];
  ingredients?: string;
  howToUse?: string;
  promoBanner?: string;
  brandLine?: string;
  maxStock?: number;
  unitsSold?: number;
  featured?: boolean;
  status?: string;
}

export const AURA_OCCASION_LABELS = ['Work', 'Party', 'Date', 'Travel', 'Everyday'] as const;

export interface AuraProductFormState {
  title: string;
  subtitle: string;
  tagline: string;
  brandLine: string;
  description: string;
  longDescription: string;
  price: string;
  compareAtPrice: string;
  volume: string;
  edition: string;
  sku: string;
  highlightsText: string;
  featuresText: string;
  occasionsText: string;
  ingredients: string;
  howToUse: string;
  promoBanner: string;
  maxStock: string;
  imageUrl: string;
  featured: boolean;
}

export function linesToArray(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function arrayToLines(items?: string[]): string {
  if (!items?.length) return '';
  return items.join('\n');
}

export const defaultAuraProductForm = (): AuraProductFormState => ({
  title: 'The Aura',
  subtitle: 'Limited Edition',
  tagline: 'More than a fragrance — it\'s a feeling',
  brandLine: 'unigather Fragrance',
  description:
    'Warm, premium fragrance oil designed for lasting presence. Perfect when you want to be at your best.',
  longDescription:
    'The Aura is a limited-edition 7 ML fragrance oil crafted for modern life — from morning meetings to evening plans. Long-lasting, skin-friendly, and easy to carry.',
  price: '250',
  compareAtPrice: '',
  volume: '7 ML',
  edition: 'Limited Edition',
  sku: 'AURA-7ML-001',
  highlightsText: [
    'Lasts long for 900+ minutes',
    'Premium fragrance',
    '7 ML oil',
    'Any occasion',
  ].join('\n'),
  featuresText: [
    'Alcohol-free oil base',
    'Travel-friendly roll-on friendly size',
    'Unisex scent profile',
  ].join('\n'),
  occasionsText: AURA_OCCASION_LABELS.join(', '),
  ingredients: 'Premium fragrance oil blend. Patch test recommended.',
  howToUse: 'Apply to pulse points — wrists, neck. A little goes a long way.',
  promoBanner: 'Available only for 1 month — Limited Edition',
  maxStock: '500',
  imageUrl: '/media/the-aura-poster.jpg',
  featured: true,
});

export function auraProductToForm(data: Record<string, unknown>): AuraProductFormState {
  const highlights = Array.isArray(data.highlights) ? (data.highlights as string[]) : [];
  const features = Array.isArray(data.features) ? (data.features as string[]) : [];
  const occasions = Array.isArray(data.occasions) ? (data.occasions as string[]) : [];

  return {
    title: typeof data.title === 'string' ? data.title : '',
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : '',
    tagline: typeof data.tagline === 'string' ? data.tagline : '',
    brandLine: typeof data.brandLine === 'string' ? data.brandLine : 'unigather Fragrance',
    description: typeof data.description === 'string' ? data.description : '',
    longDescription: typeof data.longDescription === 'string' ? data.longDescription : '',
    price: data.price != null ? String(data.price) : '',
    compareAtPrice:
      data.compareAtPrice != null && data.compareAtPrice !== ''
        ? String(data.compareAtPrice)
        : '',
    volume: typeof data.volume === 'string' ? data.volume : '7 ML',
    edition: typeof data.edition === 'string' ? data.edition : '',
    sku: typeof data.sku === 'string' ? data.sku : '',
    highlightsText: arrayToLines(highlights),
    featuresText: arrayToLines(features),
    occasionsText: occasions.length ? occasions.join(', ') : AURA_OCCASION_LABELS.join(', '),
    ingredients: typeof data.ingredients === 'string' ? data.ingredients : '',
    howToUse: typeof data.howToUse === 'string' ? data.howToUse : '',
    promoBanner: typeof data.promoBanner === 'string' ? data.promoBanner : '',
    maxStock: data.maxStock != null ? String(data.maxStock) : '',
    imageUrl: typeof data.image === 'string' ? data.image : '',
    featured: Boolean(data.featured),
  };
}

export function formToAuraProductPayload(
  form: AuraProductFormState,
  imageUrl: string,
  currency: string
): Record<string, unknown> {
  const priceTrim = form.price.trim();
  const priceNum = priceTrim ? Number(priceTrim.replace(/[^\d.]/g, '')) : NaN;
  const compareNum = form.compareAtPrice.trim()
    ? Number(form.compareAtPrice.replace(/[^\d.]/g, ''))
    : null;

  const occasions = form.occasionsText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title: form.title.trim(),
    subtitle: form.subtitle.trim(),
    tagline: form.tagline.trim(),
    brandLine: form.brandLine.trim(),
    description: form.description.trim(),
    longDescription: form.longDescription.trim(),
    price:
      priceTrim && Number.isFinite(priceNum) && priceNum > 0
        ? priceNum
        : priceTrim && Number.isFinite(priceNum) && priceNum === 0
          ? 0
          : null,
    compareAtPrice:
      compareNum != null && Number.isFinite(compareNum) && compareNum > 0 ? compareNum : null,
    currency,
    volume: form.volume.trim(),
    edition: form.edition.trim(),
    sku: form.sku.trim(),
    image: imageUrl,
    highlights: linesToArray(form.highlightsText),
    features: linesToArray(form.featuresText),
    occasions,
    ingredients: form.ingredients.trim(),
    howToUse: form.howToUse.trim(),
    promoBanner: form.promoBanner.trim(),
    maxStock: form.maxStock.trim() ? Number(form.maxStock) : null,
    featured: form.featured,
    status: 'active',
  };
}
