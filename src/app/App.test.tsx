import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renderiza a seção inicial e a navegação principal', async () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'Biblioteca' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeInTheDocument();
    expect(await screen.findByText('Sua biblioteca começa aqui')).toBeInTheDocument();
  });

  it('troca a seção ativa pela navegação', async () => {
    const user = userEvent.setup();
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });

    await user.click(within(navigation).getByRole('button', { name: 'Repertórios' }));

    expect(screen.getByRole('heading', { level: 1, name: 'Repertórios' })).toBeInTheDocument();
    expect(within(navigation).getByRole('button', { name: 'Repertórios' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('abre o menu mobile e devolve o foco ao fechar com Escape', async () => {
    const user = userEvent.setup();
    render(<App />);

    const trigger = screen.getByRole('button', { name: 'Abrir menu' });
    await user.click(trigger);

    const mobileNavigation = screen.getByRole('navigation', { name: 'Navegação móvel' });
    expect(mobileNavigation).toBeInTheDocument();
    expect(within(mobileNavigation).getByRole('button', { name: 'Biblioteca' })).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('navigation', { name: 'Navegação móvel' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveFocus();
  });
});
