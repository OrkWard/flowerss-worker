import type { Update } from "@telegraf/types";
import { Data, Effect } from "effect";
import { callTelegram } from "./telegram/index.ts";
import { textCommand } from "./command/text.ts";
import { handleDocument } from "./command/document.ts";
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
      for (const def of textCommand) {
        if (!update.message.text.match(new RegExp(`^/${def.command}`))) {
          continue;
        }

        yield* Effect.logInfo(
          `Handle ${def.command} command for chat: ${update.message.chat.id}`,
          { text: update.message.text },
        );

        return yield* def.handler(update.message).pipe(
          Effect.tapError(() =>
            callTelegram("sendMessage", {
              chat_id: update.message.chat.id,
              text: "Something error, see log",
            })
          ),
        );
      }
    }
    if ("document" in update.message) {
      return yield* handleDocument(update.message).pipe(
        Effect.tapError(() =>
          callTelegram("sendMessage", {
            chat_id: update.message.chat.id,
            text: "Something error, see log",
          })
        ),
      );
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
  yield* callTelegram("setMyCommands", { commands: textCommand });
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
