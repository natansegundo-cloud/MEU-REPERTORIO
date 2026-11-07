import { ConnectionStatus } from '@/components/system/ConnectionStatus';

import { Brand } from './Brand';
import styles from './Topbar.module.css';

export function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.mobileBrand}>
        <Brand compact />
      </div>
      <p className={styles.label}>Base local · V2</p>
      <ConnectionStatus />
    </header>
  );
}
