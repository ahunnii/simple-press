"use client";

import type { OrderItem, Product, ProductVariant } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Save, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Alert, AlertDescription } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

// type OrderItem = {
//   productId: string;
//   productName: string;
//   variantId: string | null;
//   variantName: string | null;
//   quantity: number;
//   price: number;
// };

type Props = {
  businessId: string;
  products: (Product & { variants: ProductVariant[] })[];
};

export function ManualOrderForm({ businessId, products }: Props) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer info
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Shipping
  const [shippingName, setShippingName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [country, setCountry] = useState("US");

  // Items
  const [items, setItems] = useState<Partial<OrderItem>[]>([]);

  // Additional charges
  const [shippingCost, setShippingCost] = useState("");
  const [tax, setTax] = useState("");
  const [notes, setNotes] = useState("");

  const formatPrice = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

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
      ? Math.round(parseFloat(shippingCost) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(tax) * 100) : 0;
    return subtotal + shipping + taxAmount;
  };

  const createManualOrderMutation = api.order.createManual.useMutation({
    onSuccess: (data) => {
      router.push(`/admin/orders/${data.id}`);
    },
    onError: (error) => {
      setError(error.message ?? "Failed to create order");
    },
    onSettled: () => {
      setIsSubmitting(false);
    },
  });
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Validation
    if (!customerName || !customerEmail) {
      throw new Error("Customer name and email are required");
    }

    if (items.length === 0) {
      throw new Error("Add at least one item to the order");
    }

    if (items.some((item) => !item.productId)) {
      throw new Error("All items must have a product selected");
    }

    const subtotal = calculateSubtotal();
    const shipping = shippingCost
      ? Math.round(parseFloat(shippingCost) * 100)
      : 0;
    const taxAmount = tax ? Math.round(parseFloat(tax) * 100) : 0;
    const total = subtotal + shipping + taxAmount;

    createManualOrderMutation.mutate({
      businessId,
      customerName,
      customerEmail,
      shippingName: shippingName || customerName,
      shippingAddress: {
        line1: address,
        city,
        state,
        postal_code: zipCode,
        country,
      },
      items: items.map((item) => ({
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
      notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Customer Info */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Name *</Label>
              <Input
                id="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="customerEmail">Email *</Label>
              <Input
                id="customerEmail"
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shipping Address */}
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="shippingName">Recipient Name</Label>
            <Input
              id="shippingName"
              value={shippingName}
              onChange={(e) => setShippingName(e.target.value)}
              placeholder="Same as customer"
            />
          </div>
          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="zipCode">ZIP</Label>
              <Input
                id="zipCode"
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Order Items</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
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
                        onValueChange={(value) => updateVariant(index, value)}
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

      {/* Additional Charges */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Charges</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipping">Shipping Cost</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="shipping"
                  type="number"
                  step="0.01"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="tax">Tax</Label>
              <div className="relative">
                <span className="absolute top-1/2 left-3 -translate-y-1/2 text-gray-500">
                  $
                </span>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
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

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Internal notes about this order..."
            rows={3}
          />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Create Order
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
