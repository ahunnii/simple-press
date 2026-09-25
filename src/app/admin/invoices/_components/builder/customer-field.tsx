"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { MapPin } from "lucide-react";

import type { InvoiceBuilderValues } from "./types";
import { Button } from "~/components/ui/button";
import { InputFormField } from "~/components/inputs/input-form-field";
import { CustomerPicker } from "~/app/admin/orders/_components/customer-picker";

/**
 * Customer identity for the invoice: pick an existing customer to prefill
 * name/email (`CustomerPicker`, shared with the manual order form — it
 * doesn't expose an id, but that's fine here: `invoice.create`/`update`
 * upsert by normalized email when no `customer.customerId` is set, the same
 * key checkout uses), or type a new one. Phone and billing address are
 * optional and start hidden — `billingAddress` is only added to the form
 * value once the owner asks for it, and removed (not just hidden) when they
 * take it away, so an empty address section never fails
 * `quickBooksBillingAddressSchema`'s required fields on submit.
 */
export function CustomerField({
  form,
}: {
  form: UseFormReturn<InvoiceBuilderValues>;
}) {
  const [showAddress, setShowAddress] = useState<boolean>(
    () => !!form.getValues("customer.billingAddress"),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          Pick an existing customer, or enter their details below.
        </p>
        <CustomerPicker
          onSelect={({ name, email }) => {
            form.setValue("customer.name", name, {
              shouldDirty: true,
              shouldValidate: true,
            });
            form.setValue("customer.email", email, {
              shouldDirty: true,
              shouldValidate: true,
            });
          }}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InputFormField
          form={form}
          name="customer.name"
          label="Customer name"
          required
          placeholder="Jane Doe"
        />
        <InputFormField
          form={form}
          name="customer.email"
          label="Email"
          type="email"
          required
          placeholder="jane@example.com"
        />
        <InputFormField
          form={form}
          name="customer.phone"
          label="Phone"
          placeholder="Optional"
        />
      </div>

      {showAddress ? (
        <div className="space-y-4 rounded-md border p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Billing address</p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                form.setValue("customer.billingAddress", undefined, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                setShowAddress(false);
              }}
            >
              Remove address
            </Button>
          </div>
          <InputFormField
            form={form}
            name="customer.billingAddress.line1"
            label="Street address"
            required
          />
          <InputFormField
            form={form}
            name="customer.billingAddress.line2"
            label="Apt / suite (optional)"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_100px_140px]">
            <InputFormField
              form={form}
              name="customer.billingAddress.city"
              label="City"
              required
            />
            <InputFormField
              form={form}
              name="customer.billingAddress.state"
              label="State"
              required
              placeholder="MI"
            />
            <InputFormField
              form={form}
              name="customer.billingAddress.zip"
              label="ZIP"
              required
              placeholder="48104"
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => {
            form.setValue(
              "customer.billingAddress",
              { line1: "", line2: "", city: "", state: "", zip: "" },
              { shouldDirty: true },
            );
            setShowAddress(true);
          }}
        >
          <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
          Add billing address
        </Button>
      )}
    </div>
  );
}
