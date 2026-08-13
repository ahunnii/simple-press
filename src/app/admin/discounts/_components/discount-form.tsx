"use client";

import type { DiscountCode } from "generated/prisma";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  MoreHorizontal,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { DiscountFormSchema } from "~/lib/validators/discounts";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn, roundToCents } from "~/lib/utils";
import {
  DISCOUNT_DATE_RANGE_ERROR,
  discountFormSchema,
  validateDiscountDateRange,
  validateDiscountValue,
} from "~/lib/validators/discounts";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { MoneyInput } from "~/components/ui/money-input";
import { NumberInput } from "~/components/ui/number-input";
import { Switch } from "~/components/ui/switch";
import { DateTimeFormField } from "~/components/inputs/date-time-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";

type Props = {
  initialDiscount?: DiscountCode;
};

type DiscountType = DiscountFormSchema["type"];

/**
 * `DiscountCode.minPurchase`, `maxDiscount` and — for `type === "fixed"` only —
 * `value` are stored in CENTS; this form collects DOLLARS. A stored `0` is a
 * real, meaningful value, so the guard has to be an explicit null check: the
 * truthiness test this replaced (`stored ? stored / 100 : undefined`) read a
 * saved `0` back as a blank field.
 */
function centsToDollars(cents: number | null | undefined): number | undefined {
  return cents == null ? undefined : cents / 100;
}

/**
 * Dollars → whole cents for the wire. `roundToCents` runs first because a
 * plain `Math.round(dollars * 100)` is wrong for values like 12.555 — binary
 * float error puts `12.555 * 100` at 1255.4999999999998, which rounds down to
 * $12.55 instead of $12.56.
 */
function dollarsToCents(dollars: number | null | undefined): number | null {
  return dollars == null ? null : Math.round(roundToCents(dollars) * 100);
}

