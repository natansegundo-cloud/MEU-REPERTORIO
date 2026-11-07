import { parseTonality, transposeTonality } from '@/features/transpose';
import type { RepertoryItem, Song } from '@/types';

export function keyShift(from: string | null, to: string | null): number {
  const source = from ? parseTonality(from) : null;
  const target = to ? parseTonality(to) : null;
  if (!source || !target || source.mode !== target.mode) return 0;
  return (target.tonic.pitchClass - source.tonic.pitchClass + 12) % 12;
}

export function baseSongStructure(song: Song) {
  return {
    ...song.structure,
    currentKey: song.originalKey ?? song.structure.currentKey,
    metadata: {
      ...song.structure.metadata,
      currentKey: song.originalKey ?? song.structure.currentKey,
    },
  };
}

export function startingKey(song: Song, item?: RepertoryItem): string | null {
  return item?.preferredKey ?? song.preferredKey ?? song.originalKey ?? song.structure.currentKey;
}

export function keySpelling(key: string | null): 'flat' | 'sharp' {
  return key?.includes('b') ? 'flat' : 'sharp';
}

export function keyForShift(
  sourceKey: string | null,
  shift: number,
  spellingKey: string | null = sourceKey,
): string | null {
  if (!sourceKey) return null;
  return transposeTonality(sourceKey, shift, keySpelling(spellingKey));
}
