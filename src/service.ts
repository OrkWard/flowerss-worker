import { Context } from "effect";

export class KV extends Context.Tag("KV")<KV, { kv: Deno.Kv }>() {}
