"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { AccountAddressBookPageProps } from "../../_templates/types";
import type { SupportedCountry } from "~/lib/geo/regions";
import {
  COUNTRY_LABELS,
  getAllowedCountries,
  getRegionOptions,
} from "~/lib/geo/regions";
import { formatDate } from "~/lib/format-date";
import { api } from "~/trpc/react";
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
import { Card, CardContent } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";

export const addressSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  company: z.string().optional(),
  address1: z.string().min(1, "Required"),
  address2: z.string().optional(),
  city: z.string().min(1, "Required"),
  province: z.string().optional(),
  country: z.string().min(1, "Required"),
  zip: z.string().min(1, "Required"),
  phone: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;

export type Address = NonNullable<
  AccountAddressBookPageProps["customer"]
>["shippingAddresses"][number];

export function AddressSheet({
  open,
  onOpenChange,
  address,
  onSaved,
  allowedCountries,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: Address;
  onSaved: () => void;
  allowedCountries: SupportedCountry[];
}) {
  const utils = api.useUtils();
  const isEditing = !!address;

  const form = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      firstName: address?.firstName ?? "",
      lastName: address?.lastName ?? "",
      company: address?.company ?? "",
      address1: address?.address1 ?? "",
      address2: address?.address2 ?? "",
      city: address?.city ?? "",
      province: address?.province ?? "",
      country: address?.country ?? "US",
      zip: address?.zip ?? "",
      phone: address?.phone ?? "",
      isDefault: address?.isDefault ?? false,
    },
  });

  const selectedCountry = (form.watch("country") ?? "US") as SupportedCountry;
  const regionOptions = getRegionOptions(selectedCountry);

  const addMutation = api.customer.addAddress.useMutation({
    onSuccess: () => {
      toast.success("Address saved.");
      void utils.customer.getMyProfile.invalidate();
      onSaved();
      form.reset();
    },
    onError: () => toast.error("Failed to save address."),
  });

  const updateMutation = api.customer.updateAddress.useMutation({
    onSuccess: () => {
      toast.success("Address updated.");
      void utils.customer.getMyProfile.invalidate();
      onSaved();
    },
    onError: () => toast.error("Failed to update address."),
  });

  function onSubmit(values: AddressFormValues) {
    if (isEditing && address) {
      updateMutation.mutate({ id: address.id, ...values });
    } else {
      addMutation.mutate(values);
    }
  }

  const isPending = addMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    form.reset({
      firstName: address?.firstName ?? "",
      lastName: address?.lastName ?? "",
      company: address?.company ?? "",
      address1: address?.address1 ?? "",
      address2: address?.address2 ?? "",
      city: address?.city ?? "",
      province: address?.province ?? "",
      country: address?.country ?? "US",
      zip: address?.zip ?? "",
      phone: address?.phone ?? "",
      isDefault: address?.isDefault ?? false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address?.id]);

  function handleOpenChange(next: boolean) {
    if (!next) form.reset();
    onOpenChange(next);
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader className="px-6 pt-2">
          <SheetTitle>
            {isEditing ? "Edit Address" : "Add New Address"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update your saved address."
              : "Save a shipping address for faster checkout."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="mt-6 space-y-4 px-6"
          >
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="company"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input placeholder="Street address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Apt, suite, etc. (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(val) => {
                      field.onChange(val);
                      form.setValue("province", "");
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="province"
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
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP / Postal code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone (optional)</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isDefault"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer font-normal">
                    Set as default address
                  </FormLabel>
                </FormItem>
              )}
            />

            <div className="pt-2">
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending
                  ? "Saving…"
                  : isEditing
                    ? "Update Address"
                    : "Save Address"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}

