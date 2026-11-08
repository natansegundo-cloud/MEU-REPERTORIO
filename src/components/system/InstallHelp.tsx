import { Share2, Smartphone } from 'lucide-react';
import { useEffect, useState } from 'react';

import styles from './InstallHelp.module.css';

interface StandaloneNavigator extends Navigator {
  readonly standalone?: boolean;
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
  return (navigator as StandaloneNavigator).standalone === true;
}

export function InstallHelp() {
  const [isStandalone, setIsStandalone] = useState(isStandaloneDisplay);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const updateDisplayMode = () => setIsStandalone(isStandaloneDisplay());

    mediaQuery?.addEventListener('change', updateDisplayMode);
    window.addEventListener('pageshow', updateDisplayMode);
    return () => {
      mediaQuery?.removeEventListener('change', updateDisplayMode);
      window.removeEventListener('pageshow', updateDisplayMode);
    };
  }, []);

  return (
    <section className={styles.panel} aria-labelledby="install-help-title">
      <div className={styles.heading}>
        <Smartphone size={21} aria-hidden="true" />
        <div>
          <h2 id="install-help-title">Adicionar à Tela de Início</h2>
          <p>
            {isStandalone
              ? 'O aplicativo está aberto no modo instalado.'
              : 'No iPhone ou iPad, use o Safari para adicionar este aplicativo à Tela de Início.'}
          </p>
        </div>
      </div>

      <details className={styles.details}>
        <summary>
          <Share2 size={16} aria-hidden="true" /> Como instalar pelo Safari
        </summary>
        <ol>
          <li>Abra o endereço do Meu Repertório no Safari.</li>
          <li>Toque em Compartilhar.</li>
          <li>Selecione Adicionar à Tela de Início.</li>
          <li>Confirme em Adicionar.</li>
        </ol>
        <p className={styles.note}>
          O aplicativo não exibe um botão de instalação: no iOS, a instalação é confirmada pelo menu
          do Safari.
        </p>
      </details>
    </section>
  );
}
