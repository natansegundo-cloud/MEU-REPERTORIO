import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { InstallHelp } from './InstallHelp';

const originalMatchMedia =
  typeof window.matchMedia === 'function' ? window.matchMedia.bind(window) : undefined;
const originalStandalone = Object.getOwnPropertyDescriptor(navigator, 'standalone');

afterEach(() => {
  if (originalMatchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: originalMatchMedia,
    });
  } else {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: undefined,
    });
  }
  if (originalStandalone) {
    Object.defineProperty(navigator, 'standalone', originalStandalone);
  } else {
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: undefined,
    });
  }
  vi.restoreAllMocks();
});

describe('InstallHelp', () => {
  it('explica a instalação pelo Safari sem oferecer um falso botão nativo', async () => {
    const user = userEvent.setup();
    render(<InstallHelp />);

    await user.click(screen.getByText('Como instalar pelo Safari'));

    expect(screen.getByText('Abra o endereço do Meu Repertório no Safari.')).toBeVisible();
    expect(screen.getByText('Toque em Compartilhar.')).toBeVisible();
    expect(screen.getByText('Selecione Adicionar à Tela de Início.')).toBeVisible();
    expect(screen.queryByRole('button', { name: /instalar/i })).not.toBeInTheDocument();
  });

  it('informa quando o modo standalone é detectado', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });

    render(<InstallHelp />);

    expect(screen.getByText('O aplicativo está aberto no modo instalado.')).toBeInTheDocument();
  });

  it('usa a detecção standalone legada do Safari quando disponível', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: vi.fn().mockReturnValue({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    });
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      value: true,
    });

    render(<InstallHelp />);

    expect(screen.getByText('O aplicativo está aberto no modo instalado.')).toBeInTheDocument();
  });
});
