import { promises as fs } from "fs";
import path from "path";

export type CollectionName = "users" | "items" | "swaps";

const DATA_DIR = path.join(process.cwd(), "data");

function fileFor(name: CollectionName): string {
  return path.join(DATA_DIR, `${name}.json`);
}

/* -------------------------------------------------------------------------
 * A single global mutex serializes ALL writes across every collection.
 * This is intentionally simple (single lock, not per-collection) because
 * swap operations must atomically touch users.json + items.json + swaps.json
 * together; a single global queue avoids any possibility of interleaved
 * reads/writes producing an inconsistent cross-collection state.
 * ---------------------------------------------------------------------- */
let mutexQueue: Promise<unknown> = Promise.resolve();

function runExclusive<T>(fn: () => Promise<T>): Promise<T> {
  const result = mutexQueue.then(fn, fn);
  // Swallow errors in the queue chain itself so one failed op doesn't
  // permanently wedge the queue for subsequent callers.
  mutexQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readFileRaw(name: CollectionName): Promise<unknown[]> {
  await ensureDataDir();
  const file = fileFor(name);
  try {
    const raw = await fs.readFile(file, "utf-8");
    if (!raw.trim()) return [];
    return JSON.parse(raw) as unknown[];
  } catch (err: any) {
    if (err.code === "ENOENT") {
      await fs.writeFile(file, "[]", "utf-8");
      return [];
    }
    throw err;
  }
}

async function writeFileAtomic(
  name: CollectionName,
  data: unknown[]
): Promise<void> {
  await ensureDataDir();
  const file = fileFor(name);
  const tmp = path.join(
    DATA_DIR,
    `.${name}.${process.pid}.${Date.now()}.${Math.random()
      .toString(36)
      .slice(2)}.tmp`
  );
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), "utf-8");
  await fs.rename(tmp, file);
}

/** Read the entire collection (no lock needed for a plain read). */
export async function readCollection<T>(name: CollectionName): Promise<T[]> {
  return (await readFileRaw(name)) as T[];
}

/** Overwrite the entire collection atomically & exclusively. */
export async function writeCollection<T>(
  name: CollectionName,
  data: T[]
): Promise<void> {
  return runExclusive(() => writeFileAtomic(name, data));
}

export async function find<T>(
  name: CollectionName,
  predicate: (item: T) => boolean
): Promise<T[]> {
  const all = await readCollection<T>(name);
  return all.filter(predicate);
}

export async function findOne<T>(
  name: CollectionName,
  predicate: (item: T) => boolean
): Promise<T | undefined> {
  const all = await readCollection<T>(name);
  return all.find(predicate);
}

export async function findById<T extends { id: string }>(
  name: CollectionName,
  id: string
): Promise<T | undefined> {
  return findOne<T>(name, (item: any) => item.id === id);
}

export async function insert<T extends { id: string }>(
  name: CollectionName,
  item: T
): Promise<T> {
  return runExclusive(async () => {
    const all = (await readFileRaw(name)) as T[];
    all.push(item);
    await writeFileAtomic(name, all);
    return item;
  });
}

export async function update<T extends { id: string }>(
  name: CollectionName,
  id: string,
  updater: (item: T) => T
): Promise<T | undefined> {
  return runExclusive(async () => {
    const all = (await readFileRaw(name)) as T[];
    const idx = all.findIndex((i: any) => i.id === id);
    if (idx === -1) return undefined;
    const updated = updater(all[idx]);
    all[idx] = updated;
    await writeFileAtomic(name, all);
    return updated;
  });
}

export async function remove(
  name: CollectionName,
  id: string
): Promise<boolean> {
  return runExclusive(async () => {
    const all = (await readFileRaw(name)) as { id: string }[];
    const idx = all.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    all.splice(idx, 1);
    await writeFileAtomic(name, all);
    return true;
  });
}

/**
 * Run an arbitrary function while holding the exclusive global lock.
 * Use this for multi-step / multi-collection operations (e.g. swap accept
 * logic) that must not be interleaved with any other write.
 * The callback receives raw read/write helpers that bypass the mutex
 * (since the lock is already held) to avoid deadlocking on itself.
 */
export interface UnlockedDb {
  read<T>(name: CollectionName): Promise<T[]>;
  write<T>(name: CollectionName, data: T[]): Promise<void>;
}

export async function withTransaction<T>(
  fn: (db: UnlockedDb) => Promise<T>
): Promise<T> {
  return runExclusive(() =>
    fn({
      read: (name) => readFileRaw(name) as any,
      write: (name, data) => writeFileAtomic(name, data as unknown[]),
    })
  );
}
