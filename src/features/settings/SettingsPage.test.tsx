import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  it('organiza os ajustes em seções e cards consistentes', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Preferências' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Dados' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Instalação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Nuvem e conta' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Versão e armazenamento' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Backup e restauração' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: 'Adicionar à Tela de Início' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Nuvem' })).toBeInTheDocument();

    expect(screen.getByText('Como instalar pelo Safari').closest('details')).not.toHaveAttribute(
      'open',
    );
    expect(screen.getByText('Sobre o formato do backup').closest('details')).not.toHaveAttribute(
      'open',
    );
  });
});
