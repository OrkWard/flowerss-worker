import { Effect, pipe } from "effect";
import { KV } from "./src/service.ts";
import { handleRequest } from "./src/handler.ts";

Deno.serve(async (req) => {
  const program = pipe(
    handleRequest(req),
    Effect.catchAll((error) => {
      console.error(error);
      return Effect.succeed(new Response("error, check log"));
    }),
    Effect.provideService(KV, { kv: await Deno.openKv() }),
  );

  return await Effect.runPromise(program);
});

Deno.cron("Fetch rss", "*/5 * * * *", () => {});
