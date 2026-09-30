'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import AuraProductShowcase from '@/components/aura/AuraProductShowcase';
import AuraOrderModal from '@/components/aura/AuraOrderModal';
import {
  getAuraProductSoldOut,
  loadAuraProductById,
} from '@/lib/aura-products-client';
import type { AuraProduct } from '@/types/aura-product';
import toast from 'react-hot-toast';

export default function AuraProductDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productId = typeof params.productId === 'string' ? params.productId : '';
  const wantsCheckout = searchParams.get('checkout') === '1';

  const [product, setProduct] = useState<AuraProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    if (!productId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    loadAuraProductById(productId)
      .then(setProduct)
      .catch(() => toast.error('Could not load this fragrance.'))
      .finally(() => setIsLoading(false));
  }, [productId]);

  useEffect(() => {
    if (isLoading || !product) return;

    if (wantsCheckout && !getAuraProductSoldOut(product)) {
      setCheckoutOpen(true);
      return;
    }

    if (typeof window !== 'undefined' && window.location.hash === '#order') {
      const t = window.setTimeout(() => {
        document.getElementById('order')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
      return () => window.clearTimeout(t);
    }
  }, [isLoading, product, wantsCheckout]);

  const handleBuy = (p: AuraProduct) => {
    if (getAuraProductSoldOut(p)) {
      toast.error('This edition is sold out.');
      return;
    }
    setCheckoutOpen(true);
  };

  return (
    <Layout>
      <section className="aura-page-bg min-h-screen overflow-x-hidden pb-28 sm:pb-24 pt-24 sm:pt-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-[100vw]">
          <Link
            href="/buy-your-aura"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-aura-gold transition-colors mb-8 touch-manipulation min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to collection
          </Link>

          {isLoading && (
            <div className="flex items-center justify-center py-32">
              <Loader2 className="w-8 h-8 text-aura-gold animate-spin" />
            </div>
          )}

          {!isLoading && !product && (
            <div className="text-center py-24">
              <p className="text-gray-400 mb-6">This fragrance is not available.</p>
              <Link href="/buy-your-aura" className="text-aura-gold hover:underline">
                Browse the collection
              </Link>
            </div>
          )}

          {product && (
            <div className="max-w-7xl mx-auto">
              <AuraProductShowcase
                product={product}
                index={0}
                soldOut={getAuraProductSoldOut(product)}
                onBuy={handleBuy}
              />
            </div>
          )}
        </div>
      </section>

      {checkoutOpen && product && (
        <AuraOrderModal product={product} onClose={() => setCheckoutOpen(false)} />
      )}

      <ChatBot />
    </Layout>
  );
}
