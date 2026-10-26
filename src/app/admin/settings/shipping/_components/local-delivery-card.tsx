"use client";

import type { UseFormReturn } from "react-hook-form";
import { Plus, Trash2 } from "lucide-react";
import { useFieldArray } from "react-hook-form";

import type { LocalDeliveryFormValues } from "~/lib/validators/shipping";
import { MAX_LOCAL_DELIVERY_BANDS } from "~/lib/local-delivery-bands";
import { dollarsToCents } from "~/lib/prices";
import { formatCurrency } from "~/lib/utils";
import {
  LOCAL_DELIVERY_RADIUS_MAX,
  LOCAL_DELIVERY_RADIUS_MIN,
} from "~/lib/validators/shipping";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

/** "$3.00" / "Free" for a still-being-typed dollar string; null if unusable. */
function priceLabel(dollars: string): string | null {
  const t = dollars.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const cents = dollarsToCents(t);
  if (!Number.isFinite(cents)) return null;
  return cents === 0 ? "Free" : formatCurrency(cents);
}

/**
 * One-line summary of the pricing rings, built from what's typed so far:
 * "Free within 5 mi · $3.00 within 10 mi · $5.00 up to 15 mi". Rows that
 * aren't valid yet are skipped; null until at least one row counts.
 */
function describeRings(
  radius: string,
  baseFee: string,
  rows: LocalDeliveryFormValues["bands"],
): string | null {
  const radiusN = /^\d+$/.test(radius.trim())
    ? Number.parseInt(radius.trim(), 10)
    : NaN;
  const base = priceLabel(baseFee);
  if (Number.isNaN(radiusN) || base === null) return null;
  const seen = new Set<number>();
  const rings = rows
    .map((r) => ({
      miles: /^\d+$/.test(r.upToMiles.trim())
        ? Number.parseInt(r.upToMiles.trim(), 10)
        : NaN,
      price: priceLabel(r.feeDollars),
    }))
    .filter((r) => {
      if (Number.isNaN(r.miles) || r.price === null) return false;
      if (r.miles < 1 || r.miles >= radiusN || seen.has(r.miles)) return false;
      seen.add(r.miles);
      return true;
    })
    .sort((a, b) => a.miles - b.miles);
  if (rings.length === 0) return null;
  return [
    ...rings.map((r) => `${r.price} within ${r.miles} mi`),
    `${base} up to ${radiusN} mi`,
  ].join(" · ");
}

export type LocalDeliveryOriginPlace = { city: string; state: string } | null;

type Props = {
  /** Must be rendered inside a shadcn `<Form {...form}>` provider. */
  form: UseFormReturn<LocalDeliveryFormValues>;
  /** The business address ZIP the server falls back to (placeholder only). */
  fallbackZip: string | null;
  /** City/state of the saved origin ZIP, for the "Measuring from" line. */
  originPlace: LocalDeliveryOriginPlace;
};

/**
 * "Local delivery" card for the shipping settings page: the owner drives
 * orders to customers within N miles of a ZIP. Saved by the page's toolbar
 * Save through `business.updateLocalDelivery`.
 */
export function LocalDeliveryCard({ form, fallbackZip, originPlace }: Props) {
  const enabled = form.watch("offersLocalDelivery");
  const {
    fields: bandFields,
    append: appendBand,
    remove: removeBand,
  } = useFieldArray({ control: form.control, name: "bands" });
  const radiusValue = form.watch("radiusMiles");
  const feeValue = form.watch("feeDollars");
  const bandRows = form.watch("bands");
  const ringSummary = describeRings(radiusValue, feeValue, bandRows);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Local delivery</CardTitle>
        <CardDescription>
          Deliver orders yourself to customers who live near you. They choose
          &ldquo;Local delivery&rdquo; at checkout when their address is inside
          your radius.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="offersLocalDelivery"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">
                  Offer local delivery
                </FormLabel>
                <p className="text-muted-foreground text-sm">
                  Customers inside your delivery radius can pick this instead of
                  shipping.
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        {enabled && (
          <div className="space-y-4 rounded-lg border p-4">
            <FormField
              control={form.control}
              name="originZip"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deliver from ZIP</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={10}
                      placeholder={
                        fallbackZip?.trim() ? fallbackZip.trim() : "e.g. 48104"
                      }
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    We measure from the center of this ZIP code — your address
                    stays private. Leave blank to use your business address ZIP.
                  </FormDescription>
                  {originPlace && (
                    <p
                      className="text-sm font-medium"
                      data-testid="local-delivery-origin"
                    >
                      Measuring from {originPlace.city}, {originPlace.state}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="radiusMiles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery radius (miles)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      placeholder="15"
                      className="max-w-40"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {LOCAL_DELIVERY_RADIUS_MIN}–{LOCAL_DELIVERY_RADIUS_MAX}{" "}
                    miles. Distance is measured between ZIP code centers, so
                    it&apos;s approximate near the edge.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="feeDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Delivery fee</FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                        $
                      </span>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="5.00"
                          className="pl-7"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      $0 = free delivery. With closer prices below, this is the
                      price for the farthest ring.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minOrderDollars"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minimum order (optional)</FormLabel>
                    <div className="relative">
                      <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                        $
                      </span>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="25.00"
                          className="pl-7"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      Leave blank for no minimum.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3" data-testid="local-delivery-bands">
              <div>
                <p className="text-sm leading-none font-medium">
                  Closer prices (optional)
                </p>
                <p className="text-muted-foreground mt-1.5 text-[0.8rem]">
                  Charge less (or nothing) for customers nearer to you. Anyone
                  farther pays the delivery fee above.
                </p>
              </div>

              {bandFields.map((bandField, index) => (
                <div key={bandField.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground mt-2 text-sm">
                    Within
                  </span>
                  <FormField
                    control={form.control}
                    name={`bands.${index}.upToMiles`}
                    render={({ field }) => (
                      <FormItem className="w-24 shrink-0">
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            placeholder="5"
                            aria-label={`Closer price ${index + 1} distance in miles`}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <span className="text-muted-foreground mt-2 text-sm">
                    miles &rarr;
                  </span>
                  <FormField
                    control={form.control}
                    name={`bands.${index}.feeDollars`}
                    render={({ field }) => (
                      <FormItem className="w-28 shrink-0">
                        <div className="relative">
                          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                            $
                          </span>
                          <FormControl>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="0.00"
                              className="pl-7"
                              aria-label={`Closer price ${index + 1} delivery fee`}
                              {...field}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive shrink-0"
                    aria-label={`Remove closer price ${index + 1}`}
                    onClick={() => removeBand(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {ringSummary && (
                <p
                  className="text-muted-foreground text-sm"
                  data-testid="local-delivery-band-preview"
                >
                  {ringSummary}
                </p>
              )}

              {bandFields.length < MAX_LOCAL_DELIVERY_BANDS && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendBand({ upToMiles: "", feeDollars: "" })}
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add a closer price
                </Button>
              )}
            </div>

            <FormField
              control={form.control}
              name="instructions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Delivery days &amp; instructions</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="I deliver Tuesday and Thursday evenings. I'll text you when I'm on my way."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Shown to customers at checkout and in their confirmation
                    email.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
