'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

type HeroCtaIcon = React.ComponentType<{ className?: string }>;

type HeroCtaLinkProps = {
  href: string;
  children: React.ReactNode;
  icon?: HeroCtaIcon;
  iconClassName?: string;
  variant?: 'primary' | 'outline';
  showArrow?: boolean;
  className?: string;
};

const HeroCtaLink: React.FC<HeroCtaLinkProps> = ({
  href,
  children,
  icon: Icon,
  iconClassName,
  variant = 'primary',
  showArrow = true,
  className = '',
}) => {
  const variantClass = variant === 'primary' ? 'hero-cta-primary' : 'hero-cta-outline';
  const defaultIconClass =
    'hero-cta-icon shrink-0 text-white group-hover:scale-110 transition-transform';

  return (
    <Link href={href} className={`hero-cta group ${variantClass} ${className}`.trim()}>
      {Icon ? <Icon className={iconClassName ?? defaultIconClass} /> : null}
      <span className="hero-cta-label">{children}</span>
      {showArrow && variant === 'primary' ? (
        <ArrowRight className="hero-cta-icon shrink-0 group-hover:translate-x-1 transition-transform" />
      ) : null}
    </Link>
  );
};

export default HeroCtaLink;
