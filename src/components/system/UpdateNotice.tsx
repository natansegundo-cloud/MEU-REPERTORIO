import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import styles from './UpdateNotice.module.css';

export function UpdateNotice() {
  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <span>Nova versão disponível — atualizar</span>
      <Button size="sm" onClick={() => window.dispatchEvent(new Event('pwa:apply-update'))}>
        <RefreshCw size={15} aria-hidden="true" /> Atualizar
      </Button>
    </div>
  );
}
