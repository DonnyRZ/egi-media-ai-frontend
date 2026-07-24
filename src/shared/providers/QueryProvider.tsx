"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, gcTime: 300_000, retry: 1, retryDelay: (attempt) => Math.min(1_000 * 2 ** attempt, 4_000), refetchOnWindowFocus: false, refetchOnReconnect: true },
      mutations: { retry: 0 },
    },
  }));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
