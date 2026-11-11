import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/database';
import { addSongsToRepertory, createRepertory, importSong, toggleFavorite } from '@/services';

import { App } from './App';

async function resetDatabase(): Promise<void> {
  if (db.isOpen()) db.close();
  await db.delete();
  await db.open();
}

function currentHash(): string {
  return window.location.hash;
}

async function openFirstSong(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.click(within(await screen.findByTestId('song-card')).getAllByRole('button')[0]!);
}

function goBackThroughHistory(): void {
  act(() => {
    window.history.back();
  });
}

describe('navigation integration', () => {
  beforeEach(resetDatabase);

  afterEach(async () => {
    vi.restoreAllMocks();
    if (db.isOpen()) db.close();
    await db.delete();
  });

  it('abre uma música e volta pela história do navegador', async () => {
    const user = userEvent.setup();
    const song = await importSong('C\nLetra da canção', { title: 'Canção navegável' });
    render(<App />);

    await openFirstSong(user);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Canção navegável' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#library/song/${song.id}`);

    goBackThroughHistory();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Biblioteca' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe('#library');
  });

  it('abre a edição, volta para a música e depois para a biblioteca', async () => {
    const user = userEvent.setup();
    const song = await importSong('D\nLetra', { title: 'Música em camadas' });
    render(<App />);

    await openFirstSong(user);
    await user.click(await screen.findByRole('button', { name: 'Editar música' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Editar música' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#library/song/${song.id}/edit`);

    await user.click(screen.getByRole('button', { name: 'Voltar para a música' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Música em camadas' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#library/song/${song.id}`);

    await user.click(screen.getByRole('button', { name: 'Voltar para a biblioteca' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Biblioteca' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe('#library');
  });

  it('restaura o contexto dos favoritos ao voltar da música', async () => {
    const user = userEvent.setup();
    const song = await importSong('E\nLetra favorita', { title: 'Canção favorita' });
    await toggleFavorite(song.id);
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });
    await user.click(within(navigation).getByRole('button', { name: 'Favoritos' }));
    await user.click(within(await screen.findByTestId('song-card')).getAllByRole('button')[0]!);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Canção favorita' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#favorites/song/${song.id}`);

    await user.click(screen.getByRole('button', { name: 'Voltar para os favoritos' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Favoritos' })).toBeInTheDocument();
    expect(currentHash()).toBe('#favorites');
  });

  it('retorna da importação para a biblioteca', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(await screen.findByRole('button', { name: 'Adicionar conteúdo' }));
    await user.click(await screen.findByRole('menuitem', { name: 'Adicionar música' }));

    expect(await screen.findByRole('heading', { name: 'Importar cifra' })).toBeInTheDocument();
    expect(currentHash()).toBe('#library/import');

    await user.click(screen.getByRole('button', { name: 'Voltar para a biblioteca' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Biblioteca' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe('#library');
  });

  it('retorna do modo show para o repertório de origem', async () => {
    const user = userEvent.setup();
    const song = await importSong('G\nRefrão', { title: 'Música do show' });
    const repertory = await createRepertory('Apresentação');
    await addSongsToRepertory(repertory.id, [song.id], repertory.revision);
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Navegação principal' });
    await user.click(within(navigation).getByRole('button', { name: 'Repertórios' }));
    await user.click(
      within(await screen.findByTestId('repertory-card')).getAllByRole('button')[0]!,
    );

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Apresentação' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tocar' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Música do show' }),
    ).toBeInTheDocument();
    expect(currentHash()).toMatch(new RegExp(`^#show/${repertory.id}(/|$)`));

    await user.click(screen.getByRole('button', { name: 'Sair' }));
    const exitGroup = screen.getByRole('group', { name: 'Confirmar saída do modo show' });
    await user.click(within(exitGroup).getByRole('button', { name: 'Sair' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Apresentação' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#repertories/${repertory.id}`);
  });

  it('bloqueia a navegação do navegador quando há alterações não salvas', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const song = await importSong('A\nLetra', { title: 'Edição protegida' });
    render(<App />);

    await openFirstSong(user);
    await user.click(await screen.findByRole('button', { name: 'Editar música' }));
    await user.type(await screen.findByLabelText('Título'), ' alterada');

    goBackThroughHistory();

    await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { level: 1, name: 'Editar música' })).toBeInTheDocument();
    expect(currentHash()).toBe(`#library/song/${song.id}/edit`);

    confirm.mockReturnValue(true);
    goBackThroughHistory();

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Edição protegida' }),
    ).toBeInTheDocument();
    expect(currentHash()).toBe(`#library/song/${song.id}`);
  });
});
