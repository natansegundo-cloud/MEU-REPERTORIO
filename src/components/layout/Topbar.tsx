import type { SectionId } from '@/app/navigation';
import { ConnectionStatus } from '@/components/system/ConnectionStatus';

import { Brand } from './Brand';
import { MobileNavMenu } from './MobileNavMenu';
import styles from './Topbar.module.css';

interface TopbarProps {
  activeSection: SectionId;
  onSectionChange: (section: SectionId) => void;
}

export function Topbar({ activeSection, onSectionChange }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <div className={styles.mobileStart}>
        <MobileNavMenu activeSection={activeSection} onSectionChange={onSectionChange} />
        <div className={styles.mobileBrand}>
          <Brand compact />
        </div>
      </div>
      <p className={styles.label}>Biblioteca local</p>
      <ConnectionStatus />
    </header>
  );
}
