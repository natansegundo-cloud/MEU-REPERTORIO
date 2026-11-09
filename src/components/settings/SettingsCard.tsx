import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

import styles from './SettingsCard.module.css';

interface SettingsCardProps {
  readonly id?: string;
  readonly icon: LucideIcon;
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
}

export function SettingsCard({ id, icon: Icon, title, description, children }: SettingsCardProps) {
  return (
    <section className={styles.card} aria-labelledby={id}>
      <header className={styles.header}>
        <span className={styles.icon} aria-hidden="true">
          <Icon size={18} strokeWidth={2} />
        </span>
        <div className={styles.copy}>
          <h3 id={id} className={styles.title}>
            {title}
          </h3>
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  );
}
