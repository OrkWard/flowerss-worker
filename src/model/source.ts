/**
 * KV Schema:
 * - ["source_id_counter"]: number
 * - ["source", <id: number>]: Source
 */
import { runQuery } from "./utils.ts";

export interface Source {
  id: number;
  title: string;
  link: string;
  error_count: number;
  create_at: number;
  update_at: number;
}

export const createSource = (link: string, title?: string) =>
  runQuery("createSource", async (kv) => {
    const currentId = await kv.get<number>(["source_id_counter"]);
    const nextId = (currentId.value ?? 0) + 1;
    const atomicWriteResult = await kv.atomic().check({
      key: ["source_id_counter"],
      versionstamp: currentId.versionstamp,
    }).set(["source_id_counter"], nextId).commit();

    if (!atomicWriteResult.ok) {
      throw { message: "Error: atomic write fail", link, title };
    }

    const now = new Date().getTime();
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
  });

export const getSourceById = (id: number) =>
  runQuery("getSourceById", async (kv) => {
    const source = await kv.get<Source>(["source", id]);
    return source.value;
  });

export const getSourceByLink = (link: string) =>
  runQuery("getSourceByLink", async (kv) => {
    const iter = kv.list<Source>({ prefix: ["source"] });
    for await (const entry of iter) {
      if (entry.value.link === link) {
        return entry.value;
      }
    }
    return null;
  });

export const renewSource = (id: number, update_at: number) =>
  runQuery("updateSource", async (kv) => {
    const source = (await kv.get<Source>(["source", id])).value;
    if (source) {
      const newSource = { ...source, update_at };
      await kv.set(["source", id], newSource);
      return newSource;
    }
    return null;
  });

export const incrementSourceErrorCount = (id: number) =>
  runQuery("incrementSourceErrorCount", async (kv) => {
    const source = (await kv.get<Source>(["source", id])).value;
    if (source) {
      const newSource = {
        ...source,
        error_count: source.error_count + 1,
        update_at: new Date().getTime(),
      };
      await kv.set(["source", id], newSource);
      return newSource;
    }
    return null;
  });

export const resetSourceErrorCount = (id: number) =>
  runQuery("resetSourceErrorCount", async (kv) => {
    const source = (await kv.get<Source>(["source", id])).value;
    if (source) {
      const newSource = {
        ...source,
        error_count: 0,
        update_at: new Date().getTime(),
      };
      await kv.set(["source", id], newSource);
      return newSource;
    }
    return null;
  });

export const deleteSource = (id: number) =>
  runQuery("deleteSource", async (kv) => {
    await kv.delete(["source", id]);
    return true;
  });

export const getAllSources = runQuery("getAllSources", async (kv) => {
  const sources: Source[] = [];
  const iter = kv.list<Source>({ prefix: ["source"] });
  for await (const entry of iter) {
    sources.push(entry.value);
  }
  return sources;
});
