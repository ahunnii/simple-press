"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import type { SupportedCountry } from "~/lib/geo/regions";
import { COUNTRY_LABELS, getRegionOptions } from "~/lib/geo/regions";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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

const EMPTY: ShippingAddress = {
  firstName: "",
  lastName: "",
  company: "",
  address1: "",
  address2: "",
  city: "",
  province: "",
  zip: "",
  country: "",
  phone: "",
};

export function EditShippingAddressDialog({ orderId, address, canAdd, allowedCountries }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const [isOpen, setIsOpen] = useState(false);
  const [form, setForm] = useState<ShippingAddress>(address ?? EMPTY);

  const selectedCountry = (form.country || "US") as SupportedCountry;
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
      toast.error(err.message ?? "Failed to update shipping address");
    },
    onMutate: () => {
      toast.loading("Saving address...");
    },
  });

  const field = (key: keyof ShippingAddress) => ({
    value: form[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      orderId,
      firstName: form.firstName,
      lastName: form.lastName,
      company: form.company ?? null,
      address1: form.address1,
      address2: form.address2 ?? null,
      city: form.city,
      province: form.province ?? null,
      zip: form.zip,
      country: form.country,
      phone: form.phone ?? null,
    });
  };

  const onOpenChange = (open: boolean) => {
    if (open) setForm(address ?? EMPTY);
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
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sa-firstName">First Name</Label>
              <Input id="sa-firstName" required {...field("firstName")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-lastName">Last Name</Label>
              <Input id="sa-lastName" required {...field("lastName")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-company">Company (optional)</Label>
            <Input id="sa-company" {...field("company")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-address1">Address</Label>
            <Input id="sa-address1" required {...field("address1")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-address2">Apt, suite, etc. (optional)</Label>
            <Input id="sa-address2" {...field("address2")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-country">Country</Label>
            <Select
              value={form.country || "US"}
              onValueChange={(val) =>
                setForm((prev) => ({ ...prev, country: val, province: "" }))
              }
            >
              <SelectTrigger id="sa-country">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedCountries.map((code) => (
                  <SelectItem key={code} value={code}>
                    {COUNTRY_LABELS[code]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sa-city">City</Label>
              <Input id="sa-city" required {...field("city")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sa-province">State / Province</Label>
              <Select
                value={form.province ?? ""}
                onValueChange={(val) =>
                  setForm((prev) => ({ ...prev, province: val }))
                }
              >
                <SelectTrigger id="sa-province">
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent>
                  {regionOptions.map((opt) => (
                    <SelectItem key={opt.code} value={opt.code}>
                      {opt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-zip">ZIP / Postal Code</Label>
            <Input id="sa-zip" required {...field("zip")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sa-phone">Phone (optional)</Label>
            <Input id="sa-phone" type="tel" {...field("phone")} />
          </div>

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
      </DialogContent>
    </Dialog>
  );
}
