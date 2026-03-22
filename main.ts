import { handleRequest } from "./src/handler.ts";
import { handleCronjob } from "./src/cronjob.ts";
import { initKv } from "./src/service.ts";

const kv = await Deno.openKv();
initKv(kv);

Deno.serve({ port: 8787, hostname: "localhost" }, async (req) => {
  try {
    return await handleRequest(req);
  } catch (error) {
    console.error(error);
    return new Response("error, check log", { status: 500 });
  }
});

Deno.cron("Fetch rss", "*/5 * * * *", async () => {
  console.log("Start cronjob...");

  try {
    await handleCronjob();
  } catch (error) {
    console.error(error);
  }
});
