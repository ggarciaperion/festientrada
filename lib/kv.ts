// lib/kv.ts — Upstash Redis REST client (no @upstash/redis package needed)
// Falls back gracefully when env vars are absent.

const REST_URL   = process.env.UPSTASH_REDIS_REST_URL;
const REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

export function kvAvailable(): boolean {
  return !!(REST_URL && REST_TOKEN);
}

async function cmd(args: (string | number)[]): Promise<unknown> {
  if (!kvAvailable()) return null;
  const res = await fetch(REST_URL!, {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${REST_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body:  JSON.stringify(args),
    cache: 'no-store',
  });
  const json = await res.json() as { result: unknown; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

/** Returns the stored string value, or null if key doesn't exist. */
export async function kvGet(key: string): Promise<string | null> {
  return (await cmd(['GET', key])) as string | null;
}

/**
 * SET key value EX seconds NX — atomic "only set if not exists".
 * Returns true on first write, false if key already existed.
 * Always returns true when Redis is not configured (no dedup protection).
 */
export async function kvSetNX(key: string, value: string, exSeconds: number): Promise<boolean> {
  if (!kvAvailable()) return true;
  const result = await cmd(['SET', key, value, 'EX', exSeconds, 'NX']);
  return result === 'OK';
}

/** Unconditional SET with expiry. */
export async function kvSet(key: string, value: string, exSeconds: number): Promise<void> {
  await cmd(['SET', key, value, 'EX', exSeconds]);
}

/** Prepend value to a list (no expiry — used for audit log). */
export async function kvLPush(key: string, value: string): Promise<void> {
  if (!kvAvailable()) return;
  await cmd(['LPUSH', key, value]);
}

/** Read up to `count` items from a list (newest first). */
export async function kvLRange(key: string, start: number, stop: number): Promise<string[]> {
  if (!kvAvailable()) return [];
  const result = await cmd(['LRANGE', key, start, stop]);
  return Array.isArray(result) ? (result as string[]) : [];
}

/** Delete one key. */
export async function kvDel(key: string): Promise<void> {
  if (!kvAvailable()) return;
  await cmd(['DEL', key]);
}

/** Fetch multiple keys in a single round-trip (MGET). */
export async function kvMGet(keys: string[]): Promise<(string | null)[]> {
  if (!kvAvailable() || keys.length === 0) return keys.map(() => null);
  return (await cmd(['MGET', ...keys])) as (string | null)[];
}
