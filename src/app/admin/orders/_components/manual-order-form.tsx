"use client";

import type { OrderItem, Product, ProductVariant } from "generated/prisma";
import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Plus, Save, X } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
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
  businessId: string;
  products: (Product & { variants: ProductVariant[] })[];
};

export function ManualOrderForm({ businessId, products }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  // Items
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);

  // Initialize form with react-hook-form
  const form = useForm<ManualOrderFormSchema>({
    resolver: zodResolver(manualOrderFormSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      shippingName: "",
      shippingAddress: {
        line1: "",
        city: "",
        state: "",
        postal_code: "",
        country: "US",
      },
      items: [],
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      notes: "",
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

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const shipping = shippingCost
      ? Math.round(parseFloat(`${shippingCost}`) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(`${tax}`) * 100) : 0;
    return subtotal + shipping + taxAmount;
  };

  const createManualOrderMutation = api.order.createManual.useMutation({
    onSuccess: (data) => {
      router.push(`/admin/orders/${data.id}`);
      toast.dismiss();
      toast.success("Order created successfully");
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to create order");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Creating order...");
    },
  });
  const onSubmit = async (data: ManualOrderFormSchema) => {
    const subtotal = calculateSubtotal();
    const shipping = shippingCost
      ? Math.round(parseFloat(`${shippingCost}`) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(`${tax}`) * 100) : 0;
    const total = subtotal + shipping + taxAmount;

    createManualOrderMutation.mutate({
      businessId,
      customerName: data.customerName,
      customerEmail: data.customerEmail,
      shippingName: data.shippingName || data.customerName,
      shippingAddress: {
        line1: data.shippingAddress.line1,
        city: data.shippingAddress.city,
        state: data.shippingAddress.state,
        postal_code: data.shippingAddress.postal_code,
        country: data.shippingAddress.country,
      },
      items: data.items.map((item) => ({
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
            <div className="col-span-1 space-y-4">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Customer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <InputFormField
                      form={form}
                      name="customerName"
                      label="Name *"
                      required
                    />

                    <InputFormField
                      form={form}
                      name="customerEmail"
                      label="Email *"
                      type="email"
                      required
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Shipping Address */}
              <Card>
                <CardHeader>
                  <CardTitle>Shipping Address</CardTitle>
                </CardHeader>
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
                </CardContent>
              </Card>
            </div>
            <div className="col-span-1 space-y-4">
              {/* Notes */}
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <TextareaFormField
                    form={form}
                    name="notes"
                    label="Notes"
                    placeholder="Internal notes about this order..."
                    rows={3}
                  />
                </CardContent>
              </Card>
              {/* Additional Charges */}
              <Card>
                <CardHeader>
                  <CardTitle>Additional Charges</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="shipping"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Cost</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                                $
                              </span>
                              <Input
                                id="shipping"
                                type="number"
                                step="0.01"
                                className="pl-7"
                                placeholder="0.00"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : value);
                                }}
                              />
                            </div>
                          </FormControl>
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
                              <Input
                                id="tax"
                                type="number"
                                step="0.01"
                                className="pl-7"
                                placeholder="0.00"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) => {
                                  const value = parseFloat(e.target.value);
                                  field.onChange(isNaN(value) ? 0 : value);
                                }}
                              />
                            </div>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <div className="flex justify-between text-sm">
                      <span>Subtotal</span>
                      <span>{formatPrice(calculateSubtotal())}</span>
                    </div>
                    {shippingCost && (
                      <div className="flex justify-between text-sm">
                        <span>Shipping</span>
                        <span>${shippingCost}</span>
                      </div>
                    )}
                    {tax && (
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
              <div className="flex items-center justify-between">
                <CardTitle>Order Items</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => {
                const product = products.find((p) => p.id === item.productId);

                return (
                  <div
                    key={index}
                    className="flex items-end gap-4 rounded border p-4"
                  >
                    <div className="grid flex-1 grid-cols-4 gap-4">
                      <div>
                        <Label>Product</Label>
                        <Select
                          value={item?.productId ?? undefined}
                          onValueChange={(value) => updateItem(index, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            {products.map((product) => (
                              <SelectItem key={product.id} value={product.id}>
                                {product.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {product && product.variants.length > 0 && (
                        <div>
                          <Label>Variant</Label>
                          <Select
                            value={item?.productVariantId ?? undefined}
                            onValueChange={(value) =>
                              updateVariant(index, value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="None" />
                            </SelectTrigger>
                            <SelectContent>
                              {product.variants.map((variant) => (
                                <SelectItem key={variant.id} value={variant.id}>
                                  {variant.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div>
                        <Label>Quantity</Label>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(index, parseInt(e.target.value) || 1)
                          }
                        />
                      </div>

                      <div>
                        <Label>Price</Label>
                        <Input value={formatPrice(item.price ?? 0)} disabled />
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}

              {items.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-500">
                  No items added. Click &quot;Add Item&quot; to start.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
