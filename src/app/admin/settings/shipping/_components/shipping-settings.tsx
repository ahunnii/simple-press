"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ShippingFormValues } from "~/lib/validators/shipping";
import type { RouterOutputs } from "~/trpc/react";
import { centsToDollarsString, dollarsToCents } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { shippingFormSchema } from "~/lib/validators/shipping";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import { Switch } from "~/components/ui/switch";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWith"]>;
};

export function ShippingSettings({ business }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<ShippingFormValues>({
    resolver: zodResolver(shippingFormSchema),
    defaultValues: {
      shippingType:
        (business.shippingType as ShippingFormValues["shippingType"]) ?? "free",
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
        shippingType: data.business
          .shippingType as ShippingFormValues["shippingType"],
        shippingFlatRateDollars: centsToDollarsString(
          data.business.shippingFlatRate,
        ),
        freeShippingThresholdDollars: centsToDollarsString(
          data.business.freeShippingThreshold,
        ),
        offersInStorePickup: data.business.offersInStorePickup,
      });
      void utils.business.invalidate();
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
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Shipping Settings</h1>

              <span
                className={`admin-status-badge ${
                  isDirty ? "isDirty" : "isPublished"
                }`}
              >
                {isDirty ? "Unsaved Changes" : "Saved"}
              </span>
            </div>
          </div>
          <div className="toolbar-actions">
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="saving-indicator" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Save changes</span>
                  <span className="sm:hidden">Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
        <div className="admin-container">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Shipping</CardTitle>
                <CardDescription>
                  How you charge for delivery and whether customers can pick up
                  in store.
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
                            <Label
                              htmlFor="ship-threshold"
                              className="font-normal"
                            >
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
                          <div className="relative">
                            <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                              $
                            </span>
                            <Input
                              type="text"
                              inputMode="decimal"
                              placeholder="5.99"
                              className="pl-7"
                              {...field}
                            />
                          </div>
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
                        <FormLabel>
                          Free shipping when subtotal reaches (USD)
                        </FormLabel>
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
                        <FormLabel className="text-base">
                          In-store pickup
                        </FormLabel>
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
        </div>
      </form>
    </Form>
  );
}
