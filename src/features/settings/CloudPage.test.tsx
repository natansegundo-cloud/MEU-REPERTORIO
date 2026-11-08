import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { AuthSession, CloudBackend, PullPage, RemoteRow, SyncCursor, SyncTable } from '@/sync';

import { CloudPage } from './CloudPage';
import { CloudSyncController } from '@/sync';

const session: AuthSession = { userId: 'user-test', email: 'teste@example.com' };

class TestCloudBackend implements CloudBackend {
  currentSession: AuthSession | null = null;
  failSession = false;
  delayPull = false;
  releasePull: (() => void) | null = null;
  googleSignInCount = 0;
  otpEmail: string | null = null;
  verifiedOtp: { email: string; token: string } | null = null;
  private listener: ((value: AuthSession | null) => void) | null = null;

  getSession(): Promise<AuthSession | null> {
    if (this.failSession) throw new Error('sessão indisponível');
    return Promise.resolve(this.currentSession);
  }

  sendMagicLink(): Promise<void> {
    return Promise.resolve();
  }

  signInWithGoogle(): Promise<void> {
    this.googleSignInCount += 1;
    return Promise.resolve();
  }

  sendOtp(email: string): Promise<void> {
    this.otpEmail = email;
    return Promise.resolve();
  }

  verifyOtp(email: string, token: string): Promise<void> {
    this.verifiedOtp = { email, token };
    return Promise.resolve();
  }

  signOut(): Promise<void> {
    this.currentSession = null;
    this.listener?.(null);
    return Promise.resolve();
  }

  onAuthStateChange(listener: (value: AuthSession | null) => void): () => void {
    this.listener = listener;
    return () => {
      this.listener = null;
    };
  }

  async pull(
    _table: SyncTable,
    _userId: string,
    _cursor: SyncCursor | null,
    _limit: number,
  ): Promise<PullPage> {
    if (this.delayPull) {
      this.delayPull = false;
      await new Promise<void>((resolve) => {
        this.releasePull = resolve;
      });
    }
    return { rows: [], nextCursor: null, hasMore: false };
  }

  push(
    _table: SyncTable,
    _userId: string,
    rows: readonly RemoteRow[],
  ): Promise<readonly RemoteRow[]> {
    return Promise.resolve(rows);
  }
}

describe('CloudPage', () => {
  const controllers: CloudSyncController[] = [];

  afterEach(() => {
    for (const controller of controllers.splice(0)) controller.stop();
  });

  it('mostra a nuvem indisponível sem variáveis', async () => {
    const controller = new CloudSyncController(null);
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);
    expect(await screen.findByText('Indisponível')).toBeInTheDocument();
    expect(screen.getByText(/Configure as variáveis/)).toBeInTheDocument();
  });

  it('mostra desconectado e o formulario de magic link', async () => {
    const controller = new CloudSyncController(new TestCloudBackend());
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);
    expect(await screen.findByText('Desconectado')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar com Google' })).toBeInTheDocument();
  });

  it('inicia o login Google pelo controlador existente', async () => {
    const backend = new TestCloudBackend();
    const controller = new CloudSyncController(backend);
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);

    fireEvent.click(await screen.findByRole('button', { name: 'Entrar com Google' }));

    await waitFor(() => expect(backend.googleSignInCount).toBe(1));
    expect(await screen.findByText('Redirecionando para o Google…')).toBeInTheDocument();
  });

  it('envia e valida OTP com reenvio protegido por intervalo', async () => {
    const backend = new TestCloudBackend();
    const controller = new CloudSyncController(backend);
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'teste@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código por e-mail' }));

    expect(await screen.findByLabelText('Código de 6 dígitos')).toBeInTheDocument();
    expect(backend.otpEmail).toBe('teste@example.com');
    expect(screen.getByRole('button', { name: /Reenviar código \(\d+s\)/ })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar código' }));

    await waitFor(() =>
      expect(backend.verifiedOtp).toEqual({ email: 'teste@example.com', token: '123456' }),
    );
  });

  it('não envia OTP quando o código digitado não tem seis dígitos', async () => {
    const backend = new TestCloudBackend();
    const controller = new CloudSyncController(backend);
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);

    fireEvent.change(await screen.findByLabelText('E-mail'), {
      target: { value: 'teste@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código por e-mail' }));
    const codeInput = await screen.findByLabelText('Código de 6 dígitos');
    fireEvent.change(codeInput, { target: { value: '123' } });

    expect(screen.getByRole('button', { name: 'Confirmar código' })).toBeDisabled();
    expect(backend.verifiedOtp).toBeNull();
  });

  it('mostra sincronizando e depois sincronizado', async () => {
    const backend = new TestCloudBackend();
    backend.currentSession = session;
    backend.delayPull = true;
    const controller = new CloudSyncController(backend);
    controllers.push(controller);
    render(<CloudPage syncController={controller} />);
    expect(await screen.findByText('Sincronizando')).toBeInTheDocument();
    await waitFor(() => expect(backend.releasePull).not.toBeNull());
    backend.releasePull?.();
    expect(await screen.findByText('Sincronizado')).toBeInTheDocument();
  });

  it('mostra erro e offline', async () => {
    const failingBackend = new TestCloudBackend();
    failingBackend.failSession = true;
    const errorController = new CloudSyncController(failingBackend);
    controllers.push(errorController);
    render(<CloudPage syncController={errorController} />);
    expect(await screen.findByText('Erro')).toBeInTheDocument();

    const originalOnline = navigator.onLine;
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: false });
    const offlineBackend = new TestCloudBackend();
    offlineBackend.currentSession = session;
    const offlineController = new CloudSyncController(offlineBackend);
    controllers.push(offlineController);
    render(<CloudPage syncController={offlineController} />);
    await waitFor(() => expect(screen.getAllByText('Offline').length).toBeGreaterThan(0));
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: originalOnline });
  });
});
