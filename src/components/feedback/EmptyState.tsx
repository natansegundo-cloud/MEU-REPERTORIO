import { useId } from 'react';

import type { LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';

import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  badge?: string;
}

export function EmptyState({ icon: Icon, title, description, badge }: EmptyStateProps) {
  const titleId = useId();

  return (
    <section className={styles.emptyState} aria-labelledby={titleId}>
      <div className={styles.iconWrap} aria-hidden="true">
        <Icon size={24} strokeWidth={1.8} />
      </div>
      {badge ? <Badge tone="accent">{badge}</Badge> : null}
      <div className={styles.copy}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        <p className={styles.description}>{description}</p>
      </div>
    </section>
  );
}
