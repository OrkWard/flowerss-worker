/**
 * KV Schema:
 * - ["source_id_counter"]: number
 * - ["source", <id: number>]: Source
 */
import { getKv } from "../service.ts";

export interface Source {
  id: number;
  title: string;
  link: string;
  error_count: number;
  create_at: number;
  update_at: number;
}

export async function createSource(
  link: string,
  title?: string,
): Promise<Source> {
  const kv = getKv();
  const currentId = await kv.get<number>(["source_id_counter"]);
  const nextId = (currentId.value ?? 0) + 1;
  const atomicWriteResult = await kv.atomic().check({
    key: ["source_id_counter"],
    versionstamp: currentId.versionstamp,
  }).set(["source_id_counter"], nextId).commit();

  if (!atomicWriteResult.ok) {
    throw new Error(
      `Error: atomic write fail for source ${link}${
        title ? ` (${title})` : ""
      }`,
    );
  }

  const now = Date.now();
  const source: Source = {
    id: nextId,
    title: title || "",
    link,
    error_count: 0,
    create_at: now,
    update_at: now,
  };
  await kv.set(["source", nextId], source);
  return source;
}

export async function getSourceById(id: number): Promise<Source | null> {
  const kv = getKv();
  const source = await kv.get<Source>(["source", id]);
  return source.value ?? null;
}

export async function getSourceByLink(link: string): Promise<Source | null> {
  const kv = getKv();
  const iter = kv.list<Source>({ prefix: ["source"] });
  for await (const entry of iter) {
    if (entry.value.link === link) {
      return entry.value;
    }
  }
  return null;
}

export async function renewSource(
  id: number,
  updateAt: number,
): Promise<Source | null> {
  const kv = getKv();
  const source = (await kv.get<Source>(["source", id])).value;
  if (!source) {
    return null;
  }

  const newSource = { ...source, update_at: updateAt };
  await kv.set(["source", id], newSource);
  return newSource;
}

export async function incrementSourceErrorCount(
  id: number,
): Promise<Source | null> {
  const kv = getKv();
  const source = (await kv.get<Source>(["source", id])).value;
  if (!source) {
    return null;
  }

  const newSource = {
    ...source,
    error_count: source.error_count + 1,
    update_at: Date.now(),
  };
  await kv.set(["source", id], newSource);
  return newSource;
}

export async function resetSourceErrorCount(
  id: number,
): Promise<Source | null> {
  const kv = getKv();
  const source = (await kv.get<Source>(["source", id])).value;
  if (!source) {
    return null;
  }

  const newSource = {
    ...source,
    error_count: 0,
    update_at: Date.now(),
  };
  await kv.set(["source", id], newSource);
  return newSource;
}

export async function deleteSource(id: number): Promise<boolean> {
  const kv = getKv();
  await kv.delete(["source", id]);
  return true;
}

export async function getAllSources(): Promise<Source[]> {
  const kv = getKv();
  const sources: Source[] = [];
  const iter = kv.list<Source>({ prefix: ["source"] });
  for await (const entry of iter) {
    sources.push(entry.value);
  }
  return sources;
}
