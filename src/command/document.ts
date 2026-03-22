import type { Message } from "@telegraf/types";
import {
  callTelegram,
  getTelegramFile,
  type TgError,
} from "../telegram/index.ts";
import { addRssSubscribe } from "../rss/index.ts";
import { pipe } from "ramda";
import type { Result } from "neverthrow";

async function unwrapOrThrow<T>(
  resultPromise: Promise<Result<T, TgError>>,
): Promise<T> {
  const result = await resultPromise;
  if (result.isErr()) {
    throw result.error;
  }
  return result.value;
}

async function addSubscribeWithRetry(
  userId: number,
  subscribe: string,
  times = 3,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < times; attempt += 1) {
    const result = await addRssSubscribe(userId, subscribe.trim());
    if (result.isOk()) {
      return;
    }
    lastError = result.error;
  }

  throw lastError;
}

export async function handleDocument(
  message: Message.DocumentMessage,
): Promise<void> {
  console.info(`Handling document import for chat: ${message.chat.id}`);

  const file = await unwrapOrThrow(
    callTelegram("getFile", {
      file_id: message.document.file_id,
    }),
  ) as { file_path?: string };
  console.debug("Got file object from Telegram", file);

  if (!file.file_path) {
    throw new Error(
      `getFile don't response with path, file: ${JSON.stringify(file)}`,
    );
  }

  const blob = await unwrapOrThrow(getTelegramFile(file.file_path));
  console.debug("Fetched file blob", { size: blob.size, type: blob.type });

  const text = await blob.text();
  console.debug("File content as text", { textLength: text.length });

  const subscribes = pipe(
    (value: string) => value.split("\n"),
    (values: string[]) => values.map((subscribe) => subscribe.trim()),
    (values: string[]) => values.filter(Boolean),
  )(text);
  console.info("Parsed subscribes", { subscribes });

  await Promise.all(
    subscribes.map((subscribe: string) => {
      console.debug(`Adding subscription: ${subscribe}`);
      return addSubscribeWithRetry(message.chat.id, subscribe);
    }),
  );

  await unwrapOrThrow(
    callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Success",
    }),
  );
}
