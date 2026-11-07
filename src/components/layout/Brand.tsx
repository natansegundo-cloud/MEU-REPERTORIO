import { cn } from '@/utils/cn';

import styles from './Brand.module.css';

interface BrandProps {
  compact?: boolean;
  className?: string | undefined;
}

export function Brand({ compact = false, className }: BrandProps) {
  return (
    <div className={cn(styles.brand, className)}>
      <img className={styles.mark} src="/brand/icon.svg" alt="" width={40} height={40} />
      <div className={styles.text}>
        <span className={styles.name}>Meu Repertório</span>
        {compact ? null : <span className={styles.tagline}>V2 · Fundação</span>}
      </div>
    </div>
  );
}
