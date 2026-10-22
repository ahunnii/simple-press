"use client";

import { useId, useState } from "react";
import { AlertTriangle, Loader2, Package, X } from "lucide-react";

import type { AudienceProduct } from "./audience-product-picker-dialog";
import type { Audience, AudienceType } from "~/lib/marketing/segments";
import { AUDIENCE_LABELS, audienceSchema } from "~/lib/marketing/segments";
import { api } from "~/trpc/react";
import { useDebouncedValue } from "~/hooks/use-debounced-value";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { pluralize } from "../_lib/format";
import { AudienceProductPickerDialog } from "./audience-product-picker-dialog";

const LAPSED_DAYS = [30, 60, 90, 180] as const;
const RECENT_DAYS = [7, 30, 90] as const;

/**
 * "≈ N people" for a segment, debounced so dragging through options doesn't
 * fire a query per click. `count` is null until the first answer arrives (or
 * while the segment is incomplete, e.g. "bought" with no products yet).
 * `baseCount` is the unsegmented total the page already knows.
 */
export function useAudienceCount(audience: Audience, baseCount: number) {
  const key = JSON.stringify(audience);
  const debouncedKey = useDebouncedValue(key, 300);
  const parsed = audienceSchema.safeParse(JSON.parse(debouncedKey));
  const query = api.marketing.countAudience.useQuery(
    { audience: parsed.success ? parsed.data : { type: "all" } },
    {
      enabled: parsed.success,
      placeholderData: (previous) => previous,
      initialData: audience.type === "all" ? { count: baseCount } : undefined,
    },
  );
  const complete = audienceSchema.safeParse(audience).success;
  const loading = key !== debouncedKey || (complete && query.isFetching);
  return {
    count: complete ? (query.data?.count ?? null) : null,
    loading: complete && loading,
    isError: query.isError,
  };
}

type Props = {
  value: Audience;
  onChange: (audience: Audience) => void;
  /** Names for the ids in a "bought" segment (chips). */
  productNames: Record<string, string>;
  /** Called with the picker's choice so the parent can remember the names. */
  onProductsPicked: (products: AudienceProduct[]) => void;
  /** "Bought specific products" needs the products feature (the search). */
  productsEnabled?: boolean;
  count: number | null;
  loading: boolean;
  countFailed?: boolean;
  /** Validation message for the segment (e.g. no products chosen). */
  error?: string;
  disabled?: boolean;
};

