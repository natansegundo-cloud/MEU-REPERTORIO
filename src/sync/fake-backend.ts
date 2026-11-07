import type { PullPage, RemoteRow, SyncBackend, SyncCursor, SyncTable } from './contracts';

type TableRows = Map<string, RemoteRow>;

function cloneRow(row: RemoteRow): RemoteRow {
  return structuredClone(row);
}

function tableMap(tables: Record<SyncTable, TableRows>, table: SyncTable): TableRows {
  return tables[table];
}

export class InMemorySyncBackend implements SyncBackend {
  private logicalTime = 0;
  private readonly tables: Record<SyncTable, TableRows> = {
    songs: new Map(),
    repertories: new Map(),
    repertoryItems: new Map(),
  };

  seed(table: SyncTable, rows: readonly RemoteRow[]): void {
    for (const row of rows) tableMap(this.tables, table).set(row.id, cloneRow(row));
  }

  snapshot(table: SyncTable): RemoteRow[] {
    return [...tableMap(this.tables, table).values()].map(cloneRow);
  }

  pull(
    table: SyncTable,
    userId: string,
    cursor: SyncCursor | null,
    limit: number,
  ): Promise<PullPage> {
    const rows = [...tableMap(this.tables, table).values()]
      .filter(
        (row) => row.user_id === userId && (!cursor || this.compareRowToCursor(row, cursor) > 0),
      )
      .sort((left, right) => left.updated_at.localeCompare(right.updated_at));
    rows.sort((left, right) => {
      const timeComparison = left.updated_at.localeCompare(right.updated_at);
      return timeComparison !== 0 ? timeComparison : left.id.localeCompare(right.id);
    });
    const page = rows.slice(0, limit).map(cloneRow);
    const last = page.at(-1);
    const nextCursor = last ? { updatedAt: last.updated_at, id: last.id } : cursor;
    return Promise.resolve({
      rows: page,
      nextCursor,
      hasMore: rows.length > page.length,
    });
  }

  private compareRowToCursor(row: RemoteRow, cursor: SyncCursor): number {
    const timeComparison = row.updated_at.localeCompare(cursor.updatedAt);
    return timeComparison !== 0 ? timeComparison : row.id.localeCompare(cursor.id);
  }

  push(
    table: SyncTable,
    userId: string,
    rows: readonly RemoteRow[],
  ): Promise<readonly RemoteRow[]> {
    const records = tableMap(this.tables, table);
    const results: RemoteRow[] = [];
    for (const row of rows) {
      if (row.user_id !== userId) throw new Error('Usuario invalido no backend falso.');
      const current = records.get(row.id);
      // Empate de revision preserva a versao ja aceita pelo servidor.
      if (!current || row.revision > current.revision) {
        const updated = { ...cloneRow(row), updated_at: this.nextServerTimestamp() } as RemoteRow;
        records.set(row.id, updated);
        results.push(cloneRow(updated));
      } else {
        results.push(cloneRow(current));
      }
    }
    return Promise.resolve(results);
  }

  private nextServerTimestamp(): string {
    this.logicalTime += 1;
    return new Date(Date.UTC(2026, 0, 1, 0, 0, this.logicalTime)).toISOString();
  }
}
