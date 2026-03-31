import { getAllSources, renewSource } from "./model/source.ts";
import { fetchRss } from "./rss/index.ts";
import { getUsers } from "./model/user.ts";
import { getSubscribesByUserId } from "./model/subscribe.ts";
import { callTelegram, escapeMarkdownV2 } from "./telegram/index.ts";
import type { FeedItem } from "./rss/parse.ts";
import type { Source } from "./model/source.ts";

function formatFeed(feedItem: FeedItem, sourceTitle: string) {
  const title = `*${escapeMarkdownV2(sourceTitle)}* ${
    escapeMarkdownV2(new Date(feedItem.pubDate).toLocaleDateString())
  }`;
  const link = `[${escapeMarkdownV2(feedItem.title)}](${
    escapeMarkdownV2(feedItem.link)
  })`;

  return [title, link].join("\n");
}

async function updateSources(): Promise<
  readonly (readonly [Source, FeedItem[]])[]
> {
  const allSources = await getAllSources();

  return await Promise.all(
    allSources.map(async (source) => {
      const feed = await fetchRss(source.link);

      if (feed.lastPub > source.update_at) {
        await renewSource(source.id, feed.lastPub);
      }

      return [
        source,
        feed.items.filter((item) => item.pubDate > source.update_at),
      ] as const;
    }),
  );
}

export async function handleCronjob() {
  const [users, updatedSources] = await Promise.all([
    getUsers(),
    updateSources(),
  ]);

  for (const user of users) {
    const subscribes = await getSubscribesByUserId(user.id);
    const userFeeds = updatedSources
      .filter(([source]) => subscribes.includes(source.id))
      .flatMap(([source, feeds]) =>
        feeds.map((feed) => [source, feed] as const)
      );

    await Promise.all(
      userFeeds.map(async ([source, feed]) => {
        await callTelegram("sendMessage", {
          chat_id: user.id,
          text: formatFeed(feed, source.title),
          parse_mode: "MarkdownV2",
        });
      }),
    );
  }
}
