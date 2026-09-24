"use client";

import type { UseFormReturn } from "react-hook-form";
import Link from "next/link";

import type { InvoiceBuilderValues } from "./types";
import type { InvoicePaymentMethod } from "~/lib/validators/invoice";
import {
  paymentMethodDetailSummary,
  paymentMethodDisplayName,
} from "~/lib/invoices/payment-methods";
import { Checkbox } from "~/components/ui/checkbox";
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";

/**
 * Which of the business's saved payment methods show on this invoice. All
 * checked by default on a new invoice (the caller sets that as the field's
 * default value); an id that no longer exists in `methods` (deleted from
 * settings since the draft was made) is simply never rendered here — the
 * router drops it from `paymentMethodIds` on save.
 */
export function PaymentMethodChecklist({
  form,
  methods,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
  methods: InvoicePaymentMethod[];
}) {
  return (
    <FormField
      control={form.control}
      name="paymentMethodIds"
      render={({ field }) => {
        const selected = field.value ?? [];
        return (
          <FormItem>
            <FormLabel>Payment methods</FormLabel>
            {methods.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No payment methods saved yet.{" "}
                <Link
                  href="/admin/settings/invoices"
                  className="text-primary underline underline-offset-2"
                >
                  Add payment methods
                </Link>
                .
              </p>
            ) : (
              <div className="space-y-2">
                {methods.map((method) => {
                  const checked = selected.includes(method.id);
                  const label = paymentMethodDisplayName(method);
                  return (
                    <label
                      key={method.id}
                      className="hover:bg-muted/40 flex cursor-pointer items-start gap-3 rounded-md border p-3 text-sm"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(next) => {
                          field.onChange(
                            next
                              ? [...selected, method.id]
                              : selected.filter((id) => id !== method.id),
                          );
                        }}
                        className="mt-0.5"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{label}</span>
                        <span className="text-muted-foreground block text-xs">
                          {paymentMethodDetailSummary(method)}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
}
