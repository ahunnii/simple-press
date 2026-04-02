"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";

const shippingFormSchema = z
  .object({
    shippingType: z.enum(["free", "flat_rate", "flat_rate_with_threshold"]),
    shippingFlatRateDollars: z.string().optional(),
    freeShippingThresholdDollars: z.string().optional(),
    offersInStorePickup: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.shippingType === "flat_rate" || data.shippingType === "flat_rate_with_threshold") {
      const raw = data.shippingFlatRateDollars?.trim() ?? "";
      if (!raw || Number.isNaN(Number.parseFloat(raw)) || Number.parseFloat(raw) < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid flat rate amount",
          path: ["shippingFlatRateDollars"],
        });
      }
    }
    if (data.shippingType === "flat_rate_with_threshold") {
      const raw = data.freeShippingThresholdDollars?.trim() ?? "";
      if (!raw || Number.isNaN(Number.parseFloat(raw)) || Number.parseFloat(raw) <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid free shipping threshold",
          path: ["freeShippingThresholdDollars"],
        });
      }
    }
  });

type ShippingFormValues = z.infer<typeof shippingFormSchema>;

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWith"]>;
};

function dollarsToCents(d: string): number {
  const n = Number.parseFloat(d);
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function centsToDollarsString(c: number | null): string {
  if (c == null) return "";
  return (c / 100).toFixed(2);
}

export function ShippingSettings({ business }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      shippingType: (business.shippingType as ShippingFormValues["shippingType"]) ?? "free",
      shippingFlatRateDollars: centsToDollarsString(business.shippingFlatRate),
      freeShippingThresholdDollars: centsToDollarsString(
        business.freeShippingThreshold,
      ),
      offersInStorePickup: business.offersInStorePickup ?? false,
    },
  });

  const shippingType = form.watch("shippingType");

  const updateMutation = api.business.updateShipping.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      form.reset({
        shippingType: data.business.shippingType as ShippingFormValues["shippingType"],
        shippingFlatRateDollars: centsToDollarsString(data.business.shippingFlatRate),
        freeShippingThresholdDollars: centsToDollarsString(
          data.business.freeShippingThreshold,
        ),
        offersInStorePickup: data.business.offersInStorePickup,
      });
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update shipping settings");
    },
    onMutate: () => toast.loading("Saving shipping settings..."),
  });

  const handleSubmit = async (data: ShippingFormValues) => {
    const flatCents =
      data.shippingType === "free"
        ? null
        : dollarsToCents(data.shippingFlatRateDollars ?? "0");
    const thresholdCents =
      data.shippingType === "flat_rate_with_threshold"
        ? dollarsToCents(data.freeShippingThresholdDollars ?? "0")
        : null;

    updateMutation.mutate({
      shippingType: data.shippingType,
      shippingFlatRate: flatCents,
      freeShippingThreshold: thresholdCents,
      offersInStorePickup: data.offersInStorePickup,
    });
  };

  const isSubmitting = updateMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="min-h-screen bg-gray-50"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/settings">
                <ArrowLeft className="mr-2 size-4" />
                Settings
              </Link>
            </Button>
            <span className="text-muted-foreground text-sm">Shipping</span>
          </div>
          <Button type="submit" disabled={isSubmitting || !isDirty}>
            <Save className="mr-2 size-4" />
            Save
          </Button>
        </div>

        <div className="mx-auto max-w-2xl space-y-6 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping</CardTitle>
              <CardDescription>
                How you charge for delivery and whether customers can pick up in
                store.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="shippingType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shipping charges</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className="flex flex-col gap-3"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="free" id="ship-free" />
                          <Label htmlFor="ship-free" className="font-normal">
                            Free shipping (all orders)
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="flat_rate" id="ship-flat" />
                          <Label htmlFor="ship-flat" className="font-normal">
                            Flat rate shipping
                          </Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem
                            value="flat_rate_with_threshold"
                            id="ship-threshold"
                          />
                          <Label htmlFor="ship-threshold" className="font-normal">
                            Flat rate — free when order subtotal reaches a
                            threshold
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                  </FormItem>
                )}
              />

              {(shippingType === "flat_rate" ||
                shippingType === "flat_rate_with_threshold") && (
                <FormField
                  control={form.control}
                  name="shippingFlatRateDollars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flat shipping rate (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="5.99"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              {shippingType === "flat_rate_with_threshold" && (
                <FormField
                  control={form.control}
                  name="freeShippingThresholdDollars"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Free shipping when subtotal reaches (USD)</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          inputMode="decimal"
                          placeholder="35.00"
                          {...field}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="offersInStorePickup"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">In-store pickup</FormLabel>
                      <p className="text-muted-foreground text-sm">
                        Let customers choose pickup at checkout (no shipping
                        charge).
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
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
