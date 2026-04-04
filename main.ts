import { handleRequest } from "./src/handler.ts";
import { handleCronjob } from "./src/cronjob.ts";
import { createInjector } from "typed-inject";
import { UserStore } from "./src/model/user.ts";
import { SourceStore } from "./src/model/source.ts";
import { SubscribeStore } from "./src/model/subscribe.ts";

const appInjector = createInjector()
  .provideValue("kv", await Deno.openKv())
  .provideClass("user", UserStore)
  .provideClass("source", SourceStore)
  .provideClass("subscribe", SubscribeStore);

Deno.serve({ port: 8787, hostname: "localhost" }, async (req) => {
  try {
    return await appInjector
      .provideValue("request", req)
      .injectFunction(handleRequest);
  } catch (error) {
    console.error(error);
    return new Response("error, check log", { status: 500 });
  }
});

Deno.cron("Fetch rss", "*/5 * * * *", async () => {
  console.log("Start cronjob...");

  try {
    await appInjector.injectFunction(handleCronjob);
  } catch (error) {
    console.error(error);
  }
});
