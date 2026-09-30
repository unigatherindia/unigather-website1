import { DEFAULT_CURRENCY } from '@/constants/countries';
import type { AuraProduct } from '@/types/aura-product';

export function mapAuraProductDoc(id: string, data: Record<string, unknown>): AuraProduct {
  return {
    id,
    title: typeof data.title === 'string' ? data.title : '',
    subtitle: typeof data.subtitle === 'string' ? data.subtitle : undefined,
    tagline: typeof data.tagline === 'string' ? data.tagline : undefined,
    description: typeof data.description === 'string' ? data.description : '',
    longDescription: typeof data.longDescription === 'string' ? data.longDescription : undefined,
    price:
      data.price === null || data.price === undefined
        ? ''
        : typeof data.price === 'number' || typeof data.price === 'string'
          ? data.price
          : '',
    compareAtPrice:
      typeof data.compareAtPrice === 'number' || typeof data.compareAtPrice === 'string'
        ? data.compareAtPrice
        : undefined,
    currency: typeof data.currency === 'string' ? data.currency : DEFAULT_CURRENCY,
    volume: typeof data.volume === 'string' ? data.volume : undefined,
    edition: typeof data.edition === 'string' ? data.edition : undefined,
    sku: typeof data.sku === 'string' ? data.sku : undefined,
    image:
      typeof data.image === 'string' && data.image.trim()
        ? data.image
        : '/media/the-aura-poster.jpg',
    highlights: Array.isArray(data.highlights) ? (data.highlights as string[]) : [],
    features: Array.isArray(data.features) ? (data.features as string[]) : [],
    occasions: Array.isArray(data.occasions) ? (data.occasions as string[]) : [],
    ingredients: typeof data.ingredients === 'string' ? data.ingredients : undefined,
    howToUse: typeof data.howToUse === 'string' ? data.howToUse : undefined,
    promoBanner: typeof data.promoBanner === 'string' ? data.promoBanner : undefined,
    brandLine: typeof data.brandLine === 'string' ? data.brandLine : undefined,
    maxStock: typeof data.maxStock === 'number' ? data.maxStock : undefined,
    unitsSold: typeof data.unitsSold === 'number' ? data.unitsSold : 0,
    featured: Boolean(data.featured),
    status: typeof data.status === 'string' ? data.status : 'active',
  };
}
