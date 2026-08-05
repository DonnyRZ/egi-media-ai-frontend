"use client";

import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export type AppSelectOption<Value extends string = string> = {
  value: Value;
  label: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
};

type AppSelectProps<Value extends string = string> = {
  value: Value;
  options: readonly AppSelectOption<Value>[];
  onChange: (value: Value) => void;
  id?: string;
  "aria-label"?: string;
  "data-testid"?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
  leading?: ReactNode;
  triggerKicker?: ReactNode;
};

function firstEnabledIndex<Value extends string>(options: readonly AppSelectOption<Value>[]) {
  return options.findIndex((option) => !option.disabled);
}

function lastEnabledIndex<Value extends string>(options: readonly AppSelectOption<Value>[]) {
  for (let index = options.length - 1; index >= 0; index -= 1) {
    if (!options[index].disabled) return index;
  }
  return -1;
}

function moveIndex<Value extends string>(options: readonly AppSelectOption<Value>[], current: number, direction: 1 | -1) {
  if (!options.length) return -1;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const candidate = (current + direction * offset + options.length) % options.length;
    if (!options[candidate].disabled) return candidate;
  }
  return current;
}

export function AppSelect<Value extends string = string>({
  value,
  options,
  onChange,
  id,
  "aria-label": ariaLabel,
  "data-testid": dataTestId,
  placeholder = "Select an option",
  disabled = false,
  className = "",
  size = "md",
  leading,
  triggerKicker,
}: AppSelectProps<Value>) {
  const generatedId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [open, setOpen] = useState(false);
  const selectedIndex = options.findIndex((option) => option.value === value);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : firstEnabledIndex(options));
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const rootId = id || `app-select-${generatedId}`;
  const menuId = `${rootId}-menu`;

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    setActiveIndex((current) => {
      if (selectedIndex >= 0 && !options[selectedIndex].disabled) return selectedIndex;
      return current >= 0 && !options[current]?.disabled ? current : firstEnabledIndex(options);
    });
  }, [options, selectedIndex]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    optionRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openMenu() {
    if (disabled || !options.length) return;
    setActiveIndex(selectedIndex >= 0 && !options[selectedIndex].disabled ? selectedIndex : firstEnabledIndex(options));
    setOpen(true);
  }

  function choose(option: AppSelectOption<Value>) {
    if (disabled || option.disabled) return;
    onChange(option.value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openMenu();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      event.preventDefault();
      setActiveIndex((current) => moveIndex(options, current < 0 ? 0 : current, 1));
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      event.preventDefault();
      setActiveIndex((current) => moveIndex(options, current < 0 ? 0 : current, -1));
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(firstEnabledIndex(options));
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(lastEnabledIndex(options));
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const option = options[activeIndex];
      if (option) choose(option);
    } else if (event.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className={`app-select app-select-${size} ${open ? "is-open" : ""} ${disabled ? "is-disabled" : ""} ${className}`.trim()}>
      <button
        ref={triggerRef}
        id={rootId}
        type="button"
        className="app-select-trigger"
        data-testid={dataTestId}
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuId}
        aria-activedescendant={open && activeIndex >= 0 ? `${menuId}-option-${activeIndex}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        {leading && <span className="app-select-leading" aria-hidden="true">{leading}</span>}
        <span className="app-select-value-wrap">
          {triggerKicker && <span className="app-select-trigger-kicker">{triggerKicker}</span>}
          <span className={`app-select-value ${selected ? "" : "is-placeholder"}`.trim()}>{selected?.label ?? placeholder}</span>
        </span>
        {selected?.meta && <span className="app-select-trigger-meta">{selected.meta}</span>}
        <ChevronDown className="app-select-chevron" size={17} strokeWidth={2} aria-hidden="true" />
      </button>
      {open && (
        <div className="app-select-menu" id={menuId} role="listbox" aria-label={ariaLabel || "Options"}>
          {options.map((option, index) => (
            <div
              key={option.value}
              ref={(element) => { optionRefs.current[index] = element; }}
              id={`${menuId}-option-${index}`}
              className={`app-select-option ${option.value === value ? "is-selected" : ""} ${index === activeIndex ? "is-active" : ""} ${option.disabled ? "is-disabled" : ""}`.trim()}
              role="option"
              aria-selected={option.value === value}
              aria-disabled={option.disabled || undefined}
              onMouseEnter={() => !option.disabled && setActiveIndex(index)}
              onPointerDown={(event) => {
                event.preventDefault();
                choose(option);
              }}
            >
              <span className="app-select-option-copy"><strong>{option.label}</strong>{option.meta && <small>{option.meta}</small>}</span>
              {option.value === value && <Check className="app-select-option-check" size={16} strokeWidth={2.5} aria-hidden="true" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
