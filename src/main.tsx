import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import { App } from '@/app/App';
import { ErrorBoundary } from '@/components/system/ErrorBoundary';
import { requestPersistentStorage } from '@/services/storage';

import './styles/global.css';

const reload = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event('pwa:need-refresh'));
  },
});

window.addEventListener('pwa:apply-update', () => {
  void reload(true);
});

void requestPersistentStorage();

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemento raiz da aplicação não encontrado.');
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
