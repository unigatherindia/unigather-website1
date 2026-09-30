/**
 * Seeds "The Aura" product into Firestore (auraProducts).
 * Usage: node scripts/seed-aura-product.js
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function main() {
  const existing = await db.collection('auraProducts').limit(1).get();
  if (!existing.empty) {
    console.log('auraProducts already has documents — skipping seed.');
    process.exit(0);
  }

  await db.collection('auraProducts').add({
    title: 'The Aura',
    subtitle: 'Limited Edition',
    tagline: "More than a fragrance — it's a feeling",
    brandLine: 'unigather Fragrance',
    description:
      'Warm, premium fragrance oil designed for lasting presence. Perfect when you want to be at your best.',
    longDescription:
      'The Aura is a limited-edition 7 ML fragrance oil crafted for modern life — from morning meetings to evening plans. Long-lasting, skin-friendly, and easy to carry.',
    price: 250,
    compareAtPrice: null,
    currency: 'INR',
    volume: '7 ML',
    edition: 'Limited Edition',
    sku: 'AURA-7ML-001',
    maxStock: 500,
    unitsSold: 0,
    image: '/media/the-aura-poster.jpg',
    highlights: [
      'Lasts long for 900+ minutes',
      'Premium fragrance',
      '7 ML oil',
      'Any occasion',
    ],
    features: [
      'Alcohol-free oil base',
      'Travel-friendly size',
      'Unisex scent profile',
    ],
    occasions: ['Work', 'Party', 'Date', 'Travel', 'Everyday'],
    ingredients: 'Premium fragrance oil blend. Patch test recommended.',
    howToUse: 'Apply to pulse points — wrists, neck. A little goes a long way.',
    promoBanner: 'Available only for 1 month — Limited Edition',
    featured: true,
    status: 'active',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log('Seeded The Aura product.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
