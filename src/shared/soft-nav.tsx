"use client";

import { createContext, useContext, type MouseEvent, type ReactNode } from "react";

import { Link } from "@/i18n/navigation";

export type SoftNavigate = (href: string, event: MouseEvent<HTMLAnchorElement>) => void;

const SoftNavContext = createContext<SoftNavigate | null>(null);

export function SoftNavProvider({ navigate, children }: { navigate: SoftNavigate; children: ReactNode }) {
  return <SoftNavContext.Provider value={navigate}>{children}</SoftNavContext.Provider>;
}

/** Prefer AppShell soft-nav so nested links stay correct after optimistic pushState. */
export function SoftNavLink({
  href,
  className,
  children,
  onClick,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}) {
  const navigate = useContext(SoftNavContext);
  return (
    <Link
      href={href}
      className={className}
      prefetch={true}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented) return;
        if (navigate) navigate(href, event);
      }}
    >
      {children}
    </Link>
  );
}
