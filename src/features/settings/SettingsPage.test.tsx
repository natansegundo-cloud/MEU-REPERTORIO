import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/database';
import { APPEARANCE_PREFERENCE_KEY, getPreference, resetAppearanceForTests } from '@/services';

import { SettingsPage } from './SettingsPage';

describe('SettingsPage', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
    document.head.innerHTML = '<meta name="theme-color" content="#f5f5f7" />';
    resetAppearanceForTests();
  });

  afterEach(() => {
    resetAppearanceForTests();
  });

  it('organiza os ajustes em seções e cards consistentes, incluindo Aparência', () => {
    render(<SettingsPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'Preferências' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Aparência' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Dados' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Instalação' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Nuvem e conta' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: 'Tema' })).toBeInTheDocument();
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

  it('alterna entre Sistema, Claro e Escuro persistindo a preferência', async () => {
    render(<SettingsPage />);

    const systemRadio = screen.getByRole('radio', { name: 'Sistema' });
    const lightRadio = screen.getByRole('radio', { name: 'Claro' });
    const darkRadio = screen.getByRole('radio', { name: 'Escuro' });

    expect(systemRadio).toBeChecked();

    fireEvent.click(darkRadio);

    await waitFor(async () => {
      expect(darkRadio).toBeChecked();
      expect(document.documentElement.dataset.theme).toBe('dark');
      expect(await getPreference(APPEARANCE_PREFERENCE_KEY, 'system')).toBe('dark');
    });

    fireEvent.click(lightRadio);

    await waitFor(async () => {
      expect(lightRadio).toBeChecked();
      expect(document.documentElement.dataset.theme).toBe('light');
      expect(await getPreference(APPEARANCE_PREFERENCE_KEY, 'system')).toBe('light');
    });
  });
});
