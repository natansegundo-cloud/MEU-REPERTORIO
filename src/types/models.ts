/** Identificador estável de uma entidade local. */
import type { ParsedSong } from './parser';

export type EntityId = string;

/** Data em ISO 8601, sempre em UTC. */
export type IsoDateString = string;

export type JsonPrimitive = string | number | boolean | null;

/** Valor serializável, seguro para backup e restauração em JSON. */
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

/**
 * Campos comuns às entidades que podem ser editadas e, futuramente,
 * sincronizadas.
 */
export interface BaseEntity {
  id: EntityId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  /** Exclusão lógica; registros nunca são apagados automaticamente. */
  deletedAt: IsoDateString | null;
  /** Incrementada a cada escrita local; base para resolução de conflitos futura. */
  revision: number;
  /** Indica que a versao local ainda precisa ser enviada a nuvem. */
  syncPending: boolean;
  /** Falha do ultimo envio desta entidade; mantida para exibicao e nova tentativa. */
  syncError?: string | null;
  /** Identificador preservado ao importar dados de outra versao do app. */
  legacyId?: string;
}

export interface Song extends BaseEntity {
  title: string;
  artist: string | null;
  originalKey: string | null;
  currentKey: string | null;
  preferredKey: string | null;
  capo: number | null;
  tuning: string | null;
  rhythm: string | null;
  strumming: string | null;
  difficulty: string | null;
  /** Texto bruto da importação original, preservado para auditoria e backup. */
  content: string;
  structure: ParsedSong;
  notes: string | null;
}

export interface Repertory extends BaseEntity {
  name: string;
  description: string | null;
}

export interface RepertoryItem extends BaseEntity {
  repertoryId: EntityId;
  songId: EntityId;
  position: number;
  /** Tom usado somente nesta apresentação do repertório. */
  preferredKey: string | null;
}

export interface Favorite {
  songId: EntityId;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
  deletedAt: IsoDateString | null;
  revision: number;
}

/** Preferência de interface, por exemplo tema, tamanho de fonte ou capotraste. */
export interface Preference {
  key: string;
  value: JsonValue;
  updatedAt: IsoDateString;
}

/** Configuração técnica do aplicativo ou do dispositivo. */
export interface Setting {
  key: string;
  value: JsonValue;
  updatedAt: IsoDateString;
}
