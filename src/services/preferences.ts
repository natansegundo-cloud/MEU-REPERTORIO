import { db, openDatabase } from '@/database';
import type { JsonValue } from '@/types';

export async function getPreference<T>(key: string, fallback: T): Promise<T> {
  await openDatabase();
  const preference = await db.preferences.get(key);
  return (preference?.value as T | undefined) ?? fallback;
}

export async function setPreference(key: string, value: JsonValue): Promise<void> {
  await openDatabase();
  await db.preferences.put({
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
}
