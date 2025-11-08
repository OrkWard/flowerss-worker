import { Message } from "@telegraf/types";
import { Effect, pipe } from "effect";
import { callTelegram, getTelegramFile } from "../telegram/index.ts";
import { addRssSubscribe } from "../rss/index.ts";

export const handleDocument = (message: Message.DocumentMessage) =>
  pipe(
    callTelegram("getFile", {
      file_id: message.document.file_id,
    }),
    Effect.flatMap((file) =>
      Effect.if(Boolean(file.file_path), {
        onTrue: () => getTelegramFile(file.file_path!),
        onFalse: () =>
          Effect.fail(
            new Error(`getFile don't response with path, file: ${file}`),
          ),
      })
    ),
    Effect.flatMap((blob) => Effect.tryPromise(() => blob.text())),
    Effect.map((subscribes) => subscribes.split("\n").filter(Boolean)),
    Effect.flatMap((subscribes) =>
      Effect.forEach(subscribes, (subscribe) =>
        addRssSubscribe(message.chat.id, subscribe.trim()))
    ),
    Effect.andThen(callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Success",
    })),
  );
