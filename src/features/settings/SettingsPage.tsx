import { HardDrive } from 'lucide-react';
import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { requestPersistentStorage, type StoragePersistenceStatus } from '@/services';

import styles from './SettingsPage.module.css';

export function SettingsPage() {
  const [storageStatus, setStorageStatus] = useState<StoragePersistenceStatus | null>(null);

  useEffect(() => {
    void requestPersistentStorage().then(setStorageStatus);
  }, []);

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Ajustes"
        title="Preferências"
        description="Informações do aplicativo e proteção dos dados locais."
      />

      <section className={styles.panel} aria-labelledby="local-data-title">
        <div className={styles.heading}>
          <HardDrive size={21} aria-hidden="true" />
          <div>
            <h2 id="local-data-title">Versão e armazenamento</h2>
            <p>Versão {__APP_VERSION__}</p>
          </div>
        </div>
        <p className={styles.storage} role="status">
          {storageStatus === 'persisted'
            ? 'O armazenamento local está protegido contra limpeza automática.'
            : storageStatus === 'not-persisted'
              ? 'O navegador ainda não garantiu que os dados não serão apagados.'
              : storageStatus === 'unsupported'
                ? 'O navegador não oferece proteção persistente para os dados locais.'
                : 'Verificando a proteção dos dados locais…'}
        </p>
      </section>
    </div>
  );
}
