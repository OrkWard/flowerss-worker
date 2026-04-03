import { fetchRss } from "./rss/index.ts";
import { callTelegram, escapeMarkdownV2 } from "./telegram/index.ts";
import type { FeedItem } from "./rss/parse.ts";
import type { Source } from "./model/source.ts";
import { UserStore } from "./model/user.ts";
import { SourceStore } from "./model/source.ts";
import { SubscribeStore } from "./model/subscribe.ts";

function formatFeed(feedItem: FeedItem, sourceTitle: string) {
  const title = `*${escapeMarkdownV2(sourceTitle)}* ${
    escapeMarkdownV2(new Date(feedItem.pubDate).toLocaleDateString())
  }`;
  const link = `[${escapeMarkdownV2(feedItem.title)}](${
    escapeMarkdownV2(feedItem.link)
  })`;

  return [title, link].join("\n");
}

async function updateSources(
  source: SourceStore,
): Promise<readonly (readonly [Source, FeedItem[]])[]> {
  const allSources = await source.getAll();

  return await Promise.all(
    allSources.map(async (src) => {
      const feed = await fetchRss(src.link);

      if (feed.lastPub > src.update_at) {
        await source.renew(src.id, feed.lastPub);
      }

      return [
        src,
        feed.items.filter((item) => item.pubDate > src.update_at),
      ] as const;
    }),
  );
}

export async function handleCronjob(
  user: UserStore,
  source: SourceStore,
  subscribe: SubscribeStore,
) {
  const [users, updatedSources] = await Promise.all([
    user.getAll(),
    updateSources(source),
  ]);

  for (const u of users) {
    const subscribes = await subscribe.getByUserId(u.id);
    const userFeeds = updatedSources
      .filter(([src]) => subscribes.includes(src.id))
      .flatMap(([src, feeds]) =>
        feeds.map((feed) => [src, feed] as const)
      );

    await Promise.all(
      userFeeds.map(async ([src, feed]) => {
        await callTelegram("sendMessage", {
          chat_id: u.id,
          text: formatFeed(feed, src.title),
          parse_mode: "MarkdownV2",
        });
      }),
    );
  }
}
handleCronjob.inject = ["user", "source", "subscribe"] as const;
