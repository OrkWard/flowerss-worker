import { Message } from "@telegraf/types";
import { Effect, pipe } from "effect";
import { callTelegram, getTelegramFile } from "../telegram/index.ts";
import { addRssSubscribe } from "../rss/index.ts";

export const handleDocument = (message: Message.DocumentMessage) =>
  pipe(
    Effect.logInfo(`Handling document import for chat: ${message.chat.id}`),
    Effect.flatMap(() =>
      callTelegram("getFile", {
        file_id: message.document.file_id,
      })
    ),
    Effect.tap((file) =>
      Effect.logDebug("Got file object from Telegram", {
        file: JSON.stringify(file),
      })
    ),
    Effect.flatMap((file) =>
      Effect.if(Boolean(file.file_path), {
        onTrue: () => getTelegramFile(file.file_path!),
        onFalse: () =>
          Effect.fail(
            new Error(
              `getFile don't response with path, file: ${JSON.stringify(file)}`,
            ),
          ),
      })
    ),
    Effect.tap((blob) =>
      Effect.logDebug(`Fetched file blob`, { size: blob.size, type: blob.type })
    ),
    Effect.flatMap((blob) => Effect.tryPromise(() => blob.text())),
    Effect.tap((text) =>
      Effect.logDebug("File content as text", { textLength: text.length })
    ),
    Effect.map((subscribes) => subscribes.split("\n").filter(Boolean)),
    Effect.tap((subscribes) =>
      Effect.logInfo("Parsed subscribes", { subscribes })
    ),
    Effect.flatMap((subscribes) =>
      Effect.validateAll(
        subscribes,
        (subscribe) =>
          pipe(
            Effect.logDebug(`Adding subscription: ${subscribe}`),
            Effect.flatMap(() =>
              addRssSubscribe(message.chat.id, subscribe.trim()).pipe(
                Effect.retry({ times: 3 }),
              )
            ),
          ),
        { concurrency: "unbounded" },
      )
    ),
    Effect.andThen(callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Success",
    })),
  );
