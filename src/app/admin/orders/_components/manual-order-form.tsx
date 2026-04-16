"use client";

import type { OrderItem, Product, ProductVariant } from "generated/prisma";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Mail, MapPin, Package, Plus, Save, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ManualOrderFormSchema } from "~/lib/validators/order";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import { manualOrderFormSchema } from "~/lib/validators/order";
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

type Props = {
  products: (Product & { variants: ProductVariant[] })[];
};

export function ManualOrderForm({ products }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const utils = api.useUtils();

  // Items
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);

  // UI mode toggles
  const [includeAddress, setIncludeAddress] = useState(false);
  const [useDirectSubtotal, setUseDirectSubtotal] = useState(false);
  const [directSubtotal, setDirectSubtotal] = useState<number>(0);

  // Initialize form with react-hook-form
  const form = useForm<ManualOrderFormSchema>({
    resolver: zodResolver(manualOrderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      shippingName: "",
      shippingAddress: { line1: "", city: "", state: "", postal_code: "", country: "US" },
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      notes: "",
      status: "pending",
      paymentStatus: "pending",
      paymentMethod: undefined,
      fulfillmentStatus: "unfulfilled",
      sendConfirmationEmail: false,
    },
  });

  const shippingCost = form.watch("shipping");
  const tax = form.watch("tax");

  const addItem = () => {
    setItems([
      ...items,
      {
        productId: "",
        productName: "",
        productVariantId: null,
        variantName: null,
        quantity: 1,
        price: 0,
      },
    ]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productId: product.id,
      productName: product.name,
      price: product.price,
      productVariantId: null,
      variantName: null,
    };
    setItems(updated);
  };

  const updateVariant = (index: number, variantId: string) => {
    const item = items[index];
    const product = products.find((p) => p.id === item?.productId);
    if (!product) return;

    const variant = product.variants.find((v) => v.id === variantId);
    if (!variant) return;

    const updated = [...items];
    updated[index] = {
      ...updated[index],
      productVariantId: variant.id,
      variantName: variant.name,
      price: variant.price ?? product.price,
    };
    setItems(updated);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updated = [...items];
    updated[index]!.quantity = quantity;
    setItems(updated);
  };

  const calculateSubtotal = () => {
    return items.reduce(
      (sum, item) => sum + (item.price ?? 0) * (item.quantity ?? 0),
      0,
    );
  };

  const getSubtotal = () => {
    return useDirectSubtotal
      ? Math.round(directSubtotal * 100)
      : calculateSubtotal();
  };

  const calculateTotal = () => {
    const subtotal = getSubtotal();
    const shipping = shippingCost
      ? Math.round(parseFloat(`${shippingCost}`) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(`${tax}`) * 100) : 0;
    return subtotal + shipping + taxAmount;
  };

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

  const deriveStatus = (paymentStatus: string, fulfillmentStatus: string) => {
    if (paymentStatus === "refunded") return "refunded";
    if (paymentStatus === "failed") return "pending";
    if (fulfillmentStatus === "fulfilled" && paymentStatus === "paid")
      return "fulfilled";
    if (paymentStatus === "paid") return "paid";
    return "pending";
  };

  const onSubmit = async (data: ManualOrderFormSchema) => {
    if (!useDirectSubtotal && items.length === 0) {
      toast.error("Add at least one item, or enter a subtotal directly.");
      return;
    }

    const subtotal = getSubtotal();
    const shipping = shippingCost
      ? Math.round(parseFloat(`${shippingCost}`) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(`${tax}`) * 100) : 0;
    const total = subtotal + shipping + taxAmount;

    createManualOrderMutation.mutate({
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      shippingName: includeAddress
        ? (data.shippingName ?? data.customerName)
        : undefined,
      shippingAddress:
        includeAddress && data.shippingAddress
          ? {
              line1: data.shippingAddress.line1,
              city: data.shippingAddress.city,
              state: data.shippingAddress.state,
              postal_code: data.shippingAddress.postal_code,
              country: data.shippingAddress.country,
            }
          : undefined,
      items: useDirectSubtotal
        ? []
        : items.map((item) => ({
            productId: item.productId,
            productName: item.productName,
            productVariantId: item.productVariantId,
            quantity: item.quantity ?? 1,
            price: item.price ?? 0,
            total: (item.price ?? 0) * (item.quantity ?? 0),
          })),
      subtotal,
      shipping,
      tax: taxAmount,
      total,
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

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        onChange={() => console.log(form.formState.errors)}
        className="min-h-screen bg-gray-50"
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
                  <CardTitle>Customer Information</CardTitle>
                  <CardDescription>
                    The person placing this order
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputFormField
                      form={form}
                      name="customerName"
                      label="Name"
                      required
                    />

                    <InputFormField
                      form={form}
                      name="customerEmail"
                      label="Email"
                      type="email"
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

              {/* Shipping Address (optional) */}
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <CardTitle>Shipping Address</CardTitle>
                      <CardDescription>
                        Optional — add a delivery address for the order
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      variant={includeAddress ? "secondary" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() => setIncludeAddress((v) => !v)}
                    >
                      <MapPin className="mr-2 h-3.5 w-3.5" />
                      {includeAddress ? "Remove" : "Add address"}
                    </Button>
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
                    />

                    <div className="grid grid-cols-3 gap-4">
                      <InputFormField
                        form={form}
                        name="shippingAddress.city"
                        label="City"
                        placeholder="New York"
                        className="col-span-1"
                      />
                      <InputFormField
                        form={form}
                        name="shippingAddress.state"
                        label="State"
                        placeholder="NY"
                        className="col-span-1"
                      />
                      <InputFormField
                        form={form}
                        name="shippingAddress.postal_code"
                        label="ZIP"
                        placeholder="10001"
                        className="col-span-1"
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shippingAddress.country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <Select
                            value={field.value ?? "US"}
                            onValueChange={field.onChange}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="US">United States</SelectItem>
                              <SelectItem value="CA">Canada</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </CardContent>
                )}
              </Card>

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
                          Whether payment has been collected
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
                    Shipping and tax added on top of the item subtotal
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipping"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <NumberInput
                                id="shipping"
                                step="0.01"
                                className="pl-7"
                                placeholder="9.99"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>Flat shipping fee</FormDescription>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tax"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <NumberInput
                                id="tax"
                                step="0.01"
                                className="pl-7"
                                placeholder="1.06"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Manually entered tax amount
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(getSubtotal())}</span>
                    </div>
                    {!!shippingCost && (
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>${shippingCost}</span>
                      </div>
                    )}
                    {!!tax && (
                      <div className="flex justify-between text-sm">
                        <span>Tax</span>
                        <span>${tax}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-bold">
                      <span>Total</span>
                      <span>{formatPrice(calculateTotal())}</span>
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
                  <Button
                    type="button"
                    variant={useDirectSubtotal ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => {
                      setUseDirectSubtotal((v) => !v);
                      if (!useDirectSubtotal) setItems([]);
                    }}
                  >
                    {useDirectSubtotal
                      ? "Select items instead"
                      : "Enter subtotal directly"}
                  </Button>
                  {!useDirectSubtotal && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addItem}
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
                <div className="flex flex-col gap-1.5">
                  <Label>Subtotal</Label>
                  <div className="relative w-48">
                    <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                      $
                    </span>
                    <NumberInput
                      id="directSubtotal"
                      step="0.01"
                      className="pl-7"
                      placeholder="0.00"
                      value={directSubtotal}
                      onChange={(value) => setDirectSubtotal(value ?? 0)}
                    />
                  </div>
                  <p className="text-muted-foreground text-xs">
                    No individual line items will be recorded for this order.
                  </p>
                </div>
              ) : (
                <>
                  {items.map((item, index) => {
                    const product = products.find(
                      (p) => p.id === item.productId,
                    );

                    return (
                      <div
                        key={index}
                        className="flex items-start gap-2 rounded border p-4"
                      >
                        <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 lg:grid-cols-4">
                          <div className="col-span-2 min-w-0 lg:col-span-1">
                            <Label>Product</Label>
                            <Select
                              value={item?.productId ?? undefined}
                              onValueChange={(value) =>
                                updateItem(index, value)
                              }
                            >
                              <SelectTrigger className="mt-1 w-full">
                                <SelectValue placeholder="Select..." />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem
                                    key={product.id}
                                    value={product.id}
                                  >
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {product && product.variants.length > 0 ? (
                            <div className="col-span-2 min-w-0 lg:col-span-1">
                              <Label>Variant</Label>
                              <Select
                                value={item?.productVariantId ?? undefined}
                                onValueChange={(value) =>
                                  updateVariant(index, value)
                                }
                              >
                                <SelectTrigger className="mt-1 w-full">
                                  <SelectValue placeholder="None" />
                                </SelectTrigger>
                                <SelectContent>
                                  {product.variants.map((variant) => (
                                    <SelectItem
                                      key={variant.id}
                                      value={variant.id}
                                    >
                                      {variant.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="hidden lg:block" />
                          )}

                          <div className="min-w-0">
                            <Label>
                              Quantity <span className="text-red-500">*</span>
                            </Label>
                            <NumberInput
                              id="quantity"
                              step="1"
                              className="mt-1 w-full"
                              placeholder="1"
                              value={item.quantity}
                              onChange={(value) =>
                                updateQuantity(index, value ?? 1)
                              }
                            />
                          </div>

                          <div className="min-w-0">
                            <Label>Price</Label>
                            <Input
                              className="mt-1"
                              value={formatPrice(item.price ?? 0)}
                              disabled
                            />
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-5 shrink-0"
                          onClick={() => removeItem(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}

                  {items.length === 0 && (
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
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
