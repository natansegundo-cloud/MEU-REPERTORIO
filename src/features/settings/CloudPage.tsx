import { Cloud, LogIn, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useState } from 'react';

import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  cloudSyncController,
  type CloudStatus,
  type CloudSyncController,
  useCloudSync,
} from '@/sync';

import styles from './CloudPage.module.css';

const STATUS_LABELS: Record<CloudStatus, string> = {
  unavailable: 'Indisponível',
  disconnected: 'Desconectado',
  syncing: 'Sincronizando',
  synced: 'Sincronizado',
  offline: 'Offline',
  error: 'Erro',
  'account-mismatch': 'Conta diferente',
};

function statusTone(status: CloudStatus): 'neutral' | 'accent' | 'success' | 'warning' {
  if (status === 'synced') return 'success';
  if (status === 'syncing') return 'accent';
  if (status === 'offline' || status === 'error' || status === 'account-mismatch') return 'warning';
  return 'neutral';
}

function formatDate(value: string | null): string {
  if (!value) return 'Ainda não sincronizado';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(value),
  );
}

interface CloudPageProps {
  readonly syncController?: CloudSyncController;
}

export function CloudPage({ syncController = cloudSyncController }: CloudPageProps) {
  const snapshot = useCloudSync(syncController);
  const [email, setEmail] = useState('');

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Ajustes"
        title="Nuvem"
        description="Sincronização opcional, mantendo sua biblioteca disponível offline."
      />

      <section className={styles.panel} aria-labelledby="cloud-title">
        <div className={styles.panelHeader}>
          <div>
            <h2 id="cloud-title" className={styles.title}>
              <Cloud size={21} aria-hidden="true" /> Dados entre aparelhos
            </h2>
            <p className={styles.description}>
              A nuvem sincroniza músicas, repertórios e itens de repertório. Preferências de
              leitura, favoritos e posição do show ficam somente neste dispositivo.
            </p>
          </div>
          <Badge tone={statusTone(snapshot.status)}>{STATUS_LABELS[snapshot.status]}</Badge>
        </div>

        {snapshot.status === 'unavailable' ? (
          <p className={styles.message} role="status">
            Configure as variáveis do Supabase para habilitar a nuvem. O app local continua
            funcionando normalmente.
          </p>
        ) : null}

        {snapshot.session ? (
          <>
            <div className={styles.accountRow}>
              <span className={styles.message}>
                Conta: {snapshot.session.email ?? snapshot.session.userId}
              </span>
              <span className={styles.pending} role="status" aria-live="polite">
                {snapshot.pending > 0
                  ? `${snapshot.pending} alteração(ões) pendente(s)`
                  : 'Nenhuma alteração pendente'}
              </span>
            </div>
            <div className={styles.statusRow}>
              <span className={styles.lastSync}>
                Última sincronização: {formatDate(snapshot.lastSyncedAt)}
              </span>
            </div>
            <div className={styles.actions}>
              <Button
                onClick={() => void syncController.syncNow()}
                disabled={snapshot.status === 'syncing'}
              >
                <RefreshCw size={16} /> Sincronizar agora
              </Button>
              <Button variant="ghost" onClick={() => void syncController.signOut()}>
                <LogOut size={16} /> Sair da conta
              </Button>
            </div>
          </>
        ) : snapshot.status !== 'unavailable' ? (
          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void syncController.sendMagicLink(email);
            }}
          >
            <label className={styles.label}>
              E-mail
              <input
                className={styles.input}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="voce@exemplo.com"
              />
            </label>
            <div className={styles.actions}>
              <Button type="submit" disabled={!email.trim()}>
                <LogIn size={16} /> Entrar por link no e-mail
              </Button>
            </div>
          </form>
        ) : null}

        {snapshot.syncErrors.length > 0 ? (
          <div className={styles.error} role="alert">
            {snapshot.syncErrors.length} registro(s) com erro de envio. Eles continuam salvos
            localmente e serão tentados novamente.
          </div>
        ) : null}

        {snapshot.status === 'account-mismatch' ? (
          <div className={styles.accountRow} role="alert">
            <ShieldAlert size={18} aria-hidden="true" />
            <span className={styles.error}>{snapshot.message}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => syncController.keepLocalSeparate()}
            >
              Manter local separado
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void syncController.signOut()}>
              Sair
            </Button>
          </div>
        ) : null}

        {snapshot.magicLinkSent ? <p className={styles.success}>{snapshot.message}</p> : null}
        {snapshot.status === 'error' ? (
          <p className={styles.error} role="alert">
            {snapshot.message}
          </p>
        ) : null}
        {snapshot.status === 'offline' ? (
          <p className={styles.message}>{snapshot.message}</p>
        ) : null}
        {snapshot.status === 'disconnected' && snapshot.message ? (
          <p className={styles.message} role="status">
            {snapshot.message}
          </p>
        ) : null}
        {snapshot.notice ? (
          <p className={styles.notice} role="status" aria-live="polite">
            {snapshot.notice}
          </p>
        ) : null}
      </section>
    </div>
  );
}
