"use client";

import { create } from "zustand";

interface UiState {
  isMobileNavOpen: boolean;
  openIssueId: string | null;
  setMobileNavOpen: (open: boolean) => void;
  openIssue: (issueId: string) => void;
  closeIssue: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isMobileNavOpen: false,
  openIssueId: null,
  setMobileNavOpen: (isMobileNavOpen) => set({ isMobileNavOpen }),
  openIssue: (openIssueId) => set({ openIssueId }),
  closeIssue: () => set({ openIssueId: null }),
}));
