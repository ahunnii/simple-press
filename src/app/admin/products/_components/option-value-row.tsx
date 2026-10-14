"use client";

import { useState } from "react";
import { ChevronDown, ImageIcon, Trash2, X } from "lucide-react";

import type { LinkedTarget, ValueDraft } from "./option-editor-types";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";

import { AdminThumb } from "../../_components/admin-thumb";
import { TemplateImageUploadField } from "../../content/template/_components/template-media-upload-fields";
import { linkedPriceCents } from "./option-editor-types";
import { OptionLinkPicker } from "./option-link-picker";

const HEX_PATTERN = /^#[0-9a-f]{6}$/i;

/** Accepts `#abc`, `abc`, `#aabbcc`, `aabbcc`; returns `#rrggbb` or null. */
function parseHex(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value.startsWith("#")) value = `#${value}`;
  if (/^#[0-9a-f]{3}$/.test(value)) {
    value = `#${[...value.slice(1)].map((c) => c + c).join("")}`;
  }
  return HEX_PATTERN.test(value) ? value : null;
}

type Props = {
  index: number;
  count: number;
  value: ValueDraft;
  error?: string;
  mediaLibraryEnabled?: boolean;
  onChange: (patch: Partial<ValueDraft>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
};

/**
 * One choice inside a group. Everything is controlled by the editor's draft
 * state; this component never talks to the server except to search products.
 * No `<form>` (the editor sits in a portaled dialog under the product form).
 */
export function OptionValueRow({
  index,
  count,
  value,
  error,
  mediaLibraryEnabled,
  onChange,
  onMove,
  onRemove,
}: Props) {
  const [photoOpen, setPhotoOpen] = useState(false);
  const n = index + 1;
  const id = `option-value-${value.key}`;

  return (
    <li className="bg-muted/40 space-y-3 rounded-lg border p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <Preview
          imageUrl={value.imageUrl}
          color={value.swatchColor}
          label={value.label}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <Input
            id={`${id}-label`}
            value={value.label}
            maxLength={80}
            placeholder={`Choice ${n}`}
            aria-label={`Choice ${n} name`}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange({ label: event.target.value })}
          />
          {error && <p className="text-destructive text-sm">{error}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move choice ${n} up`}
            disabled={index === 0}
            onClick={() => onMove(-1)}
          >
            <ChevronDown className="h-4 w-4 rotate-180" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Move choice ${n} down`}
            disabled={index === count - 1}
            onClick={() => onMove(1)}
          >
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive/80"
            aria-label={`Remove choice ${n}`}
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="space-y-3 sm:pl-[3.25rem]">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <SwatchColorControl
            value={value.swatchColor}
            onChange={(swatchColor) => onChange({ swatchColor })}
            label={`Choice ${n} color`}
          />
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-expanded={photoOpen}
              onClick={() => setPhotoOpen((open) => !open)}
            >
              <ImageIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              {value.imageUrl ? "Photo" : "Add photo"}
              <span className="sr-only"> for choice {n}</span>
            </Button>
            {value.imageUrl ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-8 px-2 text-xs"
                onClick={() => onChange({ imageUrl: null })}
              >
                <X className="size-3.5" aria-hidden="true" />
                Remove
                <span className="sr-only"> photo from choice {n}</span>
              </Button>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id={`${id}-available`}
              checked={value.available}
              onCheckedChange={(available) => onChange({ available })}
            />
            <Label htmlFor={`${id}-available`} className="font-normal">
              Available
              <span className="sr-only"> (choice {n})</span>
            </Label>
          </div>
        </div>

        {photoOpen && (
          <TemplateImageUploadField
            value={value.imageUrl ?? ""}
            onChange={(url) => onChange({ imageUrl: url || null })}
            accessibleName={`choice ${n} photo`}
            mediaLibraryEnabled={mediaLibraryEnabled}
          />
        )}

        <div className="space-y-3 border-t pt-3">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor={`${id}-mode`}>Price</Label>
            <Select
              value={value.mode}
              onValueChange={(mode) =>
                onChange({ mode: mode as ValueDraft["mode"] })
              }
            >
              <SelectTrigger id={`${id}-mode`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="addon">Add-on price</SelectItem>
                <SelectItem value="product">Use a product</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {value.mode === "addon" ? (
            <div className="max-w-40 space-y-1.5">
              <Label htmlFor={`${id}-addon`}>Added to the price</Label>
              <MoneyInput
                id={`${id}-addon`}
                value={value.addOnDollars}
                onChange={(addOnDollars) => onChange({ addOnDollars })}
                placeholder="0.00"
              />
              <p className="text-muted-foreground text-xs">
                Use $0.00 for a free choice.
              </p>
            </div>
          ) : (
            <LinkedPricing id={id} n={n} value={value} onChange={onChange} />
          )}
        </div>
      </div>
    </li>
  );
}

function LinkedPricing({
  id,
  n,
  value,
  onChange,
}: {
  id: string;
  n: number;
  value: ValueDraft;
  onChange: (patch: Partial<ValueDraft>) => void;
}) {
  const linked = value.linked;

  const setLinked = (next: LinkedTarget | null) => onChange({ linked: next });

  return (
    <div className="space-y-3">
      <p className="text-muted-foreground text-xs">
        The price and stock come from one of your products. Pick a draft product
        to track stock without listing it in your shop.
      </p>

      {linked ? (
        <div className="bg-background space-y-2 rounded-md border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{linked.productName}</span>
            {!linked.published && <Badge variant="secondary">Draft</Badge>}
            <span className="text-muted-foreground text-sm">
              Currently {formatPrice(linkedPriceCents(linked))}
            </span>
          </div>
          {linked.variants.length > 0 && (
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor={`${id}-variant`}>Which variant?</Label>
              <Select
                value={linked.variantId ?? undefined}
                onValueChange={(variantId) =>
                  setLinked({ ...linked, variantId })
                }
              >
                <SelectTrigger id={`${id}-variant`} className="w-full">
                  <SelectValue placeholder="Choose a variant" />
                </SelectTrigger>
                <SelectContent>
                  {linked.variants.map((variant) => (
                    <SelectItem key={variant.id} value={variant.id}>
                      {variant.name} ({formatPrice(variant.priceCents)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!linked.variantId && (
                <p className="text-destructive text-sm">
                  This product has variants. Choose which one to use.
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">No product chosen yet.</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <OptionLinkPicker
          accessibleName={`choice ${n}`}
          hasLink={Boolean(linked)}
          onPick={(target) => setLinked(target)}
        />
        {linked && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setLinked(null)}
          >
            Unlink
            <span className="sr-only"> product from choice {n}</span>
          </Button>
        )}
      </div>

      {linked && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Switch
              id={`${id}-override`}
              checked={value.overrideEnabled}
              onCheckedChange={(overrideEnabled) =>
                onChange({
                  overrideEnabled,
                  overrideDollars:
                    overrideEnabled && value.overrideDollars == null
                      ? linkedPriceCents(linked) / 100
                      : value.overrideDollars,
                })
              }
            />
            <Label htmlFor={`${id}-override`} className="font-normal">
              Charge a different price for this choice
            </Label>
          </div>
          {value.overrideEnabled && (
            <div className="max-w-40 space-y-1.5">
              <Label htmlFor={`${id}-override-price`}>
                Price for this choice
              </Label>
              <MoneyInput
                id={`${id}-override-price`}
                value={value.overrideDollars}
                onChange={(overrideDollars) => onChange({ overrideDollars })}
                placeholder="0.00"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Preview({
  imageUrl,
  color,
  label,
}: {
  imageUrl: string | null;
  color: string | null;
  label: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-background flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden border text-sm font-medium",
        imageUrl ? "rounded-md" : "rounded-full",
      )}
      style={!imageUrl && color ? { backgroundColor: color } : undefined}
    >
      {imageUrl ? (
        <AdminThumb
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : color ? null : (
        <span className="text-muted-foreground">
          {label.trim().charAt(0).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}

/**
 * Native color picker + hex text + Clear. Native color inputs have no empty
 * state, so an unset color shows dimmed and `null` is written back on Clear.
 * The hex box keeps a local draft so a half-typed value doesn't fight the
 * owner; it commits once it parses and resets on blur.
 */
function SwatchColorControl({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  label: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? value ?? "";

  return (
    <div className="flex items-center gap-2">
      <Input
        type="color"
        aria-label={label}
        value={value ?? "#000000"}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        className={cn(
          "h-9 w-12 shrink-0 cursor-pointer p-1",
          !value && "opacity-50",
        )}
      />
      <Input
        aria-label={`${label} (hex)`}
        value={shown}
        placeholder="No color"
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
          Clear
          <span className="sr-only"> {label}</span>
        </Button>
      ) : null}
    </div>
  );
}
