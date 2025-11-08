import type { Update } from "@telegraf/types";
import { Data, Effect } from "effect";
import { callTelegram } from "./telegram/index.ts";
import { commandDefinition } from "./command.ts";
import { getUser } from "./model/user.ts";

class UpdateHandlerError extends Data.TaggedError("UpdateHandlerError")<{
  readonly cause: unknown;
}> {}

const handleUpdate = (update: Update) =>
  Effect.gen(function* () {
    if (!("message" in update)) {
      return;
    }

    // Only allow registered users
    const userExists = yield* getUser(update.message.chat.id);
    if (!userExists) {
      return;
    }

    if ("text" in update.message) {
      for (const def of commandDefinition) {
        if (!update.message.text.match(new RegExp(`^/${def.command}`))) {
          continue;
        }

        yield* def.handler(update.message).pipe(
          Effect.catchAll((errors) =>
            callTelegram("sendMessage", {
              chat_id: update.message.chat.id,
              text: "Something error, see log",
            }).pipe(() => Effect.fail(errors))
          ),
        );
        return;
      }
    }
  });

const setupWebhook = (hostname: string) =>
  Effect.gen(function* () {
    yield* callTelegram("setWebhook", {
      url: "https://" + hostname + "/update",
      allowed_updates: ["message", "inline_query"],
    });
  });

const deleteWebhook = Effect.gen(function* () {
  yield* callTelegram("deleteWebhook", {});
});

const setCommands = Effect.gen(function* () {
  yield* callTelegram("setMyCommands", { commands: commandDefinition });
});

export const handleRequest = (request: Request) =>
  Effect.gen(function* () {
    const url = new URL(request.url);

    if (url.pathname === "/set") {
      yield* setupWebhook(url.hostname);
    } else if (url.pathname === "/delete") {
      yield* deleteWebhook;
    } else if (url.pathname === "/set-command") {
      yield* setCommands;
    } else if (url.pathname === "/update") {
      const update = (yield* Effect.tryPromise({
        try: () => request.json() as Promise<Update>,
        catch: (cause) => new UpdateHandlerError({ cause }),
      })) as Update;
      yield* handleUpdate(update);
    } else {
      return new Response("404 Not Found\nHeart from OrkWard");
    }

    return new Response("ok");
  });
