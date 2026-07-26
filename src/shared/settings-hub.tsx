"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { useScopeBlockGuidance } from "@/shared/scope-block-guidance";
import { SoftNavLink } from "@/shared/soft-nav";
import type { ScopePrerequisite } from "@/shared/workspace-scope";
import { useWorkspaceScope } from "@/shared/workspace-scope";

type HubCard = {
  href: string;
  title: string;
  description: string;
  requireTenant?: boolean;
  requireCompany?: boolean;
};

type BlockReason = {
  title: string;
  reason: string;
};

const CARDS: HubCard[] = [
  {
    href: "/settings/companies",
    title: "Companies",
    description: "Manage companies within this tenant.",
    requireTenant: true,
  },
  {
    href: "/settings/company-context",
    title: "Company Context",
    description: "View the effective approved context.",
    requireCompany: true,
  },
  {
    href: "/settings/company-context/draft",
    title: "Context draft flow",
    description: "Generate a draft and save to activate company context.",
    requireCompany: true,
  },
  {
    href: "/settings/alert-preferences",
    title: "Alert preferences",
    description: "Configure high alerts, digest, quiet hours, and timezone.",
    requireCompany: true,
  },
  {
    href: "/settings/display-language",
    title: "Display language",
    description: "Choose Bahasa Indonesia or English for newly generated AI output.",
    requireCompany: true,
  },
];

function blockReasonFor(card: HubCard, missing: ScopePrerequisite): BlockReason {
  const title = `Cannot open ${card.title}`;
  if (missing === "tenant") {
    return {
      title,
      reason: `${card.title} manages the companies inside one customer tenant, and your session has no tenant.`,
    };
  }
  if (card.href.includes("company-context/draft")) {
    return {
      title,
      reason: "The context draft flow writes a draft for one active company, and your session has no active company.",
    };
  }
  if (card.href.includes("alert-preferences")) {
    return {
      title,
      reason: "Alert preferences are stored per company, and your session has no active company selected.",
    };
  }
  if (card.href.includes("display-language")) {
    return {
      title,
      reason: "Display language preference is stored per company, and your session has no active company selected.",
    };
  }
  return {
    title,
    reason: "Company Context shows the approved context of one active company, and your session has no active company.",
  };
}

function cardMissingPrerequisite(
  card: HubCard,
  scope: { hasTenant: boolean; hasCompany: boolean },
): ScopePrerequisite | null {
  if (card.requireTenant && !scope.hasTenant) return "tenant";
  if (card.requireCompany && !scope.hasCompany) return "company";
  return null;
}

function ScopeBlockDialog({
  card,
  missing,
  onClose,
}: {
  card: HubCard;
  missing: ScopePrerequisite;
  onClose: () => void;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const copy = blockReasonFor(card, missing);
  const guidance = useScopeBlockGuidance(true, missing);

  useEffect(() => {
    closeRef.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="scope-block-backdrop"
      role="presentation"
      data-testid="settings-hub-block-backdrop"
      onClick={onClose}
    >
      <div
        className="scope-block-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        data-testid="settings-hub-block-dialog"
        data-guidance-state={guidance.isLoading ? "loading" : "ready"}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id={titleId}>{copy.title}</h2>
        <p data-testid="settings-hub-block-reason">{copy.reason}</p>
        <p data-testid="settings-hub-block-body">{guidance.body}</p>
        <div className="scope-block-actions">
          {guidance.action && (
            <SoftNavLink href={guidance.action.href} className="context-action" onClick={() => onClose()}>
              {guidance.action.label}
            </SoftNavLink>
          )}
          <button ref={closeRef} type="button" className="scope-block-dismiss" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function HubCardControl({
  card,
  missing,
  onBlocked,
}: {
  card: HubCard;
  missing: ScopePrerequisite | null;
  onBlocked: (card: HubCard, missing: ScopePrerequisite) => void;
}) {
  const [shaking, setShaking] = useState(false);
  const shakeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
  }, []);

  function triggerShake() {
    setShaking(true);
    if (shakeTimer.current) clearTimeout(shakeTimer.current);
    shakeTimer.current = setTimeout(() => setShaking(false), 450);
  }

  const content: ReactNode = (
    <>
      <strong>{card.title}</strong>
      <span>{card.description}</span>
      <em>Open →</em>
    </>
  );

  if (!missing) {
    return (
      <SoftNavLink
        href={card.href}
        className="settings-hub-card"
      >
        {content}
      </SoftNavLink>
    );
  }

  return (
    <button
      type="button"
      className={`settings-hub-card settings-hub-card-button${shaking ? " is-shaking" : ""}`}
      data-testid={`settings-hub-card-${card.title.toLowerCase().replace(/\s+/g, "-")}`}
      data-blocked-by={missing}
      aria-haspopup="dialog"
      onClick={() => {
        triggerShake();
        onBlocked(card, missing);
      }}
    >
      {content}
    </button>
  );
}

export function SettingsHub() {
  const scope = useWorkspaceScope();
  const [block, setBlock] = useState<{ card: HubCard; missing: ScopePrerequisite } | null>(null);

  return (
    <div className="settings-hub">
      <div className="page-context">
        <span className="supporting-text">Manage the company intelligence context and alert evaluation preferences.</span>
      </div>
      <div className="settings-hub-grid">
        {CARDS.map((card) => (
          <HubCardControl
            key={card.href}
            card={card}
            missing={cardMissingPrerequisite(card, scope)}
            onBlocked={(nextCard, missing) => setBlock({ card: nextCard, missing })}
          />
        ))}
      </div>
      {block && (
        <ScopeBlockDialog card={block.card} missing={block.missing} onClose={() => setBlock(null)} />
      )}
    </div>
  );
}
