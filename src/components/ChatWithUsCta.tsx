'use client';

import React from 'react';
import { MessageCircle } from 'lucide-react';
import HeroCtaLink from '@/components/ui/HeroCtaLink';

type ChatWithUsCtaProps = {
  label?: string;
  className?: string;
  variant?: 'primary' | 'outline';
  showArrow?: boolean;
};

export default function ChatWithUsCta({
  label = 'Chat with us',
  className = '',
  variant = 'primary',
  showArrow = true,
}: ChatWithUsCtaProps) {
  return (
    <HeroCtaLink
      href="/chat-with-us"
      icon={MessageCircle}
      variant={variant}
      showArrow={showArrow}
      className={className}
    >
      {label}
    </HeroCtaLink>
  );
}
