import * as React from "react";

import type { LinkVariant } from "~/lib/tiptap/link-extension";
import { normalizeEditorHref } from "~/lib/normalize-editor-href";
import { SAFE_HREF_MESSAGE } from "~/lib/safe-href";
import { coerceLinkVariant } from "~/lib/tiptap/link-extension";
import {
  autoOpenInNewTab,
  defaultOpenInNewTab,
} from "~/lib/tiptap/link-target";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { SiteLinkPicker } from "./site-link-picker";

export interface LinkEditorProps extends React.ComponentProps<"div"> {
  defaultUrl?: string;
  defaultText?: string;
  /**
   * Legacy: the switch's starting state. Prefer `defaultTarget`, which lets
   * an external link with no stored target show ON (what the storefront does).
   */
  defaultIsNewTab?: boolean;
  /**
   * The link's stored `target` attr when editing an existing link. When given
   * (even `null`/`""`), the switch starts at the link's effective behaviour
   * (`defaultOpenInNewTab`) and `defaultIsNewTab` is ignored.
   */
  defaultTarget?: string | null;
  /** Current button style; `null`/`undefined` is a plain link. */
  defaultVariant?: LinkVariant | null;
  /**
   * `isNewTab` is the switch's state. Store it with `linkTargetAttr(isNewTab)`
   * (`"_blank"` / `"_self"`), never `""`: an empty target on an external link
   * renders as a new tab.
   */
  onSave: (
    url: string,
    text?: string,
    isNewTab?: boolean,
    variant?: LinkVariant | null,
  ) => void;
}

/**
 * Where the switch starts. Editing (`defaultUrl` set): the link's effective
 * behaviour when its stored target is known, else the legacy boolean. New
 * link: follows the URL type (normally empty → off).
 */
function initialIsNewTab(
  defaultUrl: string | undefined,
  defaultTarget: string | null | undefined,
  defaultIsNewTab: boolean | undefined,
): boolean {
  if (defaultUrl) {
    if (defaultTarget !== undefined) {
      return defaultOpenInNewTab(defaultUrl, defaultTarget);
    }
    return defaultIsNewTab ?? defaultOpenInNewTab(defaultUrl, null);
  }
  return defaultIsNewTab ?? autoOpenInNewTab(defaultUrl ?? "");
}

/** What the Style control shows: a plain link or a button variant. */
type LinkStyle = "link" | LinkVariant;

const STYLE_OPTIONS: { value: LinkStyle; label: string }[] = [
  { value: "link", label: "Link" },
  { value: "solid", label: "Button" },
  { value: "outline", label: "Outline button" },
];

export const LinkEditBlock = ({
  onSave,
  defaultIsNewTab,
  defaultTarget,
  defaultUrl,
  defaultText,
  defaultVariant,
  className,
}: LinkEditorProps) => {
  const [urlError, setUrlError] = React.useState<string | null>(null);
  const [url, setUrl] = React.useState(defaultUrl ?? "");
  const [text, setText] = React.useState(defaultText ?? "");
  const [isNewTab, setIsNewTab] = React.useState(() =>
    initialIsNewTab(defaultUrl, defaultTarget, defaultIsNewTab),
  );
  // A new link's switch follows the URL type until the owner flips it (or
  // picks a page); an existing link's switch never moves on its own.
  const [isNewTabChosen, setIsNewTabChosen] = React.useState(
    () => !!defaultUrl || defaultIsNewTab !== undefined,
  );
  const [style, setStyle] = React.useState<LinkStyle>(
    coerceLinkVariant(defaultVariant) ?? "link",
  );

  const handleSave = React.useCallback(
    (e?: React.SyntheticEvent) => {
      e?.preventDefault();
      // Site-host matches are resolved here (event handler), so SSR never
      // touches `window`.
      const href = normalizeEditorHref(url, {
        siteHosts: [window.location.host],
      });
      if (href === null) {
        setUrlError(url.trim() === "" ? "Enter a link." : SAFE_HREF_MESSAGE);
        return;
      }
      setUrlError(null);
      onSave(
        href,
        text || undefined,
        isNewTab,
        style === "link" ? null : style,
      );
    },
    [onSave, url, text, isNewTab, style],
  );

  return (
    <div>
      <div className={cn("space-y-4", className)}>
        <div className="space-y-1">
          <Label>URL</Label>
          <Input
            type="text"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="/contact or https://…"
            value={url}
            aria-invalid={urlError ? true : undefined}
            aria-describedby={urlError ? "link-url-error" : undefined}
            onChange={(e) => {
              const next = e.target.value;
              setUrl(next);
              if (urlError) setUrlError(null);
              if (!isNewTabChosen) {
                setIsNewTab(autoOpenInNewTab(next, [window.location.host]));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave(e);
            }}
          />
          {urlError && (
            <p
              id="link-url-error"
              role="alert"
              className="text-destructive text-xs"
            >
              {urlError}
            </p>
          )}
          <SiteLinkPicker
            onPick={(path) => {
              setUrl(path);
              setUrlError(null);
              // A page on this site belongs in the same tab.
              setIsNewTab(false);
              setIsNewTabChosen(true);
            }}
          />
        </div>

        <div className="space-y-1">
          <Label>Display Text (optional)</Label>
          <Input
            type="text"
            placeholder="Enter display text"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <Label>Style</Label>
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={style}
            // Radix emits "" when the active item is clicked again; keep one selected.
            onValueChange={(value) => {
              if (value) setStyle(value as LinkStyle);
            }}
            aria-label="Link style"
          >
            {STYLE_OPTIONS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                className="px-3"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="flex items-center space-x-2">
          <Label>Open in New Tab</Label>
          <Switch
            checked={isNewTab}
            onCheckedChange={(checked) => {
              setIsNewTab(checked);
              setIsNewTabChosen(true);
            }}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    </div>
  );
};

LinkEditBlock.displayName = "LinkEditBlock";

export default LinkEditBlock;
