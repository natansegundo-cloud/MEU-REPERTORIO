import type { SectionId } from '@/app/navigation';
import { NAVIGATION_ITEMS } from '@/app/navigation';

import { Brand } from './Brand';
import styles from './Sidebar.module.css';

interface SidebarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

export function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <Brand className={styles.brand} />

      <nav className={styles.nav} aria-label="Navegação principal">
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
              <Icon className={styles.navIcon} size={19} strokeWidth={1.8} aria-hidden="true" />
              <span className={styles.navLabel}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <span className={styles.footerDot} aria-hidden="true" />
        Dados salvos neste dispositivo
      </div>
    </aside>
  );
}
