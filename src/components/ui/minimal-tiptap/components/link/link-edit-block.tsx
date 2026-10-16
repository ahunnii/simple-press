import * as React from "react";

import type { LinkVariant } from "~/lib/tiptap/link-extension";
import { coerceLinkVariant } from "~/lib/tiptap/link-extension";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

export interface LinkEditorProps extends React.ComponentProps<"div"> {
  defaultUrl?: string;
  defaultText?: string;
  defaultIsNewTab?: boolean;
  /** Current button style; `null`/`undefined` is a plain link. */
  defaultVariant?: LinkVariant | null;
  onSave: (
    url: string,
    text?: string,
    isNewTab?: boolean,
    variant?: LinkVariant | null,
  ) => void;
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
  defaultUrl,
  defaultText,
  defaultVariant,
  className,
}: LinkEditorProps) => {
  const formRef = React.useRef<HTMLDivElement>(null);
  const [url, setUrl] = React.useState(defaultUrl ?? "");
  const [text, setText] = React.useState(defaultText ?? "");
  const [isNewTab, setIsNewTab] = React.useState(defaultIsNewTab ?? false);
  const [style, setStyle] = React.useState<LinkStyle>(
    coerceLinkVariant(defaultVariant) ?? "link",
  );

  const handleSave = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (formRef.current) {
        const isValid = Array.from(
          formRef.current.querySelectorAll("input"),
        ).every((input) => input.checkValidity());

        if (isValid) {
          onSave(url, text, isNewTab, style === "link" ? null : style);
        } else {
          formRef.current.querySelectorAll("input").forEach((input) => {
            if (!input.checkValidity()) {
              input.reportValidity();
            }
          });
        }
      }
    },
    [onSave, url, text, isNewTab, style],
  );

  return (
    <div ref={formRef}>
      <div className={cn("space-y-4", className)}>
        <div className="space-y-1">
          <Label>URL</Label>
          <Input
            type="url"
            required
            placeholder="Enter URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
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
          <Switch checked={isNewTab} onCheckedChange={setIsNewTab} />
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
