"use client";

import type { UseFormReturn } from "react-hook-form";

import type { ProductFormSchema } from "~/lib/validators/product";
import { SUBSCRIPTION_INTERVALS } from "~/lib/subscriptions/intervals";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import { SwitchFormField } from "~/components/inputs/switch-form-field";

type Props = {
  form: UseFormReturn<ProductFormSchema>;
};

/**
 * The product form's "Subscriptions" card — offer/cadence/discount for
 * `Product.subscriptionEnabled`/`subscriptionIntervals`/`subscriptionDiscountPercent`.
 * Extracted from `product-form.tsx` (2000+ lines, impractical to mount whole
 * in a DOM test) so this one card is independently testable; it takes the
 * SAME `form` instance the parent form owns, so wiring it in is just
 * rendering `<ProductSubscriptionCard form={form} />` — no new state, no
 * extra `Form`/`FormProvider` wrapper (the parent already renders one).
 *
 * Rendered only when the caller's `subscriptionsEnabled` prop (the
 * `subscriptions` feature flag, resolved server-side) is true — see
 * `product-form.tsx`.
 */
export function ProductSubscriptionCard({ form }: Props) {
  const enabled = form.watch("subscriptionEnabled");
  const intervals = form.watch("subscriptionIntervals") ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscriptions</CardTitle>
        <CardDescription>
          Let customers subscribe to this product on a recurring cadence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SwitchFormField
          form={form}
          name="subscriptionEnabled"
          label="Offer as a subscription"
          description="Adds a Subscribe option alongside Add to Cart on the product page."
        />

        {enabled && (
          <>
            <FormField
              control={form.control}
              name="subscriptionIntervals"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cadence</FormLabel>
                  <div className="space-y-2">
                    {SUBSCRIPTION_INTERVALS.map((interval) => {
                      const checkboxId = `subscription-interval-${interval.key}`;
                      const selected = (field.value ?? []).includes(
                        interval.key,
                      );
                      return (
                        <div
                          key={interval.key}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            id={checkboxId}
                            checked={selected}
                            onCheckedChange={(next) => {
                              const current = field.value ?? [];
                              field.onChange(
                                next
                                  ? [...current, interval.key]
                                  : current.filter(
                                      (key) => key !== interval.key,
                                    ),
                              );
                            }}
                          />
                          <Label
                            htmlFor={checkboxId}
                            className="cursor-pointer font-normal"
                          >
                            {interval.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  {intervals.length === 0 && (
                    <p className="text-destructive text-sm">
                      Choose at least one cadence
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subscriptionDiscountPercent"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subscribe &amp; save</FormLabel>
                  <div className="relative max-w-40">
                    <FormControl>
                      <NumberInput
                        step="1"
                        min="0"
                        max="90"
                        placeholder="0"
                        className="pr-7"
                        value={field.value}
                        onChange={(value) => field.onChange(value ?? 0)}
                      />
                    </FormControl>
                    <span className="text-muted-foreground pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                      %
                    </span>
                  </div>
                  <FormDescription>
                    Subscribers pay this much less than the regular price
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
