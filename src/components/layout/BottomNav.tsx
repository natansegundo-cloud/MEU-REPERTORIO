import type { SectionId } from '@/app/navigation';
import { NAVIGATION_ITEMS } from '@/app/navigation';

import styles from './BottomNav.module.css';

interface BottomNavProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

export function BottomNav({ activeSection, onSectionChange }: BottomNavProps) {
  return (
    <nav className={styles.bottomNav} aria-label="Navegação móvel">
      {NAVIGATION_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === activeSection;

        return (
          <button
            key={item.id}
            type="button"
            className={styles.navItem}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSectionChange(item.id)}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
