/** Mirrors backend `src/news-feed/channel-registry.js` — locked F0 order (19 tabs). */

export type NewsFeedLayout = "card" | "text";

export type NewsFeedChannelId =
  | "viral"
  | "egi_media"
  | "detik"
  | "viva"
  | "suara"
  | "cnn_indonesia"
  | "liputan6"
  | "tirto"
  | "tempo"
  | "kumparan"
  | "jawa_pos"
  | "okezone"
  | "sindonews"
  | "idn_times"
  | "republika"
  | "media_indonesia"
  | "merdeka"
  | "beritasatu"
  | "tribunnews";

export type NewsFeedChannel = {
  id: NewsFeedChannelId;
  label: string;
  layout: NewsFeedLayout;
};

export const DEFAULT_NEWS_FEED_CHANNEL: NewsFeedChannelId = "egi_media";

export const NEWS_FEED_CHANNELS: readonly NewsFeedChannel[] = Object.freeze([
  { id: "viral", label: "Viral", layout: "text" },
  { id: "egi_media", label: "EGI Media", layout: "card" },
  { id: "detik", label: "Detik", layout: "card" },
  { id: "viva", label: "VIVA", layout: "card" },
  { id: "suara", label: "Suara", layout: "card" },
  { id: "cnn_indonesia", label: "CNN Indonesia", layout: "card" },
  { id: "liputan6", label: "Liputan6", layout: "card" },
  { id: "tirto", label: "Tirto", layout: "card" },
  { id: "tempo", label: "Tempo", layout: "card" },
  { id: "kumparan", label: "Kumparan", layout: "card" },
  { id: "jawa_pos", label: "Jawa Pos", layout: "card" },
  { id: "okezone", label: "Okezone", layout: "card" },
  { id: "sindonews", label: "SINDOnews", layout: "card" },
  { id: "idn_times", label: "IDN Times", layout: "card" },
  { id: "republika", label: "Republika", layout: "card" },
  { id: "media_indonesia", label: "Media Indonesia", layout: "card" },
  { id: "merdeka", label: "Merdeka", layout: "card" },
  { id: "beritasatu", label: "BeritaSatu", layout: "card" },
  { id: "tribunnews", label: "Tribunnews", layout: "card" },
]);

export function isNewsFeedChannelId(value: string): value is NewsFeedChannelId {
  return NEWS_FEED_CHANNELS.some((channel) => channel.id === value);
}

/** External media eligible for manual crawl pull (17); excludes Viral and EGI Media. */
export const EXTERNAL_INTAKE_MEDIA: readonly NewsFeedChannel[] = Object.freeze(
  NEWS_FEED_CHANNELS.filter((channel) => channel.id !== "viral" && channel.id !== "egi_media"),
);
