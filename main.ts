import { Effect, pipe } from "effect";
import { KV } from "./src/service.ts";
import { handleRequest } from "./src/handler.ts";
import { handleCronjob } from "./src/cronjob.ts";

Deno.serve({ port: 8787, hostname: "localhost" }, async (req) => {
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

Deno.cron("Fetch rss", "* * * * *", async () => {
  console.log("Start cronjob...");
  const program = pipe(
    handleCronjob(),
    Effect.catchAll((error) => {
      console.error(error);
      return Effect.succeed(new Response("error, check log"));
    }),
    Effect.provideService(KV, { kv: await Deno.openKv() }),
  );

  await Effect.runPromise(program);
});
