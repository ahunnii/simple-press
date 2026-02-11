"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ShoppingBag } from "lucide-react";

import { useCart } from "~/providers/cart-context";

export function ModernCheckoutForm() {
  const { items, clearCart } = useCart();

  const totalPrice = items.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const [submitted, setSubmitted] = useState(false);

  const shipping = totalPrice >= 150 ? 0 : 12;
  const total = totalPrice + shipping;

  if (submitted) {
    return (
      <div className="py-20 text-center">
        <div className="bg-accent/10 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
          <Check className="text-accent h-8 w-8" />
        </div>
        <h2 className="text-foreground mt-6 font-serif text-3xl">
          Thank you for your order
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md">
          Your order has been placed successfully. We will send you an email
          confirmation with tracking details shortly.
        </p>
        <Link
          href="/products"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Continue Shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <ShoppingBag className="text-muted-foreground/40 mx-auto h-12 w-12" />
        <h2 className="text-foreground mt-4 font-serif text-2xl">
          Nothing to check out
        </h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Add some items to your cart first.
        </p>
        <Link
          href="/products"
          className="bg-primary text-primary-foreground mt-8 inline-flex items-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
        >
          Browse Products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    clearCart();
    setSubmitted(true);
  }

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-3">
      {/* Form */}
      <div className="lg:col-span-2">
        <form onSubmit={handleSubmit} id="checkout-form">
          {/* Contact */}
          <div>
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Contact Information
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="firstName"
                  className="text-muted-foreground block text-sm"
                >
                  First Name
                </label>
                <input
                  id="firstName"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="Jane"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="text-muted-foreground block text-sm"
                >
                  Last Name
                </label>
                <input
                  id="lastName"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="Doe"
                />
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="email"
                  className="text-muted-foreground block text-sm"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="jane@example.com"
                />
              </div>
            </div>
          </div>

          {/* Shipping */}
          <div className="border-border mt-10 border-t pt-10">
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Shipping Address
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="address"
                  className="text-muted-foreground block text-sm"
                >
                  Address
                </label>
                <input
                  id="address"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="123 Main Street"
                />
              </div>
              <div>
                <label
                  htmlFor="city"
                  className="text-muted-foreground block text-sm"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="San Francisco"
                />
              </div>
              <div>
                <label
                  htmlFor="state"
                  className="text-muted-foreground block text-sm"
                >
                  State
                </label>
                <input
                  id="state"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="CA"
                />
              </div>
              <div>
                <label
                  htmlFor="zip"
                  className="text-muted-foreground block text-sm"
                >
                  ZIP Code
                </label>
                <input
                  id="zip"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="94102"
                />
              </div>
              <div>
                <label
                  htmlFor="country"
                  className="text-muted-foreground block text-sm"
                >
                  Country
                </label>
                <input
                  id="country"
                  type="text"
                  required
                  defaultValue="United States"
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Payment */}
          <div className="border-border mt-10 border-t pt-10">
            <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
              Payment
            </h2>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="cardNumber"
                  className="text-muted-foreground block text-sm"
                >
                  Card Number
                </label>
                <input
                  id="cardNumber"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="1234 5678 9012 3456"
                />
              </div>
              <div>
                <label
                  htmlFor="expiry"
                  className="text-muted-foreground block text-sm"
                >
                  Expiry Date
                </label>
                <input
                  id="expiry"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="MM / YY"
                />
              </div>
              <div>
                <label
                  htmlFor="cvc"
                  className="text-muted-foreground block text-sm"
                >
                  CVC
                </label>
                <input
                  id="cvc"
                  type="text"
                  required
                  className="border-border bg-card text-foreground placeholder:text-muted-foreground/50 focus:border-foreground mt-1 w-full border px-4 py-3 text-sm focus:outline-none"
                  placeholder="123"
                />
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Order Summary Sidebar */}
      <div>
        <div className="border-border bg-card rounded-sm border p-8">
          <h2 className="text-foreground text-xs font-semibold tracking-widest uppercase">
            Order Summary
          </h2>

          <div className="mt-6 flex flex-col gap-4">
            {items.map((item) => (
              <div key={item.productId} className="flex gap-4">
                <div className="bg-muted relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-sm">
                  <Image
                    src={item.imageUrl ?? "/placeholder.svg"}
                    alt={item.productName}
                    fill
                    className="object-cover"
                    sizes="64px"
                  />
                </div>
                <div className="flex flex-1 items-center justify-between">
                  <div>
                    <p className="text-foreground text-sm font-medium">
                      {item.productName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      Qty: {item.quantity}
                    </p>
                  </div>
                  <p className="text-foreground text-sm">
                    ${item.price * item.quantity}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-border mt-6 border-t pt-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-foreground">${totalPrice}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-foreground">
                  {shipping === 0 ? "Free" : `$${shipping}`}
                </span>
              </div>
            </div>
          </div>

          <div className="border-border mt-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <span className="text-foreground font-medium">Total</span>
              <span className="text-foreground text-lg font-medium">
                ${total}
              </span>
            </div>
          </div>

          <button
            type="submit"
            form="checkout-form"
            className="bg-primary text-primary-foreground mt-8 flex w-full items-center justify-center gap-2 px-8 py-3 text-sm font-medium tracking-wide transition-opacity hover:opacity-90"
          >
            Place Order
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
