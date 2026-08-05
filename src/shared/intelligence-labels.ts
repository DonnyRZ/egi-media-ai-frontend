const PRIORITY_LABELS = {
  tinggi: "High",
  sedang: "Medium",
  rendah: "Low",
} as const;

const STATUS_LABELS = {
  baru: "New",
  berkembang: "Developing",
  dipantau: "Monitored",
  selesai: "Completed",
} as const;

export type IntelligencePriority = keyof typeof PRIORITY_LABELS;
export type IntelligenceStatus = keyof typeof STATUS_LABELS;

export function priorityLabel(value: string | null | undefined) {
  return value && value in PRIORITY_LABELS ? PRIORITY_LABELS[value as IntelligencePriority] : "Unprioritized";
}

export function statusLabel(value: string | null | undefined) {
  return value && value in STATUS_LABELS ? STATUS_LABELS[value as IntelligenceStatus] : humanizeToken(value);
}

export function alertChannelLabel(value: string | null | undefined) {
  if (value === "langsung" || value === "direct_high" || value === "direct-high") return "Urgent alert";
  if (value === "ringkasan" || value === "daily_digest" || value === "daily-digest") return "Daily digest";
  return humanizeToken(value);
}

export function alertStatusLabel(value: string | null | undefined) {
  if (value === "delivered" || value === "sent") return "Delivered";
  if (value === "failed" || value === "delivery_failed") return "Delivery failed";
  if (value === "suppressed") return "Suppressed";
  return humanizeToken(value);
}

export function humanizeToken(value: string | null | undefined) {
  if (!value) return "Not available";
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
