"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc`; returns `#rrggbb` or null. */
export function parseHex(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  }
  return HEX_PATTERN.test(value) ? value : null;
}

/**
 * Native color picker + hex text + Clear. Native color inputs have no empty
 * state, so an unset color shows dimmed and `null` is written back on Clear.
 * The hex box keeps a local draft so a half-typed value doesn't fight the
 * owner; it commits once it parses and resets on blur.
 *
 * `autoColor` is what applies while nothing is set (e.g. a color matched by
 * name): the native picker opens on it instead of black. The hex box stays
 * empty so it's clear nothing custom is stored.
 */
export function SwatchColorControl({
  value,
  onChange,
  label,
  autoColor,
  emptyLabel = "No color",
  clearLabel = "Clear",
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  label: string;
  autoColor?: string | null;
  emptyLabel?: string;
  clearLabel?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? "";

  return (
    <div className="flex items-center gap-2">
      <Input
        type="color"
        aria-label={label}
        value={value ?? autoColor ?? "#000000"}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        className={cn(
          "h-9 w-12 shrink-0 cursor-pointer p-1",
          !value && "opacity-50",
        )}
      />
      <Input
        aria-label={`${label} (hex)`}
        value={shown}
        placeholder={emptyLabel}
        maxLength={7}
        spellCheck={false}
        className="w-28 font-mono text-xs uppercase"
        onChange={(event) => {
          const raw = event.target.value;
          setDraft(raw);
          const parsed = parseHex(raw);
          if (parsed) onChange(parsed);
          else if (raw.trim() === "") onChange(null);
        }}
        onBlur={() => setDraft(null)}
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-muted-foreground h-8 px-2 text-xs"
          onClick={() => {
            setDraft(null);
            onChange(null);
          }}
        >
          <X className="size-3.5" aria-hidden="true" />
          {clearLabel}
          <span className="sr-only"> {label}</span>
        </Button>
      ) : null}
    </div>
  );
}
