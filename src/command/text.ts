import type { Message } from "@telegraf/types";
import { addRssSubscribe, removeRssSubscribe } from "../rss/index.ts";
import { getSubscribesByUserId } from "../model/subscribe.ts";
import { getSourceById } from "../model/source.ts";
import { callTelegram, escapeMarkdownV2 } from "../telegram/index.ts";

export type TextCommandHandler = (
  message: Message.TextMessage,
) => Promise<void>;

const ping: TextCommandHandler = async (message) => {
  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "pong",
  });
};

const add: TextCommandHandler = async (message) => {
  const [_, link] = message.text.match(/^\/add(.*)/) || [];
  if (!link) {
    await callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Usage: /add [rss subscribe link]",
    });
    return;
  }

  await addRssSubscribe(message.chat.id, link.trim());

  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Success",
  });
};

const remove: TextCommandHandler = async (message) => {
  const [_, id] = message.text.match(/^\/remove (\d*)/) || [];
  if (!id) {
    await callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Usage: /remove [subscribe id]",
    });
    return;
  }

  await removeRssSubscribe(message.chat.id, parseInt(id, 10));
  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Success",
  });
};

const list: TextCommandHandler = async (message) => {
  const subscribes = await getSubscribesByUserId(message.chat.id);
  if (!subscribes.length) {
    await callTelegram("sendMessage", {
      chat_id: message.chat.id,
      text: "Not subscribe found",
    });
    return;
  }

  let text = "";
  for (const sourceId of subscribes) {
    const source = await getSourceById(sourceId);
    if (!source) {
      continue;
    }

    text += escapeMarkdownV2(`[${sourceId}] `);
    text += `[${escapeMarkdownV2(source.title)}](${
      escapeMarkdownV2(source.link)
    })`;
    text += "\n";
  }

  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text,
    parse_mode: "MarkdownV2",
  });
};

const notImplemented: TextCommandHandler = async (message) => {
  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Not implemented yet",
  });
};

const importCmd: TextCommandHandler = async (message) => {
  await callTelegram("sendMessage", {
    chat_id: message.chat.id,
    text: "Send a file with name `rss`",
    parse_mode: "MarkdownV2",
  });
};

export const textCommand = [
  {
    command: "ping",
    description: "打个招呼",
    handler: ping,
  },
  {
    command: "add",
    description: "订阅 RSS 源",
    handler: add,
  },
  {
    command: "remove",
    description: "退订 RSS 源",
    handler: remove,
  },
  {
    command: "list",
    description: "列出 RSS 源",
    handler: list,
  },
  {
    command: "check",
    description: "检查 RSS 订阅状态",
    handler: notImplemented,
  },
  {
    command: "pause",
    description: "暂停查询最新订阅",
    handler: notImplemented,
  },
  {
    command: "activate",
    description: "恢复查询最新订阅",
    handler: notImplemented,
  },
  {
    command: "update",
    description: "手动查询最新订阅",
    handler: notImplemented,
  },
  {
    command: "import",
    description: "导入",
    handler: importCmd,
  },
  {
    command: "export",
    description: "导出",
    handler: notImplemented,
  },
] as const;
