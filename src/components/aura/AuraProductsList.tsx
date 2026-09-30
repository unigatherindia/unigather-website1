'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { loadAuraProducts } from '@/lib/aura-products-client';
import type { AuraProduct } from '@/types/aura-product';
import AuraProductCard from './AuraProductCard';

const AuraProductsList: React.FC = () => {
  const [products, setProducts] = useState<AuraProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAuraProducts()
      .then(setProducts)
      .catch(() => toast.error('Failed to load products.'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-8 h-8 text-aura-gold animate-spin" />
        <span className="ml-3 text-gray-500 tracking-wide text-sm">Curating collection…</span>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-24 px-6 max-w-lg mx-auto">
        <Sparkles className="w-12 h-12 text-aura-gold/60 mx-auto mb-6" />
        <h3 className="font-aura-display text-2xl text-white mb-3">Collection arriving soon</h3>
        <p className="text-gray-500 leading-relaxed">
          Add fragrances in Admin → Buy Your Aura. They will appear here as cards — tap one to see
          full details and order.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 max-w-6xl mx-auto">
      {products.map((product, index) => (
        <AuraProductCard key={product.id} product={product} index={index} />
      ))}
    </div>
  );
};

export default AuraProductsList;
