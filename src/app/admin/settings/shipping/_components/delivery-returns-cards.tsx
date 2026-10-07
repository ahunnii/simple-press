"use client";

import type { UseFormReturn } from "react-hook-form";
import Link from "next/link";

import type { DeliveryReturnsFormValues } from "~/lib/validators/shipping";
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
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

type Props = {
  /** Must be rendered inside a shadcn `<Form {...form}>` provider. */
  form: UseFormReturn<DeliveryReturnsFormValues>;
};

const RETURNS_MODE_OPTIONS = [
  {
    value: "unset",
    id: "returns-unset",
    label: "Not set",
    hint: "Your return policy isn't shown in Google results.",
  },
  {
    value: "none",
    id: "returns-none",
    label: "No returns",
    hint: "All sales are final.",
  },
  {
    value: "accept",
    id: "returns-accept",
    label: "Accept returns",
    hint: "Set the return window and who pays for shipping.",
  },
] as const;

/**
 * "Delivery times" + "Returns" cards for the shipping settings page. They are
 * saved by the page's toolbar Save through `business.updateDeliveryAndReturns`
 * and feed the shipping/return details in Google product results.
 */
export function DeliveryReturnsCards({ form }: Props) {
  const returnsMode = form.watch("returnsMode");
  const returnFees = form.watch("returnFees");

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Delivery times</CardTitle>
          <CardDescription>
            How long customers wait for an order, in business days. These show
            in Google results next to your products. Leave a row blank to skip
            it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <fieldset className="space-y-2">
            <legend className="text-sm leading-none font-medium">
              Handling time
            </legend>
            <p className="text-muted-foreground text-sm">
              How long you take to pack an order.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
              <InputFormField
                form={form}
                name="handlingDaysMin"
                label="Min (days)"
                type="number"
                placeholder="1"
              />
              <InputFormField
                form={form}
                name="handlingDaysMax"
                label="Max (days)"
                type="number"
                placeholder="2"
              />
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm leading-none font-medium">
              Transit time
            </legend>
            <p className="text-muted-foreground text-sm">
              How long the carrier takes once it ships.
            </p>
            <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
              <InputFormField
                form={form}
                name="transitDaysMin"
                label="Min (days)"
                type="number"
                placeholder="2"
              />
              <InputFormField
                form={form}
                name="transitDaysMax"
                label="Max (days)"
                type="number"
                placeholder="5"
              />
            </div>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Returns</CardTitle>
          <CardDescription>
            Your return terms, shown in Google results next to your products.
            Keep this in line with your{" "}
            <Link
              href="/admin/content/policies"
              className="underline underline-offset-2"
            >
              Returns &amp; Refunds policy
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <FormField
            control={form.control}
            name="returnsMode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Return policy</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex flex-col gap-3"
                  >
                    {RETURNS_MODE_OPTIONS.map((opt) => (
                      <div key={opt.value} className="flex items-start gap-2">
                        <RadioGroupItem
                          value={opt.value}
                          id={opt.id}
                          className="mt-0.5"
                        />
                        <div>
                          <Label htmlFor={opt.id} className="font-normal">
                            {opt.label}
                          </Label>
                          <p className="text-muted-foreground mt-0.5 text-sm">
                            {opt.hint}
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {returnsMode === "accept" && (
            <div className="space-y-4 rounded-lg border p-4">
              <InputFormField
                form={form}
                name="returnWindowDays"
                label="Return window (days)"
                description="How many days after delivery customers can send an item back."
                type="number"
                placeholder="30"
                className="sm:max-w-xs"
              />

              <SelectFormField
                form={form}
                name="returnFees"
                label="Who pays return shipping"
                placeholder="Choose one"
                className="sm:max-w-xs"
                values={[
                  { value: "free", label: "Free returns" },
                  { value: "customer_pays", label: "Customer pays" },
                  { value: "flat_fee", label: "Flat return fee" },
                ]}
              />

              {returnFees === "flat_fee" && (
                <FormField
                  control={form.control}
                  name="returnShippingFeeDollars"
                  render={({ field }) => (
                    <FormItem className="sm:max-w-xs">
                      <FormLabel>Return fee (USD)</FormLabel>
                      <div className="relative">
                        <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                          $
                        </span>
                        <FormControl>
                          <Input
                            type="text"
                            inputMode="decimal"
                            placeholder="6.99"
                            className="pl-7"
                            {...field}
                          />
                        </FormControl>
                      </div>
                      <FormDescription>
                        Charged to the customer for each return.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <SelectFormField
                form={form}
                name="returnMethod"
                label="How customers return items"
                placeholder="Choose one"
                className="sm:max-w-xs"
                values={[
                  { value: "by_mail", label: "By mail" },
                  { value: "in_store", label: "In store" },
                  { value: "either", label: "Either" },
                ]}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
