let kvInstance: Deno.Kv | null = null;

export function initKv(kv: Deno.Kv) {
  kvInstance = kv;
}

export function getKv(): Deno.Kv {
  if (!kvInstance) {
    throw new Error("KV not initialized. Call initKv() first.");
  }
  return kvInstance;
}
