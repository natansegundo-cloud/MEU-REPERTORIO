import type { ReactNode } from 'react';

import { cn } from '@/utils/cn';

import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}

export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, className)} data-tone={tone}>
      {children}
    </span>
  );
}