export function AddressCard({
  address,
  onEdit,
  onDeleted,
}: {
  address: Address;
  onEdit: (address: Address) => void;
  onDeleted: () => void;
}) {
  const utils = api.useUtils();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setDefaultMutation = api.customer.setDefaultAddress.useMutation({
    onSuccess: () => {
      toast.success("Default address updated.");
      void utils.customer.getMyProfile.invalidate();
    },
    onError: () => toast.error("Failed to update default address."),
  });

  const deleteMutation = api.customer.deleteAddress.useMutation({
    onSuccess: () => {
      toast.success("Address removed.");
      void utils.customer.getMyProfile.invalidate();
      onDeleted();
    },
    onError: () => toast.error("Failed to remove address."),
  });

  return (
    <>
      <Card className="border-border/60 relative">
        {address.isDefault && (
          <span className="bg-primary text-primary-foreground absolute top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium">
            <Star className="h-3 w-3" aria-hidden />
            Default
          </span>
        )}
        <CardContent className="p-5">
          <address className="text-sm leading-relaxed not-italic">
            <p className="text-foreground font-semibold">
              {address.firstName} {address.lastName}
            </p>
            {address.company && (
              <p className="text-muted-foreground">{address.company}</p>
            )}
            <p className="text-muted-foreground">{address.address1}</p>
            {address.address2 && (
              <p className="text-muted-foreground">{address.address2}</p>
            )}
            <p className="text-muted-foreground">
              {address.city}
              {address.province ? `, ${address.province}` : ""} {address.zip}
            </p>
            <p className="text-muted-foreground">{address.country}</p>
            {address.phone && (
              <p className="text-muted-foreground mt-1">{address.phone}</p>
            )}
          </address>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {!address.isDefault && (
              <Button
                variant="outline"
                size="sm"
                disabled={setDefaultMutation.isPending}
                onClick={() => setDefaultMutation.mutate({ id: address.id })}
              >
                Set as default
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => onEdit(address)}>
              <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Remove
            </Button>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove address?</AlertDialogTitle>
            <AlertDialogDescription>
              This address will be removed from your address book. It will not
              affect any existing orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate({ id: address.id })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * The complete address book page body (list + add/edit sheet).
 * Wrap this in a template-specific layout component.
 */
export function AddressBookContent({
  customer,
  salesCountries,
}: Pick<AccountAddressBookPageProps, "customer"> & {
  salesCountries: string[];
}) {
  const allowedCountries = getAllowedCountries(salesCountries);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | undefined>();

  const { data: profile } = api.customer.getMyProfile.useQuery(undefined, {
    initialData: customer ?? undefined,
  });

  const addresses = profile?.shippingAddresses ?? [];

  function openAdd() {
    setEditingAddress(undefined);
    setSheetOpen(true);
  }

  function openEdit(address: Address) {
    setEditingAddress(address);
    setSheetOpen(true);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {addresses.length === 0
            ? "No saved addresses yet."
            : `${addresses.length} saved ${addresses.length === 1 ? "address" : "addresses"}`}
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="mr-1.5 h-4 w-4" aria-hidden />
          Add Address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <div className="bg-primary/10 mb-4 flex size-14 items-center justify-center rounded-full">
            <MapPin className="text-primary size-7" aria-hidden />
          </div>
          <p className="text-foreground mb-1 font-medium">No addresses saved</p>
          <p className="text-muted-foreground mb-5 text-sm">
            Save an address to speed up future checkouts.
          </p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" aria-hidden />
            Add Address
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {addresses.map((addr) => (
            <AddressCard
              key={addr.id}
              address={addr}
              onEdit={openEdit}
              onDeleted={() => {
                if (editingAddress?.id === addr.id) {
                  setSheetOpen(false);
                }
              }}
            />
          ))}
        </div>
      )}

      <AddressSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        address={editingAddress}
        onSaved={() => setSheetOpen(false)}
        allowedCountries={allowedCountries}
      />
    </div>
  );
}

/**
 * Data privacy section — download export and request deletion.
 */
function DataPrivacySection({
  customer,
}: {
  customer: AccountAddressBookPageProps["customer"];
}) {
  const router = useRouter();
  const utils = api.useUtils();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const requestDeletionMutation = api.customer.requestDeletion.useMutation({
    onSuccess: () => {
      toast.success(
        "Deletion request submitted. The store owner will process your request.",
      );
      router.refresh();
    },
    onError: () => {
      toast.error("Failed to submit deletion request. Please try again.");
    },
  });

  async function handleExport() {
    setIsExporting(true);
    try {
      const data = await utils.customer.exportMyData.fetch();
      if (!data) {
        toast.info("No personal data found for your account.");
        return;
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("Your data export has been downloaded.");
    } catch {
      toast.error("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <>
      <div className="rounded-lg border p-6">
        <h3 className="text-foreground font-semibold">Data &amp; Privacy</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Download a copy of your personal data or request account deletion.
        </p>

        <div className="mt-4 space-y-4">
          {/* Download export */}
          <div>
            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => void handleExport()}
            >
              {isExporting ? "Preparing export…" : "Download my data"}
            </Button>
          </div>

          {/* Deletion */}
          <div>
            {customer?.deletionRequestedAt ? (
              <p className="text-muted-foreground text-sm">
                Account deletion requested on{" "}
                {formatDate(customer.deletionRequestedAt)}.
              </p>
            ) : customer?.anonymizedAt ? (
              <p className="text-muted-foreground text-sm">
                This account has been anonymized.
              </p>
            ) : (
              <Button
                variant="destructive"
                size="sm"
                disabled={!customer}
                onClick={() => setDeleteDialogOpen(true)}
              >
                Request account deletion
              </Button>
            )}
            {!customer && (
              <p className="text-muted-foreground mt-1 text-xs">
                Place your first order to enable data deletion requests.
              </p>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Request account deletion?</AlertDialogTitle>
            <AlertDialogDescription>
              This requests permanent deletion of your personal data. Your past
              orders are retained (anonymized) for legal and tax reasons. The
              store owner will process your request.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={requestDeletionMutation.isPending}
              onClick={() => {
                setDeleteDialogOpen(false);
                requestDeletionMutation.mutate();
              }}
            >
              {requestDeletionMutation.isPending
                ? "Submitting…"
                : "Request deletion"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/**
 * Marketing preferences toggle content.
 * Wrap this in a template-specific layout component.
 */
export function PreferencesContent({
  business,
  customer,
}: {
  business: { name: string };
  customer: AccountAddressBookPageProps["customer"];
}) {
  const [acceptsMarketing, setAcceptsMarketing] = useState(
    customer?.acceptsMarketing ?? false,
  );

  const { mutate, isPending } =
    api.customer.updateMarketingPreference.useMutation({
      onSuccess: (_, variables) => {
        setAcceptsMarketing(variables.acceptsMarketing);
        toast.success(
          variables.acceptsMarketing
            ? "You're now subscribed to marketing emails."
            : "You've unsubscribed from marketing emails.",
        );
      },
      onError: () => {
        toast.error("Failed to update preference. Please try again.");
      },
    });

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-lg border p-6">
        <h3 className="text-foreground font-semibold">Marketing Emails</h3>
        <p className="text-muted-foreground mt-1 text-sm">
          Receive news, promotions, and updates from {business.name}.
        </p>
        <div className="mt-4">
          {!customer ? (
            <p className="text-muted-foreground text-sm">
              Place your first order to enable email preferences.
            </p>
          ) : (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {acceptsMarketing ? "Subscribed" : "Unsubscribed"}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={acceptsMarketing}
                disabled={isPending}
                onClick={() => mutate({ acceptsMarketing: !acceptsMarketing })}
                className={`focus-visible:ring-ring relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${acceptsMarketing ? "bg-primary" : "bg-input"}`}
                aria-label="Toggle marketing emails"
              >
                <span
                  className={`bg-background pointer-events-none inline-block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform ${acceptsMarketing ? "translate-x-5" : "translate-x-0"}`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      <DataPrivacySection customer={customer} />
    </div>
  );
}
