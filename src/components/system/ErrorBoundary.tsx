import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/components/ui/Button';

import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryProps {
  readonly children: ReactNode;
}

interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly message: string | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : null,
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error('[app] Falha inesperada', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className={styles.page} role="alert">
        <div className={styles.panel}>
          <p className={styles.eyebrow}>Meu Repertório</p>
          <h1>Não foi possível abrir esta tela</h1>
          <p>
            Seus dados locais não foram apagados. Recarregue o aplicativo; se o problema continuar,
            feche outras abas e tente novamente.
          </p>
          {this.state.message ? <code>{this.state.message}</code> : null}
          <Button onClick={() => window.location.reload()}>Recarregar aplicativo</Button>
        </div>
      </main>
    );
  }
}
