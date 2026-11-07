import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/database';

import { importSong, softDeleteSong } from './songs';
import {
  addSongsToRepertory,
  createRepertory,
  duplicateRepertory,
  getRepertoryDetail,
  listRepertories,
  removeRepertoryItem,
  renameRepertory,
  reorderRepertoryItem,
  softDeleteRepertory,
  updateRepertoryItemKey,
} from './repertories';

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  if (db.isOpen()) db.close();
  await db.delete();
});

describe('repertory service', () => {
  it('cria, renomeia, duplica e exclui logicamente um repertório', async () => {
    const created = await createRepertory('Set acústico');
    const renamed = await renameRepertory(created.id, 'Set acústico de sábado', created.revision);
    const copy = await duplicateRepertory(renamed.id);

    expect(renamed.revision).toBe(2);
    expect(renamed.updatedAt).not.toBe(created.updatedAt);
    expect(copy.name).toBe('Set acústico de sábado (cópia)');
    expect((await listRepertories()).map((item) => item.name)).toEqual([
      'Set acústico de sábado',
      'Set acústico de sábado (cópia)',
    ]);

    await softDeleteRepertory(renamed.id, renamed.revision);
    expect((await listRepertories()).map((item) => item.id)).toEqual([copy.id]);
    expect((await db.repertories.get(renamed.id))?.deletedAt).not.toBeNull();
  });

  it('adiciona, reordena e mantém a ordem depois de reabrir o banco', async () => {
    const songs = await Promise.all([
      importSong('C\nPrimeira', { title: 'Primeira' }),
      importSong('D\nSegunda', { title: 'Segunda' }),
      importSong('E\nTerceira', { title: 'Terceira' }),
    ]);
    const repertory = await createRepertory('Ordem de teste');
    const updated = await addSongsToRepertory(
      repertory.id,
      songs.map((song) => song.id),
      repertory.revision,
    );
    const beforeMove = await getRepertoryDetail(repertory.id);
    const third = beforeMove?.items[2]?.item;
    if (!third || !beforeMove) throw new Error('Item de teste não criado.');

    const reordered = await reorderRepertoryItem(repertory.id, third.id, 0, updated.revision);
    expect(reordered.revision).toBe(updated.revision + 1);
    db.close();
    await db.open();
    const afterReload = await getRepertoryDetail(repertory.id);
    expect(afterReload?.items.map((entry) => entry.song?.title)).toEqual([
      'Terceira',
      'Primeira',
      'Segunda',
    ]);
  });

  it('mantém o tom próprio no item sem alterar a música', async () => {
    const song = await importSong('Tom: C\nC\nLetra', { title: 'Canção' });
    const repertory = await createRepertory('Tom alternativo');
    const updated = await addSongsToRepertory(repertory.id, [song.id], repertory.revision);
    const detail = await getRepertoryDetail(repertory.id);
    const item = detail?.items[0]?.item;
    if (!item) throw new Error('Item de teste não criado.');

    await updateRepertoryItemKey(item.id, 'D');
    const changed = await getRepertoryDetail(repertory.id);
    expect(changed?.items[0]?.item.preferredKey).toBe('D');
    expect(changed?.items[0]?.song?.preferredKey).toBeNull();
    expect((await db.songs.get(song.id))?.originalKey).toBe('C');
    expect((await db.repertories.get(repertory.id))?.revision).toBe(updated.revision + 1);

    await removeRepertoryItem(item.id);
    expect((await getRepertoryDetail(repertory.id))?.items).toHaveLength(0);
    expect((await db.repertoryItems.get(item.id))?.deletedAt).not.toBeNull();
  });

  it('preserva o item quando a música é excluída da biblioteca', async () => {
    const song = await importSong('G\nMúsica removida', { title: 'Removida' });
    const repertory = await createRepertory('Itens preservados');
    const updated = await addSongsToRepertory(repertory.id, [song.id], repertory.revision);
    await softDeleteSong(song.id);

    const detail = await getRepertoryDetail(repertory.id);
    expect(detail?.items).toHaveLength(1);
    expect(detail?.items[0]?.song).toBeNull();
    expect(detail?.repertory.revision).toBe(updated.revision);
  });
});
