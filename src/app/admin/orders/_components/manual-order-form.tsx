"use client";

import { useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Mail,
  MapPin,
  Package,
  Plus,
  Save,
  Store,
  Truck,
  X,
} from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import type { SupportedCountry } from "~/lib/geo/regions";
import type { ManualOrderFormValues } from "~/lib/validators/order";
import type { PickableProduct } from "./product-picker";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { dollarsToCents, formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { resolveVariantPrice } from "~/lib/variant-price";
import {
  computeManualOrderTotals,
  manualOrderFormSchema,
} from "~/lib/validators/order";
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
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { NumberInput } from "~/components/ui/number-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import { CustomerPicker } from "./customer-picker";
import { ProductPicker } from "./product-picker";

type Props = {
  products: PickableProduct[];
  allowedCountries: SupportedCountry[];
};

/**
 * `Order.status` is derived rather than chosen: it is a roll-up of the payment
 * and fulfillment states, and offering it as a third independent dropdown just
 * invites combinations that contradict the other two.
 *
 * "cancelled" is deliberately unreachable here — you cancel an existing order
 * from its detail page (which also handles restocking and the notification
 * email); creating one pre-cancelled isn't a real workflow.
 */
function deriveStatus(
  paymentStatus: ManualOrderFormValues["paymentStatus"],
  fulfillmentStatus: ManualOrderFormValues["fulfillmentStatus"],
) {
  if (paymentStatus === "refunded") return "refunded" as const;
  if (fulfillmentStatus === "fulfilled" && paymentStatus === "paid")
    return "completed" as const;
  // Everything else — including a failed payment — is an order still needing
  // attention, which is what "open" means.
  return "open" as const;
}

export function ManualOrderForm({ products, allowedCountries }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const utils = api.useUtils();

  const form = useForm<ManualOrderFormValues>({
    resolver: zodResolver(manualOrderFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      customerName: "",
      customerEmail: "",
      shippingName: "",
      shippingAddress: {
        line1: "",
        line2: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
        phone: "",
      },
      deliveryMethod: "ship",
      includeAddress: false,
      items: [],
      useDirectSubtotal: false,
      // `null`, not `0` — an empty NumberInput yields null, and starting at 0
      // meant the placeholder never showed.
      directSubtotal: null,
      shipping: null,
      tax: null,
      discount: null,
      orderDate: "",
      notes: "",
      paymentStatus: "pending",
      paymentMethod: undefined,
      fulfillmentStatus: "unfulfilled",
      sendConfirmationEmail: false,
    },
  });

  // Line items live in the form, not in `useState` beside it. That is what
  // makes per-row validation messages possible, keeps `isDirty` honest (adding
  // an item used to leave the form reporting itself as pristine, disarming the
  // unsaved-changes guard) and lets a single `reset()` clear everything.
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const items = form.watch("items");
  const shipping = form.watch("shipping");
  const tax = form.watch("tax");
  const discount = form.watch("discount");
  const directSubtotal = form.watch("directSubtotal");
  const useDirectSubtotal = form.watch("useDirectSubtotal");
  const includeAddress = form.watch("includeAddress");
  const deliveryMethod = form.watch("deliveryMethod");
  const selectedCountry = (form.watch("shippingAddress.country") ??
    "US") as SupportedCountry;
  const regionOptions = getRegionOptions(selectedCountry);

  const isPickup = deliveryMethod === "pickup";

  /**
   * The preview the admin sees, computed by the same function the server uses
   * to decide what actually gets stored — so the number on screen can't drift
   * from the number in the database.
   */
  const totals = useMemo(
    () =>
      computeManualOrderTotals({
        items: useDirectSubtotal
          ? []
          : items.map((i) => ({ price: i.price, quantity: i.quantity })),
        directSubtotal: useDirectSubtotal
          ? dollarsToCents(String(directSubtotal ?? 0))
          : undefined,
        shipping: dollarsToCents(String(shipping ?? 0)),
        tax: dollarsToCents(String(tax ?? 0)),
        discount: dollarsToCents(String(discount ?? 0)),
      }),
    [items, useDirectSubtotal, directSubtotal, shipping, tax, discount],
  );

  const createManualOrderMutation = api.order.createManual.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Order created successfully");
      void utils.order.invalidate();
      router.push(`/admin/orders/${data.id}`);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to create order");
    },
    onMutate: () => {
      toast.loading("Creating order...");
    },
  });

  const onSubmit = async (data: ManualOrderFormValues) => {
    // "A product with variants must have one chosen" can't live in the zod
    // schema — the schema has no view of the catalog, only of the submitted
    // row. Checked here instead, against the products already in memory.
    if (!data.useDirectSubtotal) {
      let missingVariant = false;
      data.items.forEach((item, index) => {
        const product = products.find((p) => p.id === item.productId);
        if (product && product.variants.length > 0 && !item.productVariantId) {
          form.setError(`items.${index}.productVariantId`, {
            type: "manual",
            message: "Pick a variant",
          });
          missingVariant = true;
        }
      });
      if (missingVariant) {
        toast.error("Pick a variant for every product that has them.");
        return;
      }
    }

    const captureAddress = data.includeAddress && data.deliveryMethod === "ship";
    const trimmedShippingName = data.shippingName?.trim() ?? "";
    const recipientName =
      trimmedShippingName === "" ? data.customerName : trimmedShippingName;

    createManualOrderMutation.mutate({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      // Explicitly emptiness-checked rather than `?? customerName`: the field
      // defaults to `""`, which is not nullish, so `??` never fired and a blank
      // "Recipient Name" — whose placeholder promises "Same as customer" —
      // created a ShippingAddress with an empty firstName.
      shippingName: captureAddress ? recipientName : undefined,
      shippingAddress: captureAddress
        ? {
            line1: data.shippingAddress?.line1 ?? "",
            line2: data.shippingAddress?.line2 ?? null,
            city: data.shippingAddress?.city ?? "",
            state: data.shippingAddress?.state ?? null,
            postal_code: data.shippingAddress?.postal_code ?? "",
            country: data.shippingAddress?.country ?? "US",
            phone: data.shippingAddress?.phone ?? null,
          }
        : undefined,
      deliveryMethod: data.deliveryMethod,
      items: data.useDirectSubtotal ? [] : data.items,
      directSubtotal: data.useDirectSubtotal
        ? dollarsToCents(String(data.directSubtotal ?? 0))
        : undefined,
      // The charge fields are dollars in the form and cents on the wire — this
      // is the single conversion point.
      shipping: dollarsToCents(String(data.shipping ?? 0)),
      tax: dollarsToCents(String(data.tax ?? 0)),
      discount: dollarsToCents(String(data.discount ?? 0)),
      // `T00:00:00` (no zone) parses as LOCAL midnight. Bare `new Date("2026-08-11")`
      // is parsed as UTC, which lands on the previous evening anywhere west of
      // Greenwich — the admin would pick a date and see the order dated a day
      // earlier in the list.
      orderDate: data.orderDate
        ? new Date(`${data.orderDate}T00:00:00`)
        : undefined,
      notes: data.notes,
      status: deriveStatus(data.paymentStatus, data.fulfillmentStatus),
      paymentStatus: data.paymentStatus,
      paymentMethod: data.paymentMethod,
      fulfillmentStatus: data.fulfillmentStatus,
      sendConfirmationEmail: data.sendConfirmationEmail,
    });
  };

  const isSubmitting = createManualOrderMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const itemsError = form.formState.errors.items?.message;

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="bg-muted/40 min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">New Manual Order</h1>

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
            {/* Left column — customer-facing info */}
            <div className="col-span-1 space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Customer Information</CardTitle>
                      <CardDescription>
                        The person placing this order
                      </CardDescription>
                    </div>
                    <CustomerPicker
                      disabled={isSubmitting}
                      onSelect={({ name, email }) => {
                        form.setValue("customerName", name, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                        form.setValue("customerEmail", email, {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <InputFormField
                      form={form}
                      name="customerName"
                      label="Name"
                      className="col-span-1"
                      required
                    />

                    <InputFormField
                      form={form}
                      name="customerEmail"
                      label="Email"
                      type="email"
                      className="col-span-1"
                      required
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="sendConfirmationEmail"
                    render={({ field }) => (
                      <FormItem className="flex items-center gap-2 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <FormLabel className="flex cursor-pointer items-center gap-1.5 font-normal">
                          <Mail className="text-muted-foreground h-3.5 w-3.5" />
                          Send order confirmation email to customer
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Delivery */}
              <Card>
                <CardHeader>
                  <CardTitle>Delivery</CardTitle>
                  <CardDescription>
                    How this order reaches the customer
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="deliveryMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Method</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ship">
                              <span className="flex items-center gap-2">
                                <Truck className="h-3.5 w-3.5" />
                                Ship to customer
                              </span>
                            </SelectItem>
                            <SelectItem value="pickup">
                              <span className="flex items-center gap-2">
                                <Store className="h-3.5 w-3.5" />
                                In-store pickup
                              </span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          {isPickup
                            ? "No shipping address is recorded for pickup orders."
                            : "Shipping orders can carry a delivery address."}
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Date</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            {...field}
                            value={field.value ?? ""}
                          />
                        </FormControl>
                        <FormDescription>
                          Leave blank for now. Set it to backdate a phone or
                          in-person sale.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Shipping Address (optional, ship-only) */}
              {!isPickup && (
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <CardTitle>Shipping Address</CardTitle>
                        <CardDescription>
                          Optional — add a delivery address for the order
                        </CardDescription>
                      </div>
                      <FormField
                        control={form.control}
                        name="includeAddress"
                        render={({ field }) => (
                          <Button
                            type="button"
                            variant={field.value ? "secondary" : "outline"}
                            size="sm"
                            className="shrink-0"
                            onClick={() => field.onChange(!field.value)}
                          >
                            <MapPin className="mr-2 h-3.5 w-3.5" />
                            {field.value ? "Remove" : "Add address"}
                          </Button>
                        )}
                      />
                    </div>
                  </CardHeader>

                  {includeAddress && (
                    <CardContent className="space-y-4">
                      <InputFormField
                        form={form}
                        name="shippingName"
                        label="Recipient Name"
                        placeholder="Same as customer"
                      />

                      <InputFormField
                        form={form}
                        name="shippingAddress.line1"
                        label="Address"
                        placeholder="123 Main St"
                        required
                      />

                      <InputFormField
                        form={form}
                        name="shippingAddress.line2"
                        label="Apartment, suite, etc."
                        placeholder="Apt 4B"
                      />

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <InputFormField
                          form={form}
                          name="shippingAddress.city"
                          label="City"
                          placeholder="New York"
                          className="col-span-1"
                          required
                        />
                        <InputFormField
                          form={form}
                          name="shippingAddress.postal_code"
                          label="ZIP"
                          placeholder="10001"
                          className="col-span-1"
                          required
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="shippingAddress.country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              Country{" "}
                              <span className="text-red-500" aria-hidden="true">
                                *
                              </span>
                            </FormLabel>
                            <Select
                              value={field.value ?? "US"}
                              onValueChange={(val) => {
                                field.onChange(val);
                                form.setValue("shippingAddress.state", "");
                              }}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {allowedCountries.map((code) => (
                                  <SelectItem key={code} value={code}>
                                    {COUNTRY_LABELS[code]}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {regionOptions.length > 0 && (
                        <FormField
                          control={form.control}
                          name="shippingAddress.state"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>State / Province</FormLabel>
                              <Select
                                value={field.value ?? ""}
                                onValueChange={field.onChange}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select…" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {regionOptions.map((opt) => (
                                    <SelectItem key={opt.code} value={opt.code}>
                                      {opt.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}

                      <InputFormField
                        form={form}
                        name="shippingAddress.phone"
                        label="Phone"
                        type="tel"
                        placeholder="(555) 555-5555"
                      />
                    </CardContent>
                  )}
                </Card>
              )}

              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                  <CardDescription>
                    Visible to admins only. &ldquo;[Manual Order]&rdquo; is
                    prepended automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TextareaFormField
                    form={form}
                    name="notes"
                    label="Internal Notes"
                    placeholder="Internal notes about this order..."
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>

            {/* Right column — admin config */}
            <div className="col-span-1 space-y-4">
              {/* Payment & Fulfillment */}
              <Card>
                <CardHeader>
                  <CardTitle>Payment &amp; Fulfillment</CardTitle>
                  <CardDescription>
                    Set the payment and fulfillment status. The overall order
                    state is derived automatically.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="paymentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Whether payment has been collected. Inventory is only
                          deducted once an order is marked paid.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select
                          value={field.value ?? ""}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Manual (default)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="check">Check</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How payment was collected. Defaults to manual if left
                          blank.
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fulfillmentStatus"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Fulfillment</FormLabel>
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="unfulfilled">
                              Unfulfilled
                            </SelectItem>
                            <SelectItem value="fulfilled">Fulfilled</SelectItem>
                            <SelectItem value="partially_fulfilled">
                              Partially Fulfilled
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Whether items have been shipped or delivered
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Additional Charges */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Charges</CardTitle>
                  <CardDescription>
                    Shipping, tax and any discount applied to the item subtotal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <MoneyField
                      form={form}
                      name="shipping"
                      label="Shipping"
                      placeholder="9.99"
                      description="Flat shipping fee"
                    />
                    <MoneyField
                      form={form}
                      name="tax"
                      label="Tax"
                      placeholder="1.06"
                      description="Manually entered tax amount"
                    />
                  </div>

                  <MoneyField
                    form={form}
                    name="discount"
                    label="Discount"
                    placeholder="5.00"
                    description="Flat amount off this order"
                  />

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(totals.subtotal)}</span>
                    </div>
                    {totals.shipping > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>{formatPrice(totals.shipping)}</span>
                      </div>
                    )}
                    {totals.tax > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>{formatPrice(totals.tax)}</span>
                      </div>
                    )}
                    {totals.discount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Discount</span>
                        <span>-{formatPrice(totals.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Total</span>
                      <span>{formatPrice(totals.total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle>Order Items</CardTitle>
                  <CardDescription>
                    Products included in this order
                  </CardDescription>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <FormField
                    control={form.control}
                    name="useDirectSubtotal"
                    render={({ field }) => (
                      <Button
                        type="button"
                        variant={field.value ? "secondary" : "outline"}
                        size="sm"
                        onClick={() => {
                          const next = !field.value;
                          field.onChange(next);
                          // Switching to a direct subtotal discards line items:
                          // the two are alternatives, and leaving stale rows
                          // behind would make the preview lie.
                          if (next) form.setValue("items", []);
                        }}
                      >
                        {field.value
                          ? "Select items instead"
                          : "Enter subtotal directly"}
                      </Button>
                    )}
                  />
                  {!useDirectSubtotal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        append({
                          productId: "",
                          productName: "",
                          productVariantId: null,
                          variantName: null,
                          sku: null,
                          quantity: 1,
                          price: 0,
                        })
                      }
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Item
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {useDirectSubtotal ? (
                <FormField
                  control={form.control}
                  name="directSubtotal"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Subtotal</FormLabel>
                      <FormControl>
                        <div className="relative w-48">
                          <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                            $
                          </span>
                          <NumberInput
                            id="directSubtotal"
                            step="0.01"
                            className="pl-7"
                            placeholder="0.00"
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </div>
                      </FormControl>
                      <FormDescription>
                        No individual line items will be recorded for this
                        order.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : (
                <>
                  {fields.map((field, index) => {
                    const item = items[index];
                    const product = products.find(
                      (p) => p.id === item?.productId,
                    );
                    const rowErrors = form.formState.errors.items?.[index];

                    return (
                      <div
                        key={field.id}
                        className="flex items-start gap-2 rounded border p-4"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
                          <div className="col-span-2 min-w-0 lg:col-span-1">
                            <Label htmlFor={`items.${index}.productId`}>
                              Product{" "}
                              <span className="text-red-500" aria-hidden="true">
                                *
                              </span>
                            </Label>
                            <div className="mt-1">
                              <ProductPicker
                                products={products}
                                // A blank starter row carries `""`, which
                                // matches no product and so renders as the
                                // placeholder — see ProductPicker.
                                value={item?.productId}
                                invalid={!!rowErrors?.productId}
                                onSelect={(picked) => {
                                  form.setValue(
                                    `items.${index}`,
                                    {
                                      productId: picked.id,
                                      productName: picked.name,
                                      // Reset the variant: the previously
                                      // selected one belongs to the old product.
                                      productVariantId: null,
                                      variantName: null,
                                      sku: picked.sku ?? null,
                                      quantity: item?.quantity ?? 1,
                                      price: picked.price,
                                    },
                                    {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    },
                                  );
                                }}
                              />
                            </div>
                            {rowErrors?.productId && (
                              <p className="text-destructive mt-1.5 text-xs">
                                {rowErrors.productId.message}
                              </p>
                            )}
                          </div>

                          {product && product.variants.length > 0 ? (
                            <div className="col-span-2 min-w-0 lg:col-span-1">
                              <Label>
                                Variant{" "}
                                <span
                                  className="text-red-500"
                                  aria-hidden="true"
                                >
                                  *
                                </span>
                              </Label>
                              <Select
                                // `?? ""`, not `?? undefined`: switching product
                                // clears this to null, and a controlled Radix
                                // Select handed `undefined` flips to
                                // uncontrolled and keeps rendering the previous
                                // variant's label. No item has value "", so the
                                // placeholder shows instead.
                                value={item?.productVariantId ?? ""}
                                onValueChange={(variantId) => {
                                  const variant = product.variants.find(
                                    (v) => v.id === variantId,
                                  );
                                  if (!variant) return;
                                  form.setValue(
                                    `items.${index}`,
                                    {
                                      productId: product.id,
                                      productName: product.name,
                                      productVariantId: variant.id,
                                      // Snapshotted onto the OrderItem so the
                                      // detail page, packing slip and invoice
                                      // can show which variant was sold.
                                      variantName: variant.name,
                                      sku: variant.sku ?? product.sku ?? null,
                                      quantity: item?.quantity ?? 1,
                                      // NOT `variant.price ?? product.price`:
                                      // a variant price of 0 means "inherit
                                      // the base price" platform-wide, which
                                      // is what the storefront and Stripe
                                      // checkout both use. Treating 0 as $0.00
                                      // would record the line — and the order
                                      // total — as free.
                                      price: resolveVariantPrice(
                                        variant.price,
                                        product.price,
                                      ),
                                    },
                                    {
                                      shouldDirty: true,
                                      shouldValidate: true,
                                    },
                                  );
                                }}
                              >
                                <SelectTrigger className="mt-1 w-full">
                                  <SelectValue placeholder="Select a variant…" />
                                </SelectTrigger>
                                <SelectContent>
                                  {product.variants.map((variant) => (
                                    <SelectItem
                                      key={variant.id}
                                      value={variant.id}
                                    >
                                      {variant.name} ·{" "}
                                      {formatPrice(
                                        resolveVariantPrice(
                                          variant.price,
                                          product.price,
                                        ),
                                      )}
                                      {product.trackInventory
                                        ? ` · ${variant.inventoryQty} in stock`
                                        : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {rowErrors?.productVariantId ? (
                                <p className="text-destructive mt-1.5 text-xs">
                                  {rowErrors.productVariantId.message}
                                </p>
                              ) : (
                                !item?.productVariantId && (
                                  <p className="text-muted-foreground mt-1.5 text-xs">
                                    This product has variants — pick one.
                                  </p>
                                )
                              )}
                            </div>
                          ) : (
                            <div className="hidden lg:block" />
                          )}

                          <div className="min-w-0">
                            <Label htmlFor={`items.${index}.quantity`}>
                              Quantity{" "}
                              <span className="text-red-500" aria-hidden="true">
                                *
                              </span>
                            </Label>
                            <FormField
                              control={form.control}
                              name={`items.${index}.quantity`}
                              render={({ field: qtyField }) => (
                                <NumberInput
                                  id={`items.${index}.quantity`}
                                  step="1"
                                  min="1"
                                  className="mt-1 w-full"
                                  placeholder="1"
                                  value={qtyField.value}
                                  onChange={(value) =>
                                    qtyField.onChange(value ?? 1)
                                  }
                                />
                              )}
                            />
                            {rowErrors?.quantity && (
                              <p className="text-destructive mt-1.5 text-xs">
                                {rowErrors.quantity.message}
                              </p>
                            )}
                          </div>

                          <div className="min-w-0">
                            <Label>Line total</Label>
                            <Input
                              className="mt-1"
                              value={formatPrice(
                                Math.round(
                                  (item?.price ?? 0) * (item?.quantity ?? 0),
                                ),
                              )}
                              disabled
                            />
                            <p className="text-muted-foreground mt-1.5 text-xs">
                              {formatPrice(item?.price ?? 0)} each
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-5 shrink-0"
                          aria-label="Remove item"
                          onClick={() => remove(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}

                  {fields.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed py-12 text-center">
                      <Package className="text-muted-foreground/40 h-8 w-8" />
                      <div className="space-y-1">
                        <p className="text-muted-foreground text-sm font-medium">
                          No items added
                        </p>
                        <p className="text-muted-foreground/70 text-xs">
                          Click &quot;Add Item&quot; above to add products to
                          this order.
                        </p>
                      </div>
                    </div>
                  )}

                  {itemsError && (
                    <p className="text-destructive text-sm">{itemsError}</p>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}

/**
 * A dollar-denominated charge input. Nullable on purpose — an empty field is
 * `null`, not `0`, which is what keeps the placeholder visible.
 */
function MoneyField({
  form,
  name,
  label,
  placeholder,
  description,
}: {
  form: ReturnType<typeof useForm<ManualOrderFormValues>>;
  name: "shipping" | "tax" | "discount";
  label: string;
  placeholder: string;
  description: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <FormControl>
            <div className="relative">
              <span className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2">
                $
              </span>
              <NumberInput
                id={name}
                step="0.01"
                min="0"
                className="pl-7"
                placeholder={placeholder}
                value={field.value}
                onChange={field.onChange}
              />
            </div>
          </FormControl>
          <FormDescription>{description}</FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