export function DiscountForm({ initialDiscount }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const defaultValues: DiscountFormSchema = {
    code: initialDiscount?.code ?? "",
    type: (initialDiscount?.type as DiscountType) ?? "percentage",
    value:
      initialDiscount?.type === "fixed"
        ? (centsToDollars(initialDiscount.value) ?? 0)
        : (initialDiscount?.value ?? 0),
    active: initialDiscount?.active ?? true,
    usageLimit: initialDiscount?.usageLimit ?? undefined,
    perCustomerLimit: initialDiscount?.perCustomerLimit ?? undefined,
    startsAt: initialDiscount?.startsAt ?? undefined,
    expiresAt: initialDiscount?.expiresAt ?? undefined,
    minPurchase: centsToDollars(initialDiscount?.minPurchase),
    maxDiscount: centsToDollars(initialDiscount?.maxDiscount),
  };

  // Per-type drafts for the unit-overloaded `value` field. `DiscountCode.value`
  // means whole percent points for "percentage" but CENTS for "fixed", so
  // carrying one number across a type switch silently reinterprets it — typing
  // `50` under Percentage and switching to Fixed used to save $50.00 off with
  // no warning. Each type keeps its own draft instead: switching away parks the
  // current number, switching back restores it, and a type the owner hasn't
  // filled in yet starts blank.
  const valueDrafts = useRef<Partial<Record<DiscountType, number | null>>>({});
  const prevType = useRef<DiscountType>(defaultValues.type);

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
                ? (centsToDollars(data.value) ?? 0)
                : (data.value ?? 0),
            minPurchase: centsToDollars(data.minPurchase),
            maxDiscount: centsToDollars(data.maxDiscount),
          }
        : defaultValues,
    );

    // Drafts describe unsaved keystrokes; once the form is reset to a
    // persisted (or pristine) state they're stale and must not resurrect.
    valueDrafts.current = {};
    prevType.current = data?.type ?? defaultValues.type;
  };

  /**
   * `RadioFormField` calls `field.onChange(next)` FIRST and this callback
   * second, so by the time we run the form already holds the NEW type while
   * `form.getValues("value")` still holds the number typed under the OLD one.
   * Park that number under the outgoing type, then swap in the incoming type's
   * draft (or blank).
   */
  const handleTypeChange = (nextValue: string) => {
    const nextType = nextValue as DiscountType;
    const previousType = prevType.current;
    if (previousType === nextType) return;

    valueDrafts.current[previousType] = form.getValues("value") ?? null;

    // `null` (a blank field) is deliberate here even though the schema types
    // `value` as a plain `number` — that's the same shape `NumberInput` /
    // `MoneyInput` write when the owner clears the input, so the non-null
    // assertion only quiets the types, it does not change what's stored.
    const restored = valueDrafts.current[nextType] ?? null;
    form.setValue("value", restored!, { shouldDirty: true });
    // A "can't exceed 100%" error from the old type must not linger over the
    // new type's (possibly empty) field.
    form.clearErrors("value");

    // `maxDiscount` is unmounted for free shipping but is still submitted, so
    // a cap left over from a percentage/fixed code would silently persist on
    // the saved free-shipping code.
    if (nextType === "free_shipping") {
      form.setValue("maxDiscount", null, { shouldDirty: true });
    }

    prevType.current = nextType;
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
    const type = data.type;

    // A blank amount must not save as a dead 0% / $0.00 code. `value` is
    // `z.coerce.number()`, and `Number(null)` is 0, so an empty field parses to
    // a valid-looking 0 rather than failing validation. The input's `required`
    // attribute only guards the native submit path — `useKeyboardEnter` calls
    // `form.handleSubmit` directly, bypassing it. Switching discount type now
    // deliberately blanks this field (see `handleTypeChange`), so an empty
    // amount is reachable on every switch and has to be caught here.
    if (type !== "free_shipping" && form.getValues("value") == null) {
      form.setError("value", {
        type: "manual",
        message: "Amount is required",
      });
      return;
    }

    // Convert to the wire units `DiscountCode.value` is overloaded into before
    // validating: whole percent points for "percentage", CENTS for "fixed",
    // and 0 for "free_shipping" (the discount equals the shipping cost, which
    // is computed at checkout time). `validateDiscountValue` checks the wire
    // value, so it has to run after the dollars→cents conversion, not before.
    const discountValue =
      type === "fixed"
        ? (dollarsToCents(data.value) ?? 0)
        : type === "free_shipping"
          ? 0
          : data.value;

    // Same authoritative check the router runs (discount.create/update) —
    // catch it here so the owner gets an inline field error instead of a
    // round-trip BAD_REQUEST.
    const valueCheck = validateDiscountValue(type, discountValue);
    if (!valueCheck.ok) {
      form.setError("value", { type: "manual", message: valueCheck.message });
      return;
    }

    // Same cross-field rule the server enforces (discount.create/update) —
    // catch it here so the owner gets an inline field error instead of a
    // round-trip BAD_REQUEST.
    if (
      !validateDiscountDateRange({
        startsAt: data.startsAt,
        expiresAt: data.expiresAt,
      })
    ) {
      form.setError("expiresAt", {
        type: "manual",
        message: DISCOUNT_DATE_RANGE_ERROR,
      });
      return;
    }

    const minPurchaseCents = dollarsToCents(data.minPurchase);
    // A free-shipping code has no cap to apply — the discount equals the
    // shipping cost. `handleTypeChange` clears the field when the owner
    // switches TO free_shipping, but that does not cover opening an existing
    // free-shipping code that already carries a stale cap in the DB: the field
    // is unmounted, yet its loaded value still rides along in form state. Zero
    // it here so neither path can persist one.
    const maxDiscountCents =
      type === "free_shipping" ? null : dollarsToCents(data.maxDiscount);

    if (initialDiscount) {
      updateDiscountMutation.mutate({
        id: initialDiscount.id,
        ...data,
        code: data.code.toUpperCase().trim(),
        type,
        value: discountValue,
        minPurchase: minPurchaseCents,
        maxDiscount: maxDiscountCents,
      });
    } else {
      createDiscountMutation.mutate({
        ...data,
        code: data.code.toUpperCase().trim(),
        type,
        value: discountValue,
        minPurchase: minPurchaseCents,
        maxDiscount: maxDiscountCents,
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="ml-2 sr-only sm:not-sr-only">
                      More Options
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    disabled={isSubmitting || !isDirty}
                    onClick={() => {
                      form.reset();
                      valueDrafts.current = {};
                      prevType.current = form.getValues("type");
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </DropdownMenuItem>

                  {initialDiscount && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

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
                      onChange={handleTypeChange}
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
                            {type === "fixed" ? (
                              <FormControl>
                                <MoneyInput
                                  placeholder="10.00"
                                  required
                                  {...field}
                                />
                              </FormControl>
                            ) : (
                              // Percent, not money: whole numbers only (the DB
                              // column is an Int), so no `$` and no cent step.
                              // A non-integer that slips past `step="1"` is
                              // caught by `validateDiscountValue` on submit.
                              <div className="relative">
                                <FormControl>
                                  <NumberInput
                                    step="1"
                                    min="0"
                                    max="100"
                                    placeholder="20"
                                    className="pr-7"
                                    required
                                    {...field}
                                  />
                                </FormControl>
                                <span className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2">
                                  %
                                </span>
                              </div>
                            )}
                            <FormDescription>
                              {type === "percentage"
                                ? "Whole percent off the cart subtotal — enter 20 for 20% off."
                                : "Flat amount in USD taken off the cart subtotal."}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-1 space-y-4">
                {/* Usage & Expiry + min/max */}
                <Card>
                  <CardHeader>
                    <CardTitle>Restrictions</CardTitle>
                    <CardDescription>
                      Set limits on how the discount can be used
                    </CardDescription>
                  </CardHeader>
                  {/* Row 1: Usage Limit (full width). Row 2: per-customer
                      limit (full width). Row 3: Start/Expiration dates
                      (paired). Row 4: min/max purchase (paired). The raw
                      `FormField` blocks below render a bare `FormItem`, so
                      they occupy one track each by default; `DateTimeFormField`
                      hard-codes `col-span-full` on its `FormItem`, so it needs
                      the explicit `sm:col-span-1` override to sit in a single
                      track instead of spanning the row. `items-start` keeps
                      each cell sized to its own content — without it, grid
                      cells stretch to the tallest cell in the row, and because
                      `FormItem` is itself `grid gap-2` with auto rows that
                      absorb the extra height, a field with no description gets
                      its label and input pushed apart and misaligned against
                      its neighbour. */}
                  <CardContent className="grid items-start gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="usageLimit"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="perCustomerLimit"
                      render={({ field }) => (
                        <FormItem className="sm:col-span-2">
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
                          <FormMessage />
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
                      className="sm:col-span-1"
                    />

                    <DateTimeFormField
                      form={form}
                      name="expiresAt"
                      label=""
                      dateLabel="Expiration Date"
                      timeLabel="Expiration Time"
                      includeTime={false}
                      description="Leave blank for no expiration"
                      className="sm:col-span-1"
                    />

                    <FormField
                      control={form.control}
                      name="minPurchase"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Minimum purchase (USD)</FormLabel>
                          <FormControl>
                            <MoneyInput placeholder="No minimum" {...field} />
                          </FormControl>
                          <FormDescription>
                            Cart subtotal must meet this amount before the code
                            applies
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {type !== "free_shipping" && (
                      <FormField
                        control={form.control}
                        name="maxDiscount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Maximum discount (USD)</FormLabel>
                            <FormControl>
                              <MoneyInput placeholder="No cap" {...field} />
                            </FormControl>
                            <FormDescription>
                              Caps the discount amount (especially useful for
                              percentage codes)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
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
