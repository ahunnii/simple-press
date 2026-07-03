"use client";

import { Check, X } from "lucide-react";

import type { SpThemeSelection } from "~/lib/sp-meta";
import type {
  TemplateFontPairing,
  TemplateTheme,
  TemplateThemePalette,
} from "~/lib/template-themes";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

export type ThemePanelProps = {
  theme: TemplateTheme;
  /** Current stored selection (empty object = stock design). */
  selection: SpThemeSelection;
  /** Select a preset, or undefined to revert that kind to the stock design. */
  onSelect: (kind: "palette" | "fonts", presetId: string | undefined) => void;
  /** Freeze inputs while publish/discard is settling. */
  disabled?: boolean;
  onClose: () => void;
};

function PaletteSwatch({
  palette,
  isSelected,
  onClick,
}: {
  palette: TemplateThemePalette;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-center gap-3 rounded-md border p-3 text-left text-sm transition-colors",
        isSelected
          ? "border-primary ring-primary/30 ring-2"
          : "hover:bg-muted/60",
      )}
    >
      <span className="flex shrink-0 -space-x-1">
        {palette.swatch.map((color, i) => (
          <span
            key={i}
            className="border-background h-6 w-6 rounded-full border-2"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        ))}
      </span>
      <span className="min-w-0 flex-1 truncate">{palette.label}</span>
      {isSelected && (
        <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

function FontCard({
  pairing,
  isSelected,
  onClick,
}: {
  pairing: TemplateFontPairing;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm transition-colors",
        isSelected
          ? "border-primary ring-primary/30 ring-2"
          : "hover:bg-muted/60",
      )}
    >
      <span className="min-w-0 truncate">{pairing.label}</span>
      {isSelected && (
        <Check className="text-primary h-4 w-4 shrink-0" aria-hidden="true" />
      )}
    </button>
  );
}

/**
 * Right-hand theme chooser: curated color palettes and font pairings for the
 * active template. "Original" reverts to the template's stock design. Every
 * change goes through the draft pipeline, so it previews before publish.
 */
export function ThemePanel({
  theme,
  selection,
  onSelect,
  disabled = false,
  onClose,
}: ThemePanelProps) {
  return (
    <aside className="bg-card animate-in slide-in-from-right-8 fade-in flex w-[380px] shrink-0 flex-col border-l duration-200">
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Theme</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Colors and fonts curated for this template. Changes preview before
            you publish.
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Close theme panel"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div
        aria-disabled={disabled || undefined}
        className={cn(
          "flex-1 space-y-6 overflow-y-auto px-4 py-4",
          disabled && "pointer-events-none opacity-60",
        )}
      >
        {theme.palettes.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Color palette</h3>
            <button
              type="button"
              onClick={() => onSelect("palette", undefined)}
              aria-pressed={!selection.palette}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                !selection.palette
                  ? "border-primary ring-primary/30 ring-2"
                  : "hover:bg-muted/60",
              )}
            >
              <span>Original</span>
              {!selection.palette && (
                <Check
                  className="text-primary h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
            {theme.palettes.map((palette) => (
              <PaletteSwatch
                key={palette.id}
                palette={palette}
                isSelected={selection.palette === palette.id}
                onClick={() => onSelect("palette", palette.id)}
              />
            ))}
          </div>
        )}

        {theme.fonts.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Fonts</h3>
            <button
              type="button"
              onClick={() => onSelect("fonts", undefined)}
              aria-pressed={!selection.fonts}
              className={cn(
                "flex w-full items-center justify-between gap-3 rounded-md border p-3 text-left text-sm transition-colors",
                !selection.fonts
                  ? "border-primary ring-primary/30 ring-2"
                  : "hover:bg-muted/60",
              )}
            >
              <span>Original</span>
              {!selection.fonts && (
                <Check
                  className="text-primary h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
              )}
            </button>
            {theme.fonts.map((pairing) => (
              <FontCard
                key={pairing.id}
                pairing={pairing}
                isSelected={selection.fonts === pairing.id}
                onClick={() => onSelect("fonts", pairing.id)}
              />
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
