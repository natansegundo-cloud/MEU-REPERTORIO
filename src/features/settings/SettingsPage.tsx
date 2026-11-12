import { HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { SettingsCard } from '@/components/settings/SettingsCard';
import { InstallHelp } from '@/components/system/InstallHelp';
import { requestPersistentStorage, type StoragePersistenceStatus } from '@/services';

import { BackupPanel } from './BackupPanel';
import { CloudPage } from './CloudPage';
import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const [storageStatus, setStorageStatus] = useState<StoragePersistenceStatus | null>(null);

  useEffect(() => {
    void requestPersistentStorage().then(setStorageStatus);
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader title="Preferências" />

      <section className={styles.section} aria-labelledby="data-section-title">
        <h2 id="data-section-title" className={styles.sectionTitle}>
          Dados
        </h2>
        <div className={styles.cards}>
          <SettingsCard
            id="local-data-title"
            icon={HardDrive}
            title="Versão e armazenamento"
            description={`Versão ${__APP_VERSION__}`}
          >
            <p className={styles.storage} role="status">
              {storageStatus === 'persisted'
                ? 'Dados locais protegidos contra limpeza automática.'
                : storageStatus === 'not-persisted'
                  ? 'O navegador ainda pode limpar os dados locais.'
                  : storageStatus === 'unsupported'
                    ? 'Este navegador não oferece proteção persistente.'
                    : 'Verificando proteção dos dados locais…'}
            </p>
          </SettingsCard>
          <BackupPanel />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="installation-section-title">
        <h2 id="installation-section-title" className={styles.sectionTitle}>
          Instalação
        </h2>
        <div className={styles.cards}>
          <InstallHelp />
        </div>
      </section>

      <section className={styles.section} aria-labelledby="cloud-section-title">
        <h2 id="cloud-section-title" className={styles.sectionTitle}>
          Nuvem e conta
        </h2>
        <div className={styles.cards}>
          <CloudPage />
        </div>
      </section>
    </div>
  );
}
