import type { Message } from "@telegraf/types";
import { callTelegram, getTelegramFile } from "../telegram/index.ts";
import { addRssSubscribe } from "../rss/index.ts";
import { pipe } from "ramda";

async function addSubscribeWithRetry(
  userId: number,
  subscribe: string,
  times = 3,
) {
  let lastError: unknown;

  for (let attempt = 0; attempt < times; attempt += 1) {
    try {
      await addRssSubscribe(userId, subscribe.trim());
      return;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export async function handleDocument(
  message: Message.DocumentMessage,
): Promise<void> {
  console.info(`Handling document import for chat: ${message.chat.id}`);

  const file = await callTelegram("getFile", {
    file_id: message.document.file_id,
  }) as { file_path?: string };
  console.debug("Got file object from Telegram", file);

  if (!file.file_path) {
    throw new Error(
      `getFile don't response with path, file: ${JSON.stringify(file)}`,
    );
  }

  const blob = await getTelegramFile(file.file_path);
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

  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Success",
  });
}