export function AudienceSelector({
  value,
  onChange,
  productNames,
  onProductsPicked,
  productsEnabled = true,
  count,
  loading,
  countFailed,
  error,
  disabled,
}: Props) {
  const uid = useId();
  const [pickerOpen, setPickerOpen] = useState(false);
  // Remembered so flipping away from "Bought…" and back keeps the picks.
  const [lastProductIds, setLastProductIds] = useState<string[]>(
    value.type === "bought" ? value.productIds : [],
  );

  const select = (type: AudienceType) => {
    switch (type) {
      case "all":
      case "customers":
      case "never-ordered":
        onChange({ type });
        return;
      case "bought":
        onChange({ type, productIds: lastProductIds });
        return;
      case "lapsed":
        onChange({ type, days: 90 });
        return;
      case "recent-signup":
        onChange({ type, days: 30 });
        return;
    }
  };

  const boughtIds = value.type === "bought" ? value.productIds : [];
  const setBoughtIds = (ids: string[]) => {
    setLastProductIds(ids);
    onChange({ type: "bought", productIds: ids });
  };

  const optionClass =
    "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-md border px-3 py-2.5";
  const radioId = (type: AudienceType) => `${uid}-${type}`;

  const simple: { type: AudienceType; label: string }[] = [
    { type: "all", label: AUDIENCE_LABELS.all },
    { type: "customers", label: AUDIENCE_LABELS.customers },
    { type: "never-ordered", label: AUDIENCE_LABELS["never-ordered"] },
  ];

  return (
    <div className="space-y-3">
      <RadioGroup
        value={value.type}
        onValueChange={(v) => select(v as AudienceType)}
        disabled={disabled}
        aria-label="Who should receive this campaign"
        className="gap-2"
      >
        {simple.map((option) => (
          <div key={option.type} className={optionClass}>
            <RadioGroupItem
              id={radioId(option.type)}
              value={option.type}
              disabled={disabled}
            />
            <Label htmlFor={radioId(option.type)} className="font-normal">
              {option.label}
            </Label>
          </div>
        ))}

        <div className={optionClass}>
          <RadioGroupItem
            id={radioId("bought")}
            value="bought"
            disabled={(disabled ?? false) || !productsEnabled}
          />
          <Label htmlFor={radioId("bought")} className="font-normal">
            {AUDIENCE_LABELS.bought}
          </Label>
          {value.type === "bought" && (
            <div className="basis-full space-y-2 pl-7">
              {boughtIds.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {boughtIds.map((id) => {
                    const name = productNames[id] ?? "Unavailable product";
                    return (
                      <li
                        key={id}
                        className="bg-muted/60 flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2.5 text-xs"
                      >
                        <span className="max-w-48 truncate">{name}</span>
                        <button
                          type="button"
                          aria-label={`Remove ${name}`}
                          disabled={disabled}
                          onClick={() =>
                            setBoughtIds(boughtIds.filter((x) => x !== id))
                          }
                          className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring flex size-5 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:outline-none"
                        >
                          <X className="size-3" aria-hidden />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={disabled}
                onClick={() => setPickerOpen(true)}
              >
                <Package className="mr-2 h-4 w-4" aria-hidden="true" />
                {boughtIds.length > 0 ? "Change products" : "Choose products"}
              </Button>
              <p className="text-muted-foreground text-xs">
                Counts paid orders only. Pick up to 20 products; anyone who
                bought at least one of them is included.
              </p>
              {error && (
                <p role="alert" className="text-destructive text-sm">
                  {error}
                </p>
              )}
            </div>
          )}
          {!productsEnabled && (
            <span className="text-muted-foreground basis-full pl-7 text-xs">
              Turn on products to pick by purchase.
            </span>
          )}
        </div>

        <div className={optionClass}>
          <RadioGroupItem
            id={radioId("lapsed")}
            value="lapsed"
            disabled={disabled}
          />
          <Label htmlFor={radioId("lapsed")} className="font-normal">
            {AUDIENCE_LABELS.lapsed}…
          </Label>
          {value.type === "lapsed" && (
            <Select
              value={String(value.days)}
              onValueChange={(v) =>
                onChange({
                  type: "lapsed",
                  days: Number(v) as (typeof LAPSED_DAYS)[number],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                className="w-36"
                aria-label="Days since last order"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LAPSED_DAYS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className={optionClass}>
          <RadioGroupItem
            id={radioId("recent-signup")}
            value="recent-signup"
            disabled={disabled}
          />
          <Label htmlFor={radioId("recent-signup")} className="font-normal">
            {AUDIENCE_LABELS["recent-signup"]}…
          </Label>
          {value.type === "recent-signup" && (
            <Select
              value={String(value.days)}
              onValueChange={(v) =>
                onChange({
                  type: "recent-signup",
                  days: Number(v) as (typeof RECENT_DAYS)[number],
                })
              }
              disabled={disabled}
            >
              <SelectTrigger
                size="sm"
                className="w-36"
                aria-label="Days since signing up"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RECENT_DAYS.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days} days
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </RadioGroup>

      <AudienceCountLine count={count} loading={loading} failed={countFailed} />

      <AudienceProductPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        initial={boughtIds.map((id) => ({
          id,
          name: productNames[id] ?? "Unavailable product",
        }))}
        onConfirm={(products) => {
          onProductsPicked(products);
          setBoughtIds(products.map((p) => p.id));
        }}
      />
    </div>
  );
}

/** "≈ 42 people" with a spinner while it updates; a muted warning at zero. */
function AudienceCountLine({
  count,
  loading,
  failed,
}: {
  count: number | null;
  loading: boolean;
  failed?: boolean;
}) {
  return (
    <div className="text-sm" aria-live="polite">
      {count === null ? (
        <p className="text-muted-foreground flex items-center gap-2">
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          )}
          {failed
            ? "Couldn't count this audience. Try again in a moment."
            : "Finish choosing to see how many people this reaches."}
        </p>
      ) : count === 0 && !loading ? (
        <p className="text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
          No one matches yet. You can save this as a draft, but not send it.
        </p>
      ) : (
        <p className="flex items-center gap-2">
          <span className="font-medium tabular-nums">
            ≈ {count.toLocaleString()} {pluralize(count, "person", "people")}
          </span>
          {loading ? (
            <Loader2
              className="text-muted-foreground h-4 w-4 animate-spin"
              aria-label="Updating"
            />
          ) : (
            <span className="text-muted-foreground">
              opted in to marketing emails will receive this.
            </span>
          )}
        </p>
      )}
    </div>
  );
}
