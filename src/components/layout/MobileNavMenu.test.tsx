import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { SectionId } from '@/app/navigation';

import { MobileNavMenu } from './MobileNavMenu';

function renderMenu(activeSection: SectionId = 'library') {
  return render(<MobileNavMenu activeSection={activeSection} onSectionChange={vi.fn()} />);
}

describe('MobileNavMenu', () => {
  it('abre com os atributos acessíveis, foco no primeiro item e seção ativa', async () => {
    const user = userEvent.setup();
    renderMenu('favorites');

    const trigger = screen.getByRole('button', { name: 'Abrir menu' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls', 'mobile-navigation-menu');

    await user.click(trigger);

    const navigation = screen.getByRole('navigation', { name: 'Navegação móvel' });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(navigation).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Favoritos' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Biblioteca' })).toHaveFocus();
  });

  it('navega, fecha ao tocar fora e devolve o foco ao acionador', async () => {
    const user = userEvent.setup();
    const onSectionChange = vi.fn();
    render(<MobileNavMenu activeSection="library" onSectionChange={onSectionChange} />);

    const trigger = screen.getByRole('button', { name: 'Abrir menu' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Repertórios' }));

    expect(onSectionChange).toHaveBeenCalledWith('repertories');
    expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await user.click(screen.getByRole('button', { name: 'Fechar menu ao tocar fora' }));
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });

  it('fecha com Escape', async () => {
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });
});
