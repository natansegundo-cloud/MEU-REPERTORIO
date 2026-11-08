import { liveQuery } from 'dexie';

import { type AuthSession, type CloudBackend, SyncAccountMismatchError } from './contracts';
import { SyncCoordinator } from './coordinator';
import { configureSyncTrigger } from './events';
import { createSupabaseBackend } from './supabase-backend';
import { listSyncErrors, pendingSyncCount, readSyncMetadata } from './metadata';

export type CloudStatus =
  'unavailable' | 'disconnected' | 'syncing' | 'synced' | 'offline' | 'error' | 'account-mismatch';

export interface CloudSnapshot {
  readonly status: CloudStatus;
  readonly session: AuthSession | null;
  readonly pending: number;
  readonly syncErrors: readonly { table: string; id: string; message: string }[];
  readonly lastSyncedAt: string | null;
  readonly message: string | null;
  readonly notice: string | null;
  readonly magicLinkSent: boolean;
  readonly otpSent: boolean;
  readonly otpResendAt: number | null;
  readonly authBusy: boolean;
}

const initialSnapshot: CloudSnapshot = {
  status: 'disconnected',
  session: null,
  pending: 0,
  syncErrors: [],
  lastSyncedAt: null,
  message: null,
  notice: null,
  magicLinkSent: false,
  otpSent: false,
  otpResendAt: null,
  authBusy: false,
};

export class CloudSyncController {
  private readonly listeners = new Set<() => void>();
  private readonly backend: CloudBackend | null;
  private snapshot: CloudSnapshot;
  private coordinator: SyncCoordinator | null = null;
  private started = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSubscription: { unsubscribe: () => void } | null = null;
  private authUnsubscribe: (() => void) | null = null;
  private accountBlocked = false;
  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly otpCooldownMs = 30_000;

  constructor(backend: CloudBackend | null = createSupabaseBackend()) {
    this.backend = backend;
    this.snapshot = backend ? initialSnapshot : { ...initialSnapshot, status: 'unavailable' };
  }

