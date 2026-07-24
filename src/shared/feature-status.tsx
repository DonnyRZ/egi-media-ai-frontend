"use client";

import { StandardState } from "@/shared/ux-state";

export function FeatureStatus({ title, message }: { title: string; message: string }) {
  return <StandardState kind="empty" title={title} message={message}><span className="feature-status-note">This screen is intentionally not simulated until its backend read contract is available.</span></StandardState>;
}
