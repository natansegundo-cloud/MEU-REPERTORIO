import type { Repertory, RepertoryItem, Song } from '@/types';

import type {
  RemoteRepertoryItemRow,
  RemoteRepertoryRow,
  RemoteRow,
  RemoteSongRow,
} from './contracts';

export function songToRemote(song: Song, userId: string): RemoteSongRow {
  return {
    user_id: userId,
    id: song.id,
    title: song.title,
    artist: song.artist,
    original_key: song.originalKey,
    current_key: song.currentKey,
    preferred_key: song.preferredKey,
    capo: song.capo,
    tuning: song.tuning,
    rhythm: song.rhythm,
    strumming: song.strumming,
    difficulty: song.difficulty,
    content: song.content,
    structure: song.structure,
    notes: song.notes,
    created_at: song.createdAt,
    updated_at: song.updatedAt,
    deleted_at: song.deletedAt,
    revision: song.revision,
  };
}

export function remoteToSong(row: RemoteSongRow): Song {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    originalKey: row.original_key,
    currentKey: row.current_key,
    preferredKey: row.preferred_key,
    capo: row.capo,
    tuning: row.tuning,
    rhythm: row.rhythm,
    strumming: row.strumming,
    difficulty: row.difficulty,
    content: row.content,
    structure: row.structure,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    revision: row.revision,
    syncPending: false,
    syncError: null,
  };
}

export function repertoryToRemote(repertory: Repertory, userId: string): RemoteRepertoryRow {
  return {
    user_id: userId,
    id: repertory.id,
    name: repertory.name,
    description: repertory.description,
    created_at: repertory.createdAt,
    updated_at: repertory.updatedAt,
    deleted_at: repertory.deletedAt,
    revision: repertory.revision,
  };
}

export function remoteToRepertory(row: RemoteRepertoryRow): Repertory {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    revision: row.revision,
    syncPending: false,
    syncError: null,
  };
}

export function repertoryItemToRemote(item: RepertoryItem, userId: string): RemoteRepertoryItemRow {
  return {
    user_id: userId,
    id: item.id,
    repertory_id: item.repertoryId,
    song_id: item.songId,
    position: item.position,
    preferred_key: item.preferredKey,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
    deleted_at: item.deletedAt,
    revision: item.revision,
  };
}

export function remoteToRepertoryItem(row: RemoteRepertoryItemRow): RepertoryItem {
  return {
    id: row.id,
    repertoryId: row.repertory_id,
    songId: row.song_id,
    position: row.position,
    preferredKey: row.preferred_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
    revision: row.revision,
    syncPending: false,
    syncError: null,
  };
}

export function localToRemote(row: Song | Repertory | RepertoryItem, userId: string): RemoteRow {
  if ('structure' in row) return songToRemote(row, userId);
  if ('repertoryId' in row) return repertoryItemToRemote(row, userId);
  return repertoryToRemote(row, userId);
}

export function remoteToLocal(row: RemoteRow): Song | Repertory | RepertoryItem {
  if ('structure' in row) return remoteToSong(row);
  if ('repertory_id' in row) return remoteToRepertoryItem(row);
  return remoteToRepertory(row);
}
