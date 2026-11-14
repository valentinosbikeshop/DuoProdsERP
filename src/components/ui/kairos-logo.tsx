'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface KairosLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
}

const SIZE_MAP = {
  sm: { icon: 24, title: 'text-sm', badge: 'text-[9px] px-1.5 py-0.5' },
  md: { icon: 34, title: 'text-lg', badge: 'text-[10px] px-1.5 py-0.5' },
  lg: { icon: 44, title: 'text-2xl', badge: 'text-[11px] px-2 py-0.5' },
};

export function KairosLogo({
  size = 'md',
  showWordmark = true,
  subtitle,
  className,
  wordmarkClassName,
}: KairosLogoProps) {
  const uid = React.useId().replace(/:/g, '');
  const dims = SIZE_MAP[size];

  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <svg
        width={dims.icon}
        height={dims.icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`kairosBg-${uid}`} x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#1E1B4B" />
          </linearGradient>
          <linearGradient id={`kairosPrism-${uid}`} x1="16" y1="10" x2="31" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id={`kairosWing-${uid}`} x1="17" y1="20" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818CF8" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
        <rect
          x="1"
          y="1"
          width="38"
          height="38"
          rx="10"
          fill={`url(#kairosBg-${uid})`}
          stroke="#334155"
          strokeWidth="1.2"
        />
        <rect x="11" y="9.5" width="3.8" height="21" rx="1.9" fill="#F8FAFC" />
        <path
          d="M16.5 19.6L25.8 10.2C26.4 9.6 27.3 9.5 28.0 9.9C28.8 10.4 28.9 11.5 28.2 12.2L19.8 20.6L16.5 19.6Z"
          fill={`url(#kairosPrism-${uid})`}
        />
        <path
          d="M19.8 20.1L28.4 28.0C29.1 28.7 29.0 29.8 28.2 30.3C27.5 30.7 26.5 30.6 25.9 30.0L16.6 21.1L19.8 20.1Z"
          fill={`url(#kairosWing-${uid})`}
        />
        <circle cx="17.8" cy="20.4" r="1.9" fill="#FBBF24" />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                'font-extrabold tracking-tight text-slate-900 dark:text-slate-100',
                dims.title,
                wordmarkClassName
              )}
            >
              KAIROS
            </span>
            <span
              className={cn(
                'rounded-md bg-slate-900 text-amber-400 font-bold tracking-wider uppercase border border-slate-700/60',
                dims.badge
              )}
            >
              ERP
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-medium text-muted-foreground tracking-wide mt-0.5">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface CompanyLogoMarkProps {
  name: string;
  logoUrl?: string | null;
  isDemo?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function CompanyLogoMark({
  name,
  logoUrl,
  isDemo = false,
  size = 'sm',
  className,
}: CompanyLogoMarkProps) {
  const [imgError, setImgError] = React.useState(false);

  React.useEffect(() => {
    setImgError(false);
  }, [logoUrl]);

  const boxClass = size === 'md' ? 'h-10 w-10 rounded-xl text-sm' : 'h-8 w-8 rounded-lg text-xs';

  if (logoUrl && !imgError) {
    return (
      <div
        className={cn(
          'shrink-0 overflow-hidden border border-border/60 bg-white flex items-center justify-center p-0.5 shadow-2xs',
          boxClass,
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={logoUrl}
          alt={`Logo de ${name}`}
          onError={() => setImgError(true)}
          className="h-full w-full object-contain rounded-[6px]"
        />
      </div>
    );
  }

  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length >= 2
      ? `${words[0][0]}${words[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase() || 'KE';

  return (
    <div
      className={cn(
        'shrink-0 flex items-center justify-center font-bold tracking-tight border shadow-2xs',
        isDemo
          ? 'bg-amber-500/15 text-amber-700 border-amber-400/50'
          : 'bg-slate-900 text-amber-400 border-slate-700',
        boxClass,
        className
      )}
      title={name}
    >
      {initials}
    </div>
  );
}
