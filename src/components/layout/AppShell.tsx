import type { ReactNode } from 'react';

import type { SectionId } from '@/app/navigation';

import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppShell.module.css';

interface AppShellProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
  children: ReactNode;
}

export function AppShell({ activeSection, onSectionChange, children }: AppShellProps) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main-content">
        Pular para o conteúdo
      </a>

      <Sidebar activeSection={activeSection} onSectionChange={onSectionChange} />

      <div className={styles.main}>
        <Topbar activeSection={activeSection} onSectionChange={onSectionChange} />
        <main id="main-content" className={styles.content} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
