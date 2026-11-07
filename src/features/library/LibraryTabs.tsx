import styles from './LibraryPage.module.css';

interface LibraryTabsProps {
  readonly active: 'songs' | 'repertories';
  readonly onChange: (tab: 'songs' | 'repertories') => void;
}

export function LibraryTabs({ active, onChange }: LibraryTabsProps) {
  return (
    <nav className={styles.tabs} aria-label="Conteúdo da biblioteca">
      <button
        className={styles.tab}
        data-active={active === 'songs'}
        type="button"
        aria-current={active === 'songs' ? 'page' : undefined}
        onClick={() => onChange('songs')}
      >
        Músicas
      </button>
      <button
        className={styles.tab}
        data-active={active === 'repertories'}
        type="button"
        aria-current={active === 'repertories' ? 'page' : undefined}
        onClick={() => onChange('repertories')}
      >
        Repertórios
      </button>
    </nav>
  );
}
