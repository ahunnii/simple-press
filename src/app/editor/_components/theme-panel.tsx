"use client";

import { Check, X } from "lucide-react";

import type { PanelVariant } from "./panel-variant";
import type { SpTextWidth, SpThemeSelection } from "~/lib/sp-meta";
import type {
  TemplateFontPairing,
  TemplateTheme,
  TemplateThemePalette,
} from "~/lib/template-themes";
import { TEXT_WIDTHS } from "~/lib/sp-meta";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

import {
  PANEL_ASIDE_CLASS,
  PANEL_CLOSE_BUTTON_CLASS,
  PANEL_SHEET_BODY_CLASS,
} from "./panel-variant";

const TEXT_WIDTH_LABELS: Record<SpTextWidth, string> = {
  readable: "Readable",
  roomy: "Roomy",
  full: "Full",
};

export type ThemePanelProps = {
  /** The template's curated palettes/fonts, or null when it has none. */
  theme: TemplateTheme | null;
  /** Current stored selection (empty object = stock design). */
  selection: SpThemeSelection;
  /** Select a preset, or undefined to revert that kind to the stock design. */
  onSelect: (kind: "palette" | "fonts", presetId: string | undefined) => void;
  /** Site-wide text width on pages set to Wide. */
  textWidth: SpTextWidth;
  onTextWidthSelect: (value: SpTextWidth) => void;
  /** Freeze inputs while publish/discard is settling. */
  disabled?: boolean;
  /** Desktop right column (default) or compact bottom-sheet content. */
  variant?: PanelVariant;
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
 * Right-hand "Style" panel: curated color palettes and font pairings for the
 * active template (when it has any) plus the site-wide text width on Wide
 * pages. "Original" reverts to the template's stock design. Every change goes
 * through the draft pipeline, so it previews before publish.
 */
export function ThemePanel({
  theme,
  selection,
  onSelect,
  textWidth,
  onTextWidthSelect,
  disabled = false,
  variant = "sidebar",
  onClose,
}: ThemePanelProps) {
  return (
    <aside className={PANEL_ASIDE_CLASS[variant]}>
      <div className="flex items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">Style</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            {theme
              ? "Colors, fonts and text width for your site. Changes preview before you publish."
              : "Site-wide look and feel. Changes preview before you publish."}
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={PANEL_CLOSE_BUTTON_CLASS[variant]}
          aria-label="Close style panel"
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
          variant === "sheet" && PANEL_SHEET_BODY_CLASS,
        )}
      >
        {theme && theme.palettes.length > 0 && (
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

        {theme && theme.fonts.length > 0 && (
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

        <div className="space-y-2">
          <h3 id="sp-text-width-label" className="text-sm font-medium">
            Text width on wide pages
          </h3>
          <p id="sp-text-width-help" className="text-muted-foreground text-xs">
            How wide paragraphs run on pages set to Wide. Readable keeps lines
            comfortable; Full lines text up with rows.
          </p>
          <div
            role="group"
            aria-labelledby="sp-text-width-label"
            aria-describedby="sp-text-width-help"
            className="bg-muted grid grid-cols-3 gap-1 rounded-md p-1"
          >
            {TEXT_WIDTHS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={textWidth === value}
                onClick={() => onTextWidthSelect(value)}
                className={cn(
                  "rounded px-2 py-1.5 text-sm transition-colors",
                  textWidth === value
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {TEXT_WIDTH_LABELS[value]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
