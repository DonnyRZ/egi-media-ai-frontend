"use client";

import { Check } from "lucide-react";

import {
  VISIBLE_NEWS_FEED_CHANNELS,
  type NewsFeedChannelId,
} from "@/shared/news-feed-channels";

export function defaultAllowedNewsChannelIds(): NewsFeedChannelId[] {
  return VISIBLE_NEWS_FEED_CHANNELS.map((channel) => channel.id);
}

export function PlatformMediaPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: readonly string[];
  onChange: (ids: NewsFeedChannelId[]) => void;
  disabled?: boolean;
}) {
  const selected = new Set(value);
  const total = VISIBLE_NEWS_FEED_CHANNELS.length;
  const count = VISIBLE_NEWS_FEED_CHANNELS.filter((channel) => selected.has(channel.id)).length;
  const allSelected = count === total;

  function toggle(id: NewsFeedChannelId) {
    if (disabled) return;
    const next = selected.has(id) ? value.filter((item) => item !== id) : [...value, id];
    onChange(VISIBLE_NEWS_FEED_CHANNELS.filter((channel) => next.includes(channel.id)).map((channel) => channel.id));
  }

  return (
    <div className="platform-media-picker">
      <div className="platform-media-picker-toolbar">
        <span className="platform-media-picker-count">{count} of {total} selected</span>
        <div className="platform-media-picker-actions">
          <button type="button" className="platform-secondary-button" disabled={disabled || allSelected} onClick={() => onChange(defaultAllowedNewsChannelIds())}>
            Select all
          </button>
          <button type="button" className="platform-secondary-button" disabled={disabled || count === 0} onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      </div>
      <div className="platform-media-picker-grid" role="group" aria-label="News sources">
        {VISIBLE_NEWS_FEED_CHANNELS.map((channel) => {
          const isSelected = selected.has(channel.id);
          return (
            <button
              key={channel.id}
              type="button"
              className={`platform-media-tile${isSelected ? " is-selected" : ""}`}
              aria-pressed={isSelected}
              aria-label={channel.label}
              disabled={disabled}
              onClick={() => toggle(channel.id)}
            >
              <span className="platform-media-tile-check" aria-hidden="true">
                {isSelected ? <Check size={14} strokeWidth={2.5} /> : null}
              </span>
              <strong>{channel.label}</strong>
            </button>
          );
        })}
      </div>
    </div>
  );
}
