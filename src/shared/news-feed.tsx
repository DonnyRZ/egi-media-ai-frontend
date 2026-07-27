"use client";

import { isAxiosError } from "axios";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue, useState } from "react";
import { AlertCircle, ExternalLink, Inbox, Newspaper, Search } from "lucide-react";

import { API_ENDPOINTS } from "@/shared/constants/api.constants";
import { axiosClient } from "@/shared/lib/axios-client";
import {
  DEFAULT_NEWS_FEED_CHANNEL,
  NEWS_FEED_CHANNELS,
  type NewsFeedChannelId,
} from "@/shared/news-feed-channels";
import { ScopeRequired } from "@/shared/prerequisite-gate";
import { useSessionStore } from "@/shared/session-store";
import { useWorkspaceScope } from "@/shared/workspace-scope";
import type { ApiSuccessResponse, NewsFeedItemDto, NewsFeedPageDto } from "@/shared/types/api.types";
import { classifyApiError, StandardState } from "@/shared/ux-state";

async function fetchNewsFeed(channel: NewsFeedChannelId, cursor?: string | null) {
  const response = await axiosClient.get<ApiSuccessResponse<NewsFeedPageDto>>(API_ENDPOINTS.newsFeed, {
    params: {
      channel,
      limit: 20,
      ...(cursor ? { cursor } : {}),
    },
  });
  return response.data.data;
}

export function NewsFeed() {
  const scope = useWorkspaceScope();

  return (
    <ScopeRequired
      require="company"
      scope={scope}
      title="Company scope required for News Feed"
      reason="News Feed is company-scoped. Without an active company, an empty feed would look like “no stories yet” — that is not the case here."
      nextStep="Pick a company in the header switcher. If none exist, provision one under Platform, then return here."
    >
      <NewsFeedBody />
    </ScopeRequired>
  );
}

