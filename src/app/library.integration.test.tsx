import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/database';
import { importSong } from '@/services';

import { App } from './App';

async function openSongImport(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
  await user.click(await screen.findByRole('menuitem', { name: 'Adicionar música' }));
}

beforeEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
});

afterEach(async () => {
  vi.restoreAllMocks();
  if (db.isOpen()) db.close();
  await db.delete();
});

describe('library integration', () => {
  it('importa, pesquisa, abre e exclui uma música pela interface', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App />);

    await openSongImport(user);
    expect(await screen.findByRole('heading', { name: 'Importar cifra' })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/título/i), 'Uma Vez Mais');
    await user.type(screen.getByLabelText(/artista/i), 'Natiruts');
    await user.type(
      screen.getByLabelText(/letra e cifras/i),
      'Tom: A\nA7M        E/G#\nMinha letra',
    );
    await user.click(screen.getByRole('button', { name: 'Importar música' }));

    expect(
      await screen.findByText('“Uma Vez Mais” foi adicionada à biblioteca.'),
    ).toBeInTheDocument();
    expect(await screen.findByText('Natiruts')).toBeInTheDocument();

    await user.type(screen.getByRole('searchbox'), 'Natiruts');
    expect(await screen.findByTestId('song-card')).toBeInTheDocument();
    await user.click(within(screen.getByTestId('song-card')).getAllByRole('button')[0]!);

    expect(await screen.findByRole('heading', { name: 'Uma Vez Mais' })).toBeInTheDocument();
    expect(screen.getByText('Minha letra')).toBeInTheDocument();
    expect(screen.getByLabelText('Cifras')).toHaveTextContent('A7M');

    await user.click(screen.getByRole('button', { name: 'Voltar para a biblioteca' }));
    await user.click(
      within(await screen.findByTestId('song-card')).getByRole('button', {
        name: 'Excluir Uma Vez Mais',
      }),
    );

    await waitFor(() => expect(screen.queryByTestId('song-card')).not.toBeInTheDocument());
    expect(confirm).toHaveBeenCalled();
  });

  it('edita metadados, letra e cifras e reflete o resultado na visualização', async () => {
    const user = userEvent.setup();
    render(<App />);

    await openSongImport(user);
    await user.type(screen.getByLabelText(/título/i), 'Música editável');
    await user.type(screen.getByLabelText(/letra e cifras/i), 'C\nLetra original');
    await user.click(screen.getByRole('button', { name: 'Importar música' }));
    await user.click(within(await screen.findByTestId('song-card')).getAllByRole('button')[0]!);

    await user.click(await screen.findByRole('button', { name: 'Editar música' }));
    expect(await screen.findByRole('heading', { name: 'Editar música' })).toBeInTheDocument();
    await user.clear(screen.getByLabelText('Título'));
    await user.type(screen.getByLabelText('Título'), 'Música atualizada');
    await user.clear(screen.getByLabelText('Letra'));
    await user.type(screen.getByLabelText('Letra'), 'Letra corrigida');
    await user.click(screen.getByRole('button', { name: 'Adicionar cifra' }));
    await user.click(screen.getAllByRole('button', { name: 'Salvar alterações' })[0]!);

    expect(await screen.findByText('Alterações salvas com sucesso.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Voltar para a música' }));
    expect(await screen.findByRole('heading', { name: 'Música atualizada' })).toBeInTheDocument();
    expect(screen.getByText('Letra corrigida')).toBeInTheDocument();
  });

  it('confirma a saída quando existem alterações não salvas', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<App />);

    await openSongImport(user);
    await user.type(screen.getByLabelText(/letra e cifras/i), 'C\nLetra');
    await user.click(screen.getByRole('button', { name: 'Importar música' }));
    await user.click(within(await screen.findByTestId('song-card')).getAllByRole('button')[0]!);
    await user.click(await screen.findByRole('button', { name: 'Editar música' }));
    expect(await screen.findByRole('heading', { name: 'Editar música' })).toBeInTheDocument();
    await user.type(screen.getByLabelText('Título'), ' alterada');

    await user.click(screen.getByRole('button', { name: 'Repertórios' }));
    expect(screen.getByRole('heading', { name: 'Editar música' })).toBeInTheDocument();
    expect(confirm).toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await user.click(screen.getByRole('button', { name: 'Repertórios' }));
    expect(await screen.findByRole('heading', { name: 'Repertórios' })).toBeInTheDocument();
  });

  it('cria um repertório pela interface e adiciona várias músicas', async () => {
    const user = userEvent.setup();
    const first = await importSong('C\nPrimeira', { title: 'Primeira' });
    const second = await importSong('D\nSegunda', { title: 'Segunda' });
    render(<App />);

    await user.click(
      within(screen.getByRole('navigation', { name: 'Navegação principal' })).getByRole('button', {
        name: 'Repertórios',
      }),
    );
    await user.type(screen.getByLabelText('Novo repertório'), 'Ensaio');
    await user.click(screen.getByRole('button', { name: 'Criar repertório' }));
    await user.click(
      within(await screen.findByTestId('repertory-card')).getAllByRole('button')[0]!,
    );
    expect(await screen.findByRole('heading', { name: 'Ensaio' })).toBeInTheDocument();

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(2);
    await user.click(checkboxes[0]!);
    await user.click(checkboxes[1]!);
    await user.click(screen.getByRole('button', { name: 'Adicionar (2)' }));

    await waitFor(() => expect(screen.getAllByTestId('repertory-item')).toHaveLength(2));
    expect(screen.getByText(first.title)).toBeInTheDocument();
    expect(screen.getByText(second.title)).toBeInTheDocument();
  });
});
