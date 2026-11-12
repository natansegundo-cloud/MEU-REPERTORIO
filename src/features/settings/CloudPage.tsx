import { Cloud, KeyRound, LogIn, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { useEffect, useState } from 'react';

import { SettingsCard } from '@/components/settings/SettingsCard';
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
  const [otpCode, setOtpCode] = useState('');
  const [now, setNow] = useState(() => Date.now());
  const otpCooldownSeconds = snapshot.otpResendAt
    ? Math.max(0, Math.ceil((snapshot.otpResendAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (!snapshot.otpResendAt || snapshot.otpResendAt <= now) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1_000);
    return () => window.clearTimeout(timer);
  }, [now, snapshot.otpResendAt]);

  return (
    <SettingsCard
      id="cloud-title"
      icon={Cloud}
      title="Nuvem"
      description="Sincronização opcional. A biblioteca continua disponível offline."
    >
      <div className={styles.statusHeader}>
        <span className={styles.statusLabel}>Estado da sincronização</span>
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
        <div className={styles.authOptions}>
          <Button
            className={styles.googleButton}
            onClick={() => void syncController.signInWithGoogle()}
            disabled={snapshot.authBusy}
          >
            <LogIn size={16} /> Entrar com Google
          </Button>

          <div className={styles.divider} aria-hidden="true">
            <span>ou use seu e-mail</span>
          </div>

          <form
            className={styles.form}
            onSubmit={(event) => {
              event.preventDefault();
              void syncController.sendOtp(email);
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
              <Button type="submit" disabled={!email.trim() || snapshot.authBusy}>
                <KeyRound size={16} /> Enviar código por e-mail
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => void syncController.sendMagicLink(email)}
                disabled={!email.trim() || snapshot.authBusy}
              >
                <LogIn size={16} /> Entrar por link
              </Button>
            </div>
          </form>

          {snapshot.otpSent ? (
            <form
              className={styles.form}
              onSubmit={(event) => {
                event.preventDefault();
                void syncController.verifyOtp(email, otpCode);
              }}
            >
              <label className={styles.label}>
                Código de 6 dígitos
                <input
                  className={styles.input}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value.replace(/\D/gu, ''))}
                  placeholder="000000"
                />
              </label>
              <div className={styles.actions}>
                <Button type="submit" disabled={otpCode.length !== 6 || snapshot.authBusy}>
                  <LogIn size={16} /> Confirmar código
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void syncController.sendOtp(email)}
                  disabled={snapshot.authBusy || otpCooldownSeconds > 0}
                >
                  {otpCooldownSeconds > 0
                    ? `Reenviar código (${otpCooldownSeconds}s)`
                    : 'Reenviar código'}
                </Button>
              </div>
            </form>
          ) : null}
        </div>
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
          <Button size="sm" variant="secondary" onClick={() => syncController.keepLocalSeparate()}>
            Manter local separado
          </Button>
          <Button size="sm" variant="ghost" onClick={() => void syncController.signOut()}>
            Sair
          </Button>
        </div>
      ) : null}

      {snapshot.magicLinkSent || (snapshot.otpSent && snapshot.status !== 'error') ? (
        <p className={styles.success} role="status">
          {snapshot.message}
        </p>
      ) : null}
      {snapshot.status === 'error' ? (
        <p className={styles.error} role="alert">
          {snapshot.message}
        </p>
      ) : null}
      {snapshot.status === 'offline' ? <p className={styles.message}>{snapshot.message}</p> : null}
      {snapshot.status === 'disconnected' &&
      snapshot.message &&
      !snapshot.magicLinkSent &&
      !snapshot.otpSent ? (
        <p className={styles.message} role="status">
          {snapshot.message}
        </p>
      ) : null}
      {snapshot.notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {snapshot.notice}
        </p>
      ) : null}
    </SettingsCard>
  );
}
