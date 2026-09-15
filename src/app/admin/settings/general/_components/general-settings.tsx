"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import type { GeneralBusinessFormSchema } from "~/lib/validators/general-business";
import type { RouterOutputs } from "~/trpc/react";
import { formatBusinessAddress } from "~/lib/address/format";
import { firstNonBlank } from "~/lib/seo/blank";
import { COMMON_TIME_ZONES } from "~/lib/time-zones";
import { cn } from "~/lib/utils";
import { generalBusinessFormSchema } from "~/lib/validators/general-business";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { InputFormField } from "~/components/inputs/input-form-field";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWith"]>;
};

// The four structured columns are new; `businessAddress` is the pre-existing
// free-text field they replace. Until an owner fills in any of the four
// parts, the DB still only has the old single-line string — surface it in
// the Street field so the owner isn't staring at a blank form and doesn't
// lose what they already typed. See `~/lib/address/format`.
type AddressSource = {
  addressStreet: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressPostalCode: string | null;
  businessAddress: string | null;
};

function addressDefaults(source: AddressSource) {
  const legacyStreet =
    !source.addressStreet &&
    !source.addressCity &&
    !source.addressState &&
    !source.addressPostalCode &&
    source.businessAddress
      ? source.businessAddress
      : "";

  return {
    addressStreet: source.addressStreet ?? legacyStreet,
    addressCity: source.addressCity ?? "",
    addressState: source.addressState ?? "",
    addressPostalCode: source.addressPostalCode ?? "",
  };
}

export function GeneralSettings({ business }: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  // Refs
  const formRef = useRef<HTMLFormElement>(null);

  // Form Setup
  const form = useForm<GeneralBusinessFormSchema>({
    resolver: zodResolver(generalBusinessFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      name: business.name ?? "",
      ownerEmail: business.ownerEmail ?? "",
      phoneNumber: business.phoneNumber ?? "",
      supportEmail: business.supportEmail ?? "",
      ...addressDefaults(business),
      slug: business.slug ?? "",
      sendAbandonedCheckoutEmails:
        business.sendAbandonedCheckoutEmails ?? false,
      timeZone: business.timeZone ?? "America/Detroit",
    },
  });

  const [watchedStreet, watchedCity, watchedState, watchedPostalCode] =
    useWatch({
      control: form.control,
      name: [
        "addressStreet",
        "addressCity",
        "addressState",
        "addressPostalCode",
      ],
    });
  const addressPreview = formatBusinessAddress({
    street: watchedStreet,
    city: watchedCity,
    state: watchedState,
    postalCode: watchedPostalCode,
  });

  //Mutations
  const updateGeneralMutation = api.business.updateGeneral.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      handleReset({
        name: data.business.name,
        ownerEmail: data.business.ownerEmail,
        supportEmail: data.business.supportEmail ?? "",
        phoneNumber: data.business.phoneNumber ?? "",
        ...addressDefaults(data.business),
        slug: data.business.slug,
        sendAbandonedCheckoutEmails:
          data.business.sendAbandonedCheckoutEmails ?? false,
        timeZone: data.business.timeZone ?? "America/Detroit",
      });
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update general settings");
    },
    onMutate: () => toast.loading("Updating general settings..."),
  });

  //Handlers
  const handleSubmit = async (data: GeneralBusinessFormSchema) => {
    updateGeneralMutation.mutate({
      name: data.name,
      ownerEmail: data.ownerEmail,
      supportEmail: data.supportEmail ?? undefined,
      addressStreet: firstNonBlank(data.addressStreet),
      addressCity: firstNonBlank(data.addressCity),
      addressState: firstNonBlank(data.addressState),
      addressPostalCode: firstNonBlank(data.addressPostalCode),
      phoneNumber: data.phoneNumber ?? undefined,
      sendAbandonedCheckoutEmails: data.sendAbandonedCheckoutEmails,
      timeZone: data.timeZone,
    });
  };

  const handleReset = (data?: GeneralBusinessFormSchema) => {
    form.reset(
      data ?? {
        name: business.name,
        ownerEmail: business.ownerEmail,
        supportEmail: business.supportEmail ?? undefined,
        phoneNumber: business.phoneNumber ?? undefined,
        ...addressDefaults(business),
        sendAbandonedCheckoutEmails:
          business.sendAbandonedCheckoutEmails ?? false,
        timeZone: business.timeZone ?? "America/Detroit",
      },
    );
  };

  // Checks and Hooks
  const isSubmitting = updateGeneralMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="bg-muted min-h-screen"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/settings">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">General Settings</h1>

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
              onClick={() => handleReset()}
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
        <div className="admin-container">
          <div className="space-y-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle>Business Information</CardTitle>
                <CardDescription>
                  Basic information about your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputFormField
                  form={form}
                  name="name"
                  label="Business Name"
                  description="The name of your business"
                  placeholder="My Awesome Store"
                  required
                />

                <InputFormField
                  form={form}
                  name="slug"
                  label="Store Slug"
                  description="Your unique store identifier (cannot be changed)"
                  required
                  disabled
                />

                <FormField
                  control={form.control}
                  name="timeZone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Time Zone</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {COMMON_TIME_ZONES.map((tz) => (
                            <SelectItem key={tz.value} value={tz.value}>
                              {tz.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Used when showing event dates and times to you and your
                        shoppers. Pick the zone your shop actually operates in —
                        this also applies to the hours shown on{" "}
                        <Link
                          href="/admin/settings/hours"
                          className="underline underline-offset-2"
                        >
                          Business Hours
                        </Link>
                        .
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Contact Details */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
                <CardDescription>
                  Email addresses and phone number for your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputFormField
                  form={form}
                  name="ownerEmail"
                  label="Owner Email"
                  placeholder="owner@example.com"
                  description="Primary contact email for the business. Used for notifications and account management. This is not a public facing email."
                  required
                />
                <InputFormField
                  form={form}
                  name="supportEmail"
                  label="Support Email"
                  description="Public customer support email address. Shown on your storefront."
                  placeholder="support@example.com"
                  type="email"
                  required
                />
                <InputFormField
                  form={form}
                  name="phoneNumber"
                  label="Phone Number"
                  description="Public business phone number. Shown on your storefront."
                  type="tel"
                  placeholder="123-456-7890"
                />
              </CardContent>
            </Card>

            {/* Business Address */}
            <Card>
              <CardHeader>
                <CardTitle>Business Address</CardTitle>
                <CardDescription>
                  Split out so search engines can show your location. Your
                  storefront displays it as one line.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <InputFormField
                    form={form}
                    name="addressStreet"
                    label="Street Address"
                    placeholder="123 Main St"
                  />
                  <InputFormField
                    form={form}
                    name="addressCity"
                    label="City"
                    placeholder="Detroit"
                    className="sm:col-span-1"
                  />
                  <InputFormField
                    form={form}
                    name="addressState"
                    label="State"
                    placeholder="MI"
                    className="sm:col-span-1"
                  />
                  <InputFormField
                    form={form}
                    name="addressPostalCode"
                    label="ZIP"
                    placeholder="48201"
                    className="sm:col-span-1"
                  />
                </div>
                <p className="text-muted-foreground text-sm">
                  Shown on your site as:{" "}
                  <span className="text-foreground font-medium">
                    {addressPreview || "—"}
                  </span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