  getSnapshot = (): CloudSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    configureSyncTrigger(() => this.scheduleSync());
    this.pendingSubscription = liveQuery(async () => ({
      pending: await pendingSyncCount(),
      syncErrors: await listSyncErrors(),
    })).subscribe({
      next: (value) => this.update(value),
    });
    if (!this.backend) return;

    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    window.addEventListener('visibilitychange', this.handleVisibility);
    this.authUnsubscribe = this.backend.onAuthStateChange((session) => {
      void this.handleSession(session);
    });
    try {
      const session = await this.backend.getSession();
      await this.handleSession(session);
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause) });
    }
  }

  stop(): void {
    if (!this.started) return;
    this.started = false;
    this.authUnsubscribe?.();
    this.authUnsubscribe = null;
    this.pendingSubscription?.unsubscribe();
    this.pendingSubscription = null;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = null;
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.noticeTimer = null;
    if (this.backend) {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      window.removeEventListener('visibilitychange', this.handleVisibility);
    }
    configureSyncTrigger(null);
  }

  async sendMagicLink(email: string): Promise<void> {
    if (!this.backend) return;
    if (this.snapshot.authBusy) return;
    const normalized = email.trim();
    if (!normalized) {
      this.update({ status: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    this.update({ authBusy: true, message: null });
    try {
      await this.backend.sendMagicLink(normalized);
      this.update({
        status: 'disconnected',
        message: 'Link enviado. Confira seu e-mail para entrar.',
        magicLinkSent: true,
        authBusy: false,
      });
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause), authBusy: false });
    }
  }

  async signInWithGoogle(): Promise<void> {
    if (!this.backend || this.snapshot.authBusy) return;
    this.update({ authBusy: true, message: null });
    try {
      await this.backend.signInWithGoogle();
      this.update({ authBusy: false, message: 'Redirecionando para o Google…' });
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause), authBusy: false });
    }
  }

  async sendOtp(email: string): Promise<void> {
    if (!this.backend || this.snapshot.authBusy) return;
    const normalized = email.trim();
    if (!normalized) {
      this.update({ status: 'error', message: 'Informe um e-mail válido.' });
      return;
    }
    const resendAt = this.snapshot.otpResendAt ?? 0;
    if (resendAt > Date.now()) {
      const seconds = Math.ceil((resendAt - Date.now()) / 1000);
      this.update({
        status: 'error',
        message: `Aguarde ${seconds}s para reenviar o código.`,
      });
      return;
    }
    this.update({ authBusy: true, message: null });
    try {
      await this.backend.sendOtp(normalized);
      this.update({
        status: 'disconnected',
        message: 'Código enviado. Confira seu e-mail e digite os 6 dígitos.',
        otpSent: true,
        otpResendAt: Date.now() + this.otpCooldownMs,
        magicLinkSent: false,
        authBusy: false,
      });
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause), authBusy: false });
    }
  }

  async verifyOtp(email: string, token: string): Promise<void> {
    if (!this.backend || this.snapshot.authBusy) return;
    const normalized = email.trim();
    const normalizedToken = token.trim();
    if (!normalized || !/^\d{6}$/u.test(normalizedToken)) {
      this.update({
        status: 'error',
        message: 'Digite o código de 6 dígitos recebido por e-mail.',
      });
      return;
    }
    this.update({ authBusy: true, message: null });
    try {
      await this.backend.verifyOtp(normalized, normalizedToken);
      const session = await this.backend.getSession();
      this.update({
        otpSent: false,
        otpResendAt: null,
        authBusy: false,
        message: session ? null : 'Código confirmado. Recuperando sua sessão…',
      });
      if (session) await this.handleSession(session);
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause), authBusy: false });
    }
  }

  async signOut(): Promise<void> {
    if (!this.backend) return;
    try {
      await this.backend.signOut();
      this.coordinator = null;
      this.accountBlocked = false;
      this.update({
        status: 'disconnected',
        session: null,
        message: null,
        magicLinkSent: false,
        otpSent: false,
        otpResendAt: null,
        authBusy: false,
      });
    } catch (cause: unknown) {
      this.update({ status: 'error', message: this.errorMessage(cause) });
    }
  }

  keepLocalSeparate(): void {
    this.accountBlocked = true;
    this.coordinator = null;
    this.update({
      status: 'disconnected',
      message:
        'Dados locais mantidos somente neste dispositivo. A nuvem foi pausada para esta conta.',
    });
  }

  async syncNow(): Promise<void> {
    if (!this.backend) return;
    if (!navigator.onLine) {
      this.update({
        status: 'offline',
        message: 'Sem internet. Os dados locais continuam disponíveis.',
      });
      return;
    }
    if (!this.snapshot.session || this.accountBlocked || !this.coordinator) {
      this.update({ status: 'disconnected' });
      return;
    }
    this.update({ status: 'syncing', message: null });
    try {
      const result = await this.coordinator.requestSync();
      this.update({
        status: result.errors > 0 ? 'error' : 'synced',
        pending: result.pending,
        lastSyncedAt: result.completedAt,
        message:
          result.errors > 0
            ? `${result.errors} registro(s) não puderam ser enviados. Os demais continuam sincronizados.`
            : null,
      });
    } catch (cause: unknown) {
      if (cause instanceof SyncAccountMismatchError) {
        this.update({ status: 'account-mismatch', message: cause.message });
      } else {
        this.update({ status: 'error', message: this.errorMessage(cause) });
      }
    }
  }

  private async handleSession(session: AuthSession | null): Promise<void> {
    this.accountBlocked = false;
    this.coordinator = null;
    if (!session) {
      this.update({
        status: 'disconnected',
        session: null,
        magicLinkSent: false,
        otpSent: false,
        otpResendAt: null,
        authBusy: false,
      });
      return;
    }

    const metadata = await readSyncMetadata();
    this.update({
      session,
      lastSyncedAt: metadata.lastSyncedAt,
      status: navigator.onLine ? 'syncing' : 'offline',
      message: null,
      magicLinkSent: false,
      otpSent: false,
      otpResendAt: null,
      authBusy: false,
    });
    this.coordinator = new SyncCoordinator(this.backend as CloudBackend, session.userId, {
      onNotice: (notice) => this.showNotice(notice),
    });
    if (navigator.onLine) await this.syncNow();
  }

  private scheduleSync = (): void => {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      void this.syncNow();
    }, 600);
  };

  private handleOnline = (): void => {
    if (this.snapshot.session) void this.syncNow();
  };

  private handleOffline = (): void => {
    if (this.snapshot.session)
      this.update({ status: 'offline', message: 'Sem internet. Alterações ficam pendentes.' });
  };

  private handleVisibility = (): void => {
    if (document.visibilityState === 'visible' && this.snapshot.session) this.scheduleSync();
  };

  private update(changes: Partial<CloudSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...changes };
    for (const listener of this.listeners) listener();
  }

  private showNotice(notice: string): void {
    if (this.noticeTimer) clearTimeout(this.noticeTimer);
    this.update({ notice });
    this.noticeTimer = setTimeout(() => {
      this.noticeTimer = null;
      this.update({ notice: null });
    }, 4_000);
  }

  private errorMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'Não foi possível sincronizar agora.';
  }
}

export const cloudSyncController = new CloudSyncController();
