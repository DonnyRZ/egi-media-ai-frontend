export const VISIBLE_NEWS_FEED_CHANNEL_FIXTURES = Object.freeze([
  { id: "egi_media", label: "EGI Media", layout: "card", provider: "cms" },
  { id: "detik", label: "Detik", layout: "card", provider: "crawl" },
  { id: "viva", label: "VIVA", layout: "card", provider: "crawl" },
  { id: "suara", label: "Suara", layout: "card", provider: "crawl" },
  { id: "cnn_indonesia", label: "CNN Indonesia", layout: "card", provider: "crawl" },
  { id: "liputan6", label: "Liputan6", layout: "card", provider: "crawl" },
  { id: "tirto", label: "Tirto", layout: "card", provider: "crawl" },
  { id: "tempo", label: "Tempo", layout: "card", provider: "crawl" },
  { id: "kumparan", label: "Kumparan", layout: "card", provider: "crawl" },
  { id: "jawa_pos", label: "Jawa Pos", layout: "card", provider: "crawl" },
  { id: "okezone", label: "Okezone", layout: "card", provider: "crawl" },
  { id: "sindonews", label: "SINDOnews", layout: "card", provider: "crawl" },
  { id: "idn_times", label: "IDN Times", layout: "card", provider: "crawl" },
  { id: "republika", label: "Republika", layout: "card", provider: "crawl" },
  { id: "media_indonesia", label: "Media Indonesia", layout: "card", provider: "crawl" },
  { id: "merdeka", label: "Merdeka", layout: "card", provider: "crawl" },
  { id: "beritasatu", label: "BeritaSatu", layout: "card", provider: "crawl" },
  { id: "tribunnews", label: "Tribunnews", layout: "card", provider: "crawl" },
]);

export function newsFeedChannelsResponse(items = VISIBLE_NEWS_FEED_CHANNEL_FIXTURES) {
  return {
    success: true,
    data: { items },
    meta: { request_id: "nf" },
  };
}
