export class KvError extends Error {
  constructor(
    public override readonly cause: unknown,
    public readonly operation: string,
  ) {
    super(`KV operation failed: ${operation}`);
    this.name = "KvError";
  }
}

export async function runQuery<T>(
  operation: string,
  query: (db: Deno.Kv) => Promise<T>,
): Promise<T> {
  const { getKv } = await import("../service.ts");
  const kv = getKv();
  try {
    return await query(kv);
  } catch (cause) {
    throw new KvError(cause, operation);
  }
}
