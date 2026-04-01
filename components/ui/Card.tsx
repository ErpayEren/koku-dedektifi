'use client';

import { createElement, Fragment, type CSSProperties, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean | 'amber' | 'purple' | 'teal';
  style?: CSSProperties;
}

export function Card({ children, className, glow, style }: CardProps) {
  let resolvedGlow: false | 'amber' | 'purple' | 'teal' = false;

  if (glow === true) {
    resolvedGlow = 'amber';
  } else if (glow === 'amber' || glow === 'purple' || glow === 'teal') {
    resolvedGlow = glow;
  }

  return createElement(
    'div',
    {
      className: cn(
        'relative overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-surface)] backdrop-blur-sm shadow-[var(--shadow-card)] transition-all duration-300 hover:border-[var(--color-border-active)] hover:bg-[var(--color-surface-hover)]',
        resolvedGlow === 'amber'
          ? 'hover:shadow-[var(--glow-amber)]'
          : resolvedGlow === 'purple'
            ? 'hover:shadow-[var(--glow-purple)]'
            : resolvedGlow === 'teal'
              ? 'hover:shadow-[0_0_20px_rgba(45,212,191,0.2)]'
              : '',
        cn('rounded-2xl', className),
      ),
      style,
    },
    resolvedGlow
      ? createElement('div', {
          className:
            'absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-gold/[.05] to-transparent pointer-events-none',
        })
      : null,
    createElement(Fragment, null, children),
  );
}
