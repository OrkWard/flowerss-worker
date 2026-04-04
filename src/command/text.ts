import type { Message } from "@telegraf/types";
import { addRssSubscribe, removeRssSubscribe } from "../rss/index.ts";
import type { SourceStore } from "../model/source.ts";
import type { SubscribeStore } from "../model/subscribe.ts";
import {
  callTelegram,
  escapeMarkdownV2,
  sendDocument,
} from "../telegram/index.ts";

export type TextCommandHandler = ({
  source,
  subscribe,
  message,
}: {
  source: SourceStore;
  subscribe: SubscribeStore;
  message: Message.TextMessage;
}) => Promise<void>;

export const textCommand: readonly {
  command: string;
  description: string;
  handler: TextCommandHandler;
}[] = [
  {
    command: "ping",
    description: "打个招呼",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "pong",
      });
    },
  },
  {
    command: "add",
    description: "订阅 RSS 源",
    handler: async ({ source, subscribe, message }) => {
      const [_, link] = message.text.match(/^\/add(.*)/) || [];
      if (!link) {
        await callTelegram("sendMessage", {
          chat_id: message.chat.id,
          text: "Usage: /add [rss subscribe link]",
        });
        return;
      }

      await addRssSubscribe(source, subscribe, message.chat.id, link.trim());

      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Success",
      });
    },
  },
  {
    command: "remove",
    description: "退订 RSS 源",
    handler: async ({ subscribe, message }) => {
      const [_, id] = message.text.match(/^\/remove (\d*)/) || [];
      if (!id) {
        await callTelegram("sendMessage", {
          chat_id: message.chat.id,
          text: "Usage: /remove [subscribe id]",
        });
        return;
      }

      await removeRssSubscribe(subscribe, message.chat.id, parseInt(id, 10));
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Success",
      });
    },
  },
  {
    command: "list",
    description: "列出 RSS 源",
    handler: async ({ source, subscribe, message }) => {
      const subscribes = await subscribe.getByUserId(message.chat.id);
      if (!subscribes.length) {
        await callTelegram("sendMessage", {
          chat_id: message.chat.id,
          text: "Not subscribe found",
        });
        return;
      }

      let text = "";
      for (const sourceId of subscribes) {
        const src = await source.getById(sourceId);
        if (!src) {
          continue;
        }

        text += escapeMarkdownV2(`[${sourceId}] `);
        text += `[${escapeMarkdownV2(src.title)}](${
          escapeMarkdownV2(src.link)
        })`;
        text += "\n";
      }

      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text,
        parse_mode: "MarkdownV2",
      });
    },
  },
  {
    command: "check",
    description: "检查 RSS 订阅状态",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Not implemented yet",
      });
    },
  },
  {
    command: "pause",
    description: "暂停查询最新订阅",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Not implemented yet",
      });
    },
  },
  {
    command: "activate",
    description: "恢复查询最新订阅",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Not implemented yet",
      });
    },
  },
  {
    command: "update",
    description: "手动查询最新订阅",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Not implemented yet",
      });
    },
  },
  {
    command: "import",
    description: "导入",
    handler: async ({ message }) => {
      await callTelegram("sendMessage", {
        chat_id: message.chat.id,
        text: "Send a file with name `rss`",
        parse_mode: "MarkdownV2",
      });
    },
  },
  {
    command: "export",
    description: "导出",
    handler: async ({ source, subscribe, message }) => {
      const subscribes = await subscribe.getByUserId(message.chat.id);
      if (!subscribes.length) {
        await callTelegram("sendMessage", {
          chat_id: message.chat.id,
          text: "No subscriptions to export",
        });
        return;
      }

      const urls: string[] = [];
      for (const sourceId of subscribes) {
        const src = await source.getById(sourceId);
        if (src) {
          urls.push(src.link);
        }
      }

      const content = urls.join("\n");
      const blob = new Blob([content], { type: "text/plain" });
      const date = new Date().toISOString().split("T")[0];
      const filename = `rss-${date}.txt`;

      try {
        await sendDocument(message.chat.id, blob, filename);
      } catch (error) {
        console.error("Failed to send export document:", error);
        await callTelegram("sendMessage", {
          chat_id: message.chat.id,
          text: "Failed to export subscriptions",
        });
      }
    },
  },
] as const;
