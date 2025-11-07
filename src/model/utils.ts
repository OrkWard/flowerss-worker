import { Data, Effect, pipe } from "effect";
import { KV } from "../service.ts";

class KvError extends Data.TaggedError("KvError")<{
  readonly cause: unknown;
  readonly operation: string;
}> {}

export const runQuery = <T>(
  operation: string,
  query: (db: Deno.Kv) => Promise<T>,
): Effect.Effect<T, KvError, KV> =>
  pipe(
    KV,
    Effect.flatMap(({ kv }) =>
      Effect.tryPromise({
        try: () => query(kv),
        catch: (cause) => new KvError({ cause, operation }),
      })
    ),
  );
