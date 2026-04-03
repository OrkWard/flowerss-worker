/**
 * KV Schema:
 * - ["source_id_counter"]: number
 * - ["source", <id: number>]: Source
 */
export interface Source {
  id: number;
  title: string;
  link: string;
  error_count: number;
  create_at: number;
  update_at: number;
}

export class SourceStore {
  static inject = ["kv"] as const;
  constructor(private kv: Deno.Kv) {}

  async create(link: string, title?: string): Promise<Source> {
    const currentId = await this.kv.get<number>(["source_id_counter"]);
    const nextId = (currentId.value ?? 0) + 1;
    const atomicWriteResult = await this.kv.atomic().check({
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
    await this.kv.set(["source", nextId], source);
    return source;
  }

  async getById(id: number): Promise<Source | null> {
    const source = await this.kv.get<Source>(["source", id]);
    return source.value ?? null;
  }

  async getByLink(link: string): Promise<Source | null> {
    const iter = this.kv.list<Source>({ prefix: ["source"] });
    for await (const entry of iter) {
      if (entry.value.link === link) {
        return entry.value;
      }
    }
    return null;
  }

  async renew(id: number, updateAt: number): Promise<Source | null> {
    const source = (await this.kv.get<Source>(["source", id])).value;
    if (!source) {
      return null;
    }

    const newSource = { ...source, update_at: updateAt };
    await this.kv.set(["source", id], newSource);
    return newSource;
  }

  async incrementErrorCount(id: number): Promise<Source | null> {
    const source = (await this.kv.get<Source>(["source", id])).value;
    if (!source) {
      return null;
    }

    const newSource = {
      ...source,
      error_count: source.error_count + 1,
      update_at: Date.now(),
    };
    await this.kv.set(["source", id], newSource);
    return newSource;
  }

  async resetErrorCount(id: number): Promise<Source | null> {
    const source = (await this.kv.get<Source>(["source", id])).value;
    if (!source) {
      return null;
    }

    const newSource = {
      ...source,
      error_count: 0,
      update_at: Date.now(),
    };
    await this.kv.set(["source", id], newSource);
    return newSource;
  }

  async delete(id: number): Promise<boolean> {
    await this.kv.delete(["source", id]);
    return true;
  }

  async getAll(): Promise<Source[]> {
    const sources: Source[] = [];
    const iter = this.kv.list<Source>({ prefix: ["source"] });
    for await (const entry of iter) {
      sources.push(entry.value);
    }
    return sources;
  }
}
