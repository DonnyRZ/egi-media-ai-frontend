"use client";

import { useEffect, type RefObject } from "react";

const SELECTABLE = "a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex='-1'])";

export function useFocusTrap<T extends HTMLElement>(ref: RefObject<T | null>, active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active || !ref.current) return;
    const container = ref.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(SELECTABLE)).filter((element) => !element.hasAttribute("aria-hidden"));
    focusable()[0]?.focus();
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); onEscape(); return; }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (!items.length) { event.preventDefault(); return; }
      const first = items[0]; const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => { document.removeEventListener("keydown", handleKeyDown); previouslyFocused?.focus(); };
  }, [active, onEscape, ref]);
}
