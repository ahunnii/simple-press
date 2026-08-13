"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { SupportedCountry } from "~/lib/geo/regions";
import type { updateShippingAddressSchema } from "~/lib/validators/order";
import type { z } from "zod";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { updateShippingAddressSchema as shippingAddressFormSchema } from "~/lib/validators/order";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

type ShippingAddress = {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
};

type Props = {
  orderId: string;
  address: ShippingAddress | null;
  canAdd?: boolean;
  allowedCountries: SupportedCountry[];
};

type ShippingAddressFormData = z.infer<typeof updateShippingAddressSchema>;

function buildDefaultValues(
  orderId: string,
  address: ShippingAddress | null,
): ShippingAddressFormData {
  return {
    orderId,
    firstName: address?.firstName ?? "",
    lastName: address?.lastName ?? "",
    company: address?.company ?? "",
    address1: address?.address1 ?? "",
    address2: address?.address2 ?? "",
    city: address?.city ?? "",
    province: address?.province ?? "",
    zip: address?.zip ?? "",
    country: (address?.country ?? "") || "US",
    phone: address?.phone ?? "",
  };
}

export function EditShippingAddressDialog({
  orderId,
  address,
  canAdd,
  allowedCountries,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);

  const form = useForm<ShippingAddressFormData>({
    resolver: zodResolver(shippingAddressFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: buildDefaultValues(orderId, address),
  });

  const selectedCountry = (form.watch("country") || "US") as SupportedCountry;
  const regionOptions = getRegionOptions(selectedCountry);

  const mutation = api.order.updateShippingAddress.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Shipping address updated");
      void utils.order.invalidate();
      router.refresh();
      setIsOpen(false);
    },
    onError: (err) => {
      toast.dismiss();
      applyTrpcErrorToForm(form, err, {
        fallbackMessage: "Failed to update shipping address",
      });
    },
    onMutate: () => {
      toast.loading("Saving address...");
    },
  });

  const onSubmit = (data: ShippingAddressFormData) => {
    mutation.mutate(data);
  };

  const onOpenChange = (open: boolean) => {
    if (open) form.reset(buildDefaultValues(orderId, address));
    setIsOpen(open);
  };

  if (!address && !canAdd) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2">
          <Pencil className="h-3.5 w-3.5" />
          <span className="sr-only">Edit shipping address</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {address ? "Edit Shipping Address" : "Add Shipping Address"}
          </DialogTitle>
          <DialogDescription>
            Update the delivery address for this order.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 py-2"
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputFormField
                form={form}
                name="firstName"
                label="First Name"
                required
                className="col-span-1"
              />
              <InputFormField
                form={form}
                name="lastName"
                label="Last Name"
                required
                className="col-span-1"
              />
            </div>

            <InputFormField
              form={form}
              name="company"
              label="Company (optional)"
            />

            <InputFormField
              form={form}
              name="address1"
              label="Address"
              required
            />

            <InputFormField
              form={form}
              name="address2"
              label="Apt, suite, etc. (optional)"
            />

            <SelectFormField
              form={form}
              name="country"
              label="Country"
              values={allowedCountries.map((code) => ({
                value: code,
                label: COUNTRY_LABELS[code],
              }))}
              onValueChange={() =>
                form.setValue("province", "", {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
            />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <InputFormField form={form} name="city" label="City" required className="col-span-1" />
              <SelectFormField
                form={form}
                name="province"
                label="State / Province"
                placeholder="Select…"
                values={regionOptions.map((opt) => ({
                  value: opt.code,
                  label: opt.name,
                }))}
                className="col-span-1"
              />
            </div>

            <InputFormField
              form={form}
              name="zip"
              label="ZIP / Postal Code"
              required
            />

            <InputFormField
              form={form}
              name="phone"
              label="Phone (optional)"
              type="tel"
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={mutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                Save Address
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
