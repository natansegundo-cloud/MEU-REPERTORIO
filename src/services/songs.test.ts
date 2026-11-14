import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/database';

import {
  getSong,
  importSong,
  importSongsBatch,
  listSongs,
  searchSongs,
  softDeleteSong,
  SongImportError,
  SongRevisionConflictError,
  updateSong,
  updateSongMetadata,
  updateSongPreferredKey,
} from './songs';

import { updateLineText } from '@/features/library/editor-model';

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
});

describe('song service', () => {
  it('importa, estrutura e recupera uma música do parser', async () => {
    const song = await importSong(`Tom: A
A7M        E/G#
Minha letra`);

    expect(song.title).toBe('Música sem título');
    expect(song.originalKey).toBe('A');
    expect(song.content).toContain('Minha letra');
    expect(song.structure.report.chordCount).toBe(2);
    expect((await getSong(song.id))?.structure.lines[0]?.chords[1]?.position).toBe(11);
  });

  it('complementa metadados e pesquisa por título, artista ou tom', async () => {
    await importSong('C\nLetra', { title: 'O Sol', artist: 'Vitor Kley' });
    await importSong('Tom: G\nG\nOutra letra', { title: 'Outra música', artist: 'Banda' });

    expect((await searchSongs('vitor'))[0]?.title).toBe('O Sol');
    expect((await searchSongs('outra'))[0]?.artist).toBe('Banda');
    expect((await searchSongs('g'))[0]?.title).toBe('Outra música');
    expect(await listSongs()).toHaveLength(2);
  });

  it('preserva observações fornecidas pela revisão da importação', async () => {
    const song = await importSong('C\nLetra', {
      notes: 'Composição de: Autoria\nAfinação: padrão',
    });

    expect(song.notes).toBe('Composição de: Autoria\nAfinação: padrão');
  });

  it('impede salvar conteúdo vazio e preserva os diagnósticos do parser', async () => {
    await expect(importSong('   ')).rejects.toBeInstanceOf(SongImportError);
    await expect(listSongs()).resolves.toHaveLength(0);
  });

  it('evita duplicação acidental pelo conteúdo original', async () => {
    const input = 'C\nA letra';
    const song = await importSong(input, { title: 'Primeira' });

    await expect(importSong(input, { title: 'Segunda' })).rejects.toMatchObject({
      name: 'SongAlreadyExistsError',
      songId: song.id,
    });
  });

  it('reconhece duplicata mesmo com espaços e quebras de linha diferentes', async () => {
    const song = await importSong('Tom: C\n\nC   G\nA letra', {
      title: 'Canção',
      artist: 'Artista',
    });

    await expect(
      importSong('\n\nC   G\nA letra\n\n', { title: 'Canção', artist: 'Artista' }),
    ).rejects.toMatchObject({ name: 'SongAlreadyExistsError', songId: song.id });
  });

  it('reconhece duplicata pelo corpo quando o título informado muda', async () => {
    const song = await importSong('C\nA letra', { title: 'Primeira', artist: 'Artista' });

    await expect(
      importSong('\nC\nA letra\n', { title: 'Segunda', artist: 'Artista' }),
    ).rejects.toMatchObject({ name: 'SongAlreadyExistsError', songId: song.id });
  });

  it('reconhece duplicata por título e artista mesmo com conteúdo diferente', async () => {
    const song = await importSong('C\nPrimeira letra', { title: 'Mesma', artist: 'Artista' });

    await expect(
      importSong('G\nOutra letra', { title: 'Mesma', artist: 'Artista' }),
    ).rejects.toMatchObject({ name: 'SongAlreadyExistsError', songId: song.id });
  });

  it('permite músicas homônimas de artistas diferentes', async () => {
    await importSong('C\nLetra um', { title: 'Homônima', artist: 'Artista A' });
    const second = await importSong('G\nLetra dois', { title: 'Homônima', artist: 'Artista B' });

    expect(second.title).toBe('Homônima');
    expect(await listSongs()).toHaveLength(2);
  });

  it('reconhece duplicata dentro do próprio lote', async () => {
    const result = await importSongsBatch([
      { content: 'C\nA letra', title: 'Primeira', artist: 'Artista' },
      { content: '\n\nC\nA letra\n', title: 'Segunda', artist: 'Artista' },
    ]);

    expect(result.saved.map((song) => song.title)).toEqual(['Primeira']);
    expect(result.duplicates).toEqual(['Segunda']);
    expect(await listSongs()).toHaveLength(1);
  });

  it('salva um lote atomicamente e ignora conteúdos duplicados', async () => {
    await importSong('C\nJá existe', { title: 'Local' });
    const result = await importSongsBatch([
      { content: 'C\nJá existe', title: 'Duplicada' },
      { content: 'G\nNova música', title: 'Nova' },
    ]);

    expect(result.saved.map((song) => song.title)).toEqual(['Nova']);
    expect(result.duplicates).toEqual(['Duplicada']);
    expect(await listSongs()).toHaveLength(2);
  });

  it('não grava nenhum item do lote quando um bloco é inválido', async () => {
    await expect(
      importSongsBatch([
        { content: 'C\nVálida', title: 'Válida' },
        { content: '   ', title: 'Inválida' },
      ]),
    ).rejects.toBeInstanceOf(SongImportError);
    await expect(listSongs()).resolves.toHaveLength(0);
  });

  it('atualiza metadados com nova revisão e faz exclusão lógica', async () => {
    const song = await importSong('C\nLetra', { title: 'Rascunho' });
    const updated = await updateSongMetadata(song.id, { title: 'Título final', artist: 'Artista' });

    expect(updated.title).toBe('Título final');
    expect(updated.revision).toBe(2);
    expect((await listSongs()).map((item) => item.title)).toEqual(['Título final']);

    await softDeleteSong(song.id);
    expect(await listSongs()).toEqual([]);
    expect((await db.songs.get(song.id))?.deletedAt).not.toBeNull();
  });

  it('mantém os dados disponíveis depois de fechar e reabrir o banco', async () => {
    const song = await importSong('C\nLetra', { title: 'Persistente' });
    db.close();
    await db.open();

    await expect(getSong(song.id)).resolves.toMatchObject({ title: 'Persistente' });
  });

  it('salva edição estruturada, campos musicais e tom preferido', async () => {
    const song = await importSong('Tom: C\nC       G\nLetra original', {
      title: 'Original',
      artist: 'Artista',
    });
    const structure = updateLineText(song.structure, 0, 'Letra atualizada');
    const updated = await updateSong(
      song.id,
      {
        title: 'Título editado',
        artist: 'Novo artista',
        structure,
        preferredKey: 'D',
        capo: 2,
        tuning: 'Padrão',
        rhythm: '4/4',
        strumming: '↓ ↓ ↑ ↑',
        difficulty: 'Média',
        notes: 'Entrar direto no refrão.',
      },
      song.revision,
    );

    expect(updated.revision).toBe(2);
    expect(updated.preferredKey).toBe('D');
    expect(updated.currentKey).toBe('D');
    expect(updated.structure.lines[0]?.lyricText).toBe('Letra atualizada');
    expect(updated.content).toContain('Letra original');
    expect((await getSong(song.id))?.notes).toBe('Entrar direto no refrão.');
  });

  it('rejeita salvar uma revisão antiga e não sobrescreve a edição mais nova', async () => {
    const song = await importSong('C\nLetra', { title: 'Inicial' });
    await updateSongMetadata(song.id, { title: 'Atualizada' });

    await expect(
      updateSong(
        song.id,
        {
          title: 'Sobrescrita indevida',
          artist: null,
          structure: song.structure,
          preferredKey: null,
          capo: null,
          tuning: null,
          rhythm: null,
          strumming: null,
          difficulty: null,
          notes: null,
        },
        song.revision,
      ),
    ).rejects.toBeInstanceOf(SongRevisionConflictError);
    await expect(getSong(song.id)).resolves.toMatchObject({ title: 'Atualizada', revision: 2 });
  });

  it('persiste o tom preferido e permite restaurar o original', async () => {
    const song = await importSong('Tom: A\nA\nLetra');
    const preferred = await updateSongPreferredKey(song.id, 'C', song.revision);
    expect(preferred.preferredKey).toBe('C');
    expect(preferred.structure.originalKey).toBe('A');

    const restored = await updateSongPreferredKey(song.id, null, preferred.revision);
    expect(restored.preferredKey).toBeNull();
    expect(restored.currentKey).toBe('A');
  });
});
