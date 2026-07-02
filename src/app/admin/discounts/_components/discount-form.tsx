"use client";

import type { DiscountCode } from "generated/prisma";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { DiscountFormSchema } from "~/lib/validators/discounts";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn } from "~/lib/utils";
import { discountFormSchema } from "~/lib/validators/discounts";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import { Switch } from "~/components/ui/switch";
import { DateTimeFormField } from "~/components/inputs/date-time-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";

type Props = {
  initialDiscount?: DiscountCode;
};

export function DiscountForm({ initialDiscount }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const defaultValues: DiscountFormSchema = {
    code: initialDiscount?.code ?? "",
    type: (initialDiscount?.type as DiscountFormSchema["type"]) ?? "percentage",
    value:
      initialDiscount?.type === "fixed"
        ? (initialDiscount.value ?? 0) / 100
        : (initialDiscount?.value ?? 0),
    active: initialDiscount?.active ?? true,
    usageLimit: initialDiscount?.usageLimit ?? undefined,
    perCustomerLimit: initialDiscount?.perCustomerLimit ?? undefined,
    startsAt: initialDiscount?.startsAt ?? undefined,
    expiresAt: initialDiscount?.expiresAt ?? undefined,
    minPurchase: initialDiscount?.minPurchase
      ? initialDiscount?.minPurchase / 100
      : undefined,
    maxDiscount: initialDiscount?.maxDiscount
      ? initialDiscount?.maxDiscount / 100
      : undefined,
  };

  const form = useForm<DiscountFormSchema>({
    resolver: zodResolver(discountFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  const handleReset = (data?: DiscountFormSchema) => {
    form.reset(
      !!data
        ? {
            ...data,
            value:
              data.type === "fixed"
                ? (data.value ?? 0) / 100
                : (data?.value ?? 0),
            minPurchase: data?.minPurchase
              ? data?.minPurchase / 100
              : undefined,
            maxDiscount: data?.maxDiscount
              ? data?.maxDiscount / 100
              : undefined,
          }
        : defaultValues,
    );
  };

  const createDiscountMutation = api.discount.create.useMutation({
    onSuccess: ({ data, message }) => {
      toast.dismiss();
      toast.success(message);
      router.push(`/admin/discounts/${data.id}`);
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "already exists": "code" },
        fallbackMessage: "Failed to create discount",
      });
    },
    onMutate: () => {
      toast.loading("Creating discount...");
    },
  });

  const updateDiscountMutation = api.discount.update.useMutation({
    onSuccess: ({ data, message }) => {
      toast.dismiss();
      toast.success(message);
      handleReset({ ...data, type: data.type as DiscountFormSchema["type"] });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "already exists": "code" },
        fallbackMessage: "Failed to update discount",
      });
    },
    onMutate: () => {
      toast.loading("Updating discount...");
    },
  });

  const deleteDiscountMutation = api.discount.delete.useMutation({
    onSuccess: ({ message }) => {
      toast.dismiss();
      toast.success(message);
      router.push("/admin/discounts");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete discount");
    },
    onMutate: () => {
      toast.loading("Deleting discount...");
    },
  });

  const onSubmit = async (data: DiscountFormSchema) => {
    let discountValue = data.value;
    const type = data.type;
    const minPurchase = data.minPurchase;
    const maxDiscount = data.maxDiscount;

    if (type === "percentage" && discountValue > 100) {
      throw new Error("Percentage discount cannot exceed 100%");
    }

    if (type === "fixed") {
      discountValue = Math.round(discountValue * 100);
    }

    // Free shipping codes have no numeric value — the discount equals the
    // shipping cost, computed at checkout time.
    if (type === "free_shipping") {
      discountValue = 0;
    }

    const minPurchaseCents = minPurchase
      ? Math.round(minPurchase * 100)
      : undefined;
    const maxDiscountCents = maxDiscount
      ? Math.round(maxDiscount * 100)
      : undefined;

    if (initialDiscount) {
      updateDiscountMutation.mutate({
        id: initialDiscount.id,
        ...data,
        code: data.code.toUpperCase().trim(),
        type,
        value: discountValue,
        minPurchase: minPurchaseCents ?? null,
        maxDiscount: maxDiscountCents ?? null,
      });
    } else {
      createDiscountMutation.mutate({
        ...data,
        code: data.code.toUpperCase().trim(),
        type,
        value: discountValue,
        minPurchase: minPurchaseCents ?? null,
        maxDiscount: maxDiscountCents ?? null,
      });
    }
  };

  const isSubmitting =
    updateDiscountMutation.isPending || createDiscountMutation.isPending;

  const isDeleting = deleteDiscountMutation.isPending;
  const isDirty = form.formState.isDirty;
  const type = form.watch("type");

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="bg-muted/40 min-h-screen"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/discounts">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="truncate text-base font-medium">
                  {initialDiscount
                    ? form.watch("code") || "Edit Discount"
                    : "New Discount"}
                </h1>

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
              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor="active" className="text-sm">
                      Active
                    </Label>
                    <Switch
                      id="active"
                      aria-label="Active"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />
              {initialDiscount && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Delete</span>
                </Button>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || !isDirty}
                onClick={() => form.reset()}
                className="hidden md:inline-flex"
              >
                Reset
              </Button>

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

          <div className="admin-container space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="col-span-1 space-y-4">
                {/* Code */}
                <Card>
                  <CardHeader>
                    <CardTitle>Discount Code</CardTitle>
                    <CardDescription>
                      The code customers will enter at checkout
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <InputFormField
                      form={form}
                      name="code"
                      label="Discount Code"
                      placeholder="SUMMER20"
                      required
                      autoFocus
                      onChange={(value) =>
                        form.setValue("code", value.toUpperCase(), {
                          shouldValidate: true,
                        })
                      }
                      description="Use uppercase letters and numbers (e.g., SAVE20, WINTER2024)"
                    />
                  </CardContent>
                </Card>

                {/* Discount Value */}
                <Card>
                  <CardHeader>
                    <CardTitle>Discount Amount</CardTitle>
                    <CardDescription>
                      Choose between percentage or fixed amount
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <RadioFormField
                      form={form}
                      name="type"
                      label="Type"
                      options={[
                        { label: "Percentage (%)", value: "percentage" },
                        { label: "Fixed Amount ($)", value: "fixed" },
                        { label: "Free shipping", value: "free_shipping" },
                      ]}
                    />

                    {type === "free_shipping" && (
                      <p className="text-muted-foreground text-sm">
                        The shipping cost is waived at checkout — no amount to
                        set.
                      </p>
                    )}

                    {type !== "free_shipping" && (
                      <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {type === "percentage"
                                ? "Percentage"
                                : "Amount (USD)"}{" "}
                              <span className="text-destructive">*</span>
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                {type === "fixed" && (
                                  <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                    $
                                  </span>
                                )}

                                <NumberInput
                                  step={type === "percentage" ? "1" : "0.01"}
                                  min="0"
                                  max={
                                    type === "percentage" ? "100" : undefined
                                  }
                                  placeholder={
                                    type === "percentage" ? "20" : "10.00"
                                  }
                                  className={type === "fixed" ? "pl-7" : ""}
                                  required
                                  {...field}
                                />
                                {type === "percentage" && (
                                  <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                                    %
                                  </span>
                                )}
                              </div>
                            </FormControl>
                            <FormDescription>Base price in USD</FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>

                {/* Usage & Expiry + min/max */}
                <Card>
                  <CardHeader>
                    <CardTitle>Restrictions</CardTitle>
                    <CardDescription>
                      Set limits on how the discount can be used
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usage Limit</FormLabel>
                          <FormControl>
                            <NumberInput
                              step="1"
                              min="1"
                              placeholder="Unlimited"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave blank for unlimited uses
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="perCustomerLimit"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limit uses per customer</FormLabel>
                          <FormControl>
                            <NumberInput
                              step="1"
                              min="1"
                              placeholder="Unlimited"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Leave blank for unlimited uses per customer
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    <DateTimeFormField
                      form={form}
                      name="startsAt"
                      label=""
                      dateLabel="Start Date"
                      timeLabel="Start Time"
                      includeTime={false}
                      description="Leave blank to start immediately"
                    />

                    <DateTimeFormField
                      form={form}
                      name="expiresAt"
                      label=""
                      dateLabel="Expiration Date"
                      timeLabel="Expiration Time"
                      includeTime={false}
                      description="Leave blank for no expiration"
                    />

                    <FormField
                      control={form.control}
                      name="minPurchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel> Minimum purchase (USD)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                $
                              </span>
                              <NumberInput
                                step="0.01"
                                min="0"
                                placeholder="No minimum"
                                className="pl-7"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Cart subtotal must meet this amount before the code
                            applies
                          </FormDescription>
                        </FormItem>
                      )}
                    />

                    {type !== "free_shipping" && (
                      <FormField
                        control={form.control}
                        name="maxDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel> Maximum discount (USD)</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                                  $
                                </span>
                                <NumberInput
                                  step="0.01"
                                  min="0"
                                  placeholder="No cap"
                                  className="pl-7"
                                  {...field}
                                />
                              </div>
                            </FormControl>
                            <FormDescription>
                              Caps the discount amount (especially useful for
                              percentage codes)
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-1 space-y-4">
                {/* Active Status */}
                <Card>
                  <CardHeader>
                    <CardTitle>Status</CardTitle>
                    <CardDescription>
                      Control whether this discount is currently active
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SwitchFormField
                      form={form}
                      name="active"
                      label="Active"
                      description="Customers can use this discount code"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete discount</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.watch("code")}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteDiscountMutation.mutate(initialDiscount?.id ?? "");
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
