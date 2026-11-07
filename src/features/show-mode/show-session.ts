import type { RepertoryEntry } from '@/services';
import type { Song } from '@/types';

export type PlayableEntry = RepertoryEntry & { readonly song: Song };

export interface ShowSession {
  readonly entries: readonly PlayableEntry[];
  readonly index: number;
}

export function getPlayableEntries(entries: readonly RepertoryEntry[]): PlayableEntry[] {
  return entries.filter((entry): entry is PlayableEntry => entry.song !== null);
}

export function clampShowIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.max(0, Math.min(length - 1, Math.trunc(index)));
}

export function initialShowIndex(
  entries: readonly PlayableEntry[],
  savedIndex: number,
  requestedItemId?: string | null,
): number {
  if (requestedItemId) {
    const requested = entries.findIndex((entry) => entry.item.id === requestedItemId);
    if (requested >= 0) return requested;
  }
  return clampShowIndex(savedIndex, entries.length);
}

export function createShowSession(
  entries: readonly RepertoryEntry[],
  savedIndex = 0,
  requestedItemId?: string | null,
): ShowSession {
  const playable = getPlayableEntries(entries);
  return {
    entries: playable,
    index: initialShowIndex(playable, savedIndex, requestedItemId),
  };
}

export function moveShowSession(session: ShowSession, direction: -1 | 1): ShowSession {
  return {
    ...session,
    index: clampShowIndex(session.index + direction, session.entries.length),
  };
}

export function jumpShowSession(session: ShowSession, index: number): ShowSession {
  return { ...session, index: clampShowIndex(index, session.entries.length) };
}

export function canMoveShowSession(session: ShowSession, direction: -1 | 1): boolean {
  const next = session.index + direction;
  return next >= 0 && next < session.entries.length;
}