function NewsFeedBody() {
  const companyId = useSessionStore((state) => state.activeCompanyId);
  const [channel, setChannel] = useState<NewsFeedChannelId>(DEFAULT_NEWS_FEED_CHANNEL);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useQuery({
    queryKey: ["news-feed", companyId, channel],
    queryFn: () => fetchNewsFeed(channel),
    enabled: Boolean(companyId),
    staleTime: 15_000,
    retry: 1,
  });

  const activeMeta = NEWS_FEED_CHANNELS.find((entry) => entry.id === channel) ?? NEWS_FEED_CHANNELS[1];
  const layout = query.data?.layout ?? activeMeta.layout;
  const label = query.data?.label ?? activeMeta.label;
  const items = filterItems(query.data?.items ?? [], deferredSearch);
  const isComingSoon =
    query.data?.availability === "coming_soon" ||
    (channel === "viral" && query.data && query.data.items.length === 0 && Boolean(query.data.message));

  function selectChannel(next: NewsFeedChannelId) {
    if (next === channel) return;
    setChannel(next);
    setSearch("");
  }

  return (
    <div className="news-feed-page">
      <div className="page-context">
        <span className="supporting-text">Browse multi-channel stories for this company scope.</span>
        <span className="issues-scope-badge">Company scoped</span>
      </div>

      <div className="issues-toolbar news-feed-toolbar">
        <label className="issues-search">
          <Search size={16} strokeWidth={2} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search title or summary..."
            aria-label="Search news feed"
          />
        </label>
      </div>

      <nav className="news-feed-tabs" aria-label="News feed channels" data-testid="news-feed-tabs">
        <div className="news-feed-tabs-track">
          {NEWS_FEED_CHANNELS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={entry.id === channel ? "is-active" : undefined}
              data-channel={entry.id}
              aria-pressed={entry.id === channel}
              onClick={() => selectChannel(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="news-feed-meta">
        <span>{label}</span>
        <span>{layout === "text" ? "Text list" : "Card layout"}</span>
      </div>

      {query.isLoading ? (
        <NewsFeedLoading layout={layout} />
      ) : query.isError ? (
        <NewsFeedError error={query.error} onRetry={() => query.refetch()} />
      ) : isComingSoon ? (
        <StandardState
          kind="empty"
          title="Coming soon"
          message={query.data?.message || "Viral coverage will appear here when X integration is ready."}
        />
      ) : items.length === 0 ? (
        <NewsFeedEmpty filtered={Boolean(deferredSearch)} onReset={() => setSearch("")} channelLabel={label} />
      ) : layout === "text" ? (
        <div className="news-feed-text-list" data-testid="news-feed-text-list">
          {items.map((item) => (
            <NewsFeedTextRow key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <div className="news-feed-card-grid" data-testid="news-feed-card-grid">
          {items.map((item) => (
            <NewsFeedCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function NewsFeedCard({ item }: { item: NewsFeedItemDto }) {
  const title = item.title?.trim() || "Untitled story";
  const summary = item.summary?.trim() || "No summary is available for this story yet.";
  const openable = Boolean(item.source_url);

  const body = (
    <>
      <div className="news-feed-card-media" aria-hidden={!item.thumbnail_url}>
        {item.thumbnail_url ? (
  // eslint-disable-next-line @next/next/no-img-element -- remote crawl/CMS thumbs; next/image domains not configured
          <img src={item.thumbnail_url} alt="" loading="lazy" />
        ) : (
          <span className="news-feed-card-placeholder">
            <Newspaper size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="news-feed-card-copy">
        <h2>{title}</h2>
        <p>{summary}</p>
        <footer>
          <time dateTime={item.published_at ?? undefined}>{formatDate(item.published_at)}</time>
          {openable ? (
            <span className="news-feed-open-hint">
              Open source <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </span>
          ) : null}
        </footer>
      </div>
    </>
  );

  if (openable) {
    return (
      <a
        className="news-feed-card"
        href={item.source_url as string}
        target="_blank"
        rel="noopener noreferrer"
        data-has-thumb={item.thumbnail_url ? "true" : "false"}
      >
        {body}
      </a>
    );
  }

  return (
    <article className="news-feed-card is-static" data-has-thumb={item.thumbnail_url ? "true" : "false"}>
      {body}
    </article>
  );
}

function NewsFeedTextRow({ item }: { item: NewsFeedItemDto }) {
  const title = item.title?.trim() || "Untitled story";
  const summary = item.summary?.trim() || "No summary is available for this story yet.";
  const openable = Boolean(item.source_url);

  const inner = (
    <>
      <div className="issue-list-copy">
        <h2>{title}</h2>
        <p>{summary}</p>
      </div>
      <div className="issue-list-side">
        <span className="timestamp">{formatDate(item.published_at)}</span>
      </div>
    </>
  );

  if (openable) {
    return (
      <a
        className="issue-list-card news-feed-text-row"
        href={item.source_url as string}
        target="_blank"
        rel="noopener noreferrer"
      >
        {inner}
      </a>
    );
  }

  return <article className="issue-list-card news-feed-text-row is-static">{inner}</article>;
}

function NewsFeedLoading({ layout }: { layout: "card" | "text" }) {
  if (layout === "text") {
    return (
      <div className="issues-list" aria-busy="true" aria-live="polite">
        {[1, 2, 3, 4].map((item) => (
          <div className="issue-list-skeleton" key={item}>
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="news-feed-card-grid" aria-busy="true" aria-live="polite">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div className="news-feed-card-skeleton" key={item}>
          <span className="news-feed-card-skeleton-media" />
          <span />
          <span />
          <span />
        </div>
      ))}
    </div>
  );
}

function NewsFeedEmpty({
  filtered,
  onReset,
  channelLabel,
}: {
  filtered: boolean;
  onReset: () => void;
  channelLabel: string;
}) {
  return (
    <div className="issues-empty">
      <div className="summary-empty-mark">
        <Inbox size={20} strokeWidth={2} aria-hidden="true" />
      </div>
      <h2>{filtered ? "No stories match this search" : `No stories in ${channelLabel}`}</h2>
      <p>
        {filtered
          ? "Try a broader search or clear the query."
          : "There are no feed items available for this channel and company scope."}
      </p>
      {filtered ? (
        <button className="context-action" type="button" onClick={onReset}>
          Clear search
        </button>
      ) : null}
    </div>
  );
}

function NewsFeedError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const classified = classifyApiError(error);
  const message = isAxiosError<{ error?: { message?: string } }>(error)
    ? error.response?.data?.error?.message ?? classified.message
    : classified.message;
  return (
    <StandardState kind={classified.kind} title="News Feed unavailable" message={message} onRetry={onRetry} />
  );
}

function filterItems(items: NewsFeedItemDto[], search: string) {
  const q = search.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const title = item.title?.toLowerCase() ?? "";
    const summary = item.summary?.toLowerCase() ?? "";
    return title.includes(q) || summary.includes(q);
  });
}

function formatDate(value: string | null) {
  if (!value) return "No publish time";
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? value
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}
