"use client";

import type { SiteContent } from "generated/prisma";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GeneralBusinessFormSchema } from "~/lib/validators/general-business";
import type { RouterOutputs } from "~/trpc/react";
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
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  business: NonNullable<RouterOutputs["business"]["getWith"]> & {
    siteContent?: SiteContent | null;
  };
};

export function GeneralSettings({ business }: Props) {
  const router = useRouter();

  // Refs
  const formRef = useRef<HTMLFormElement>(null);

  // Form Setup
  const form = useForm<GeneralBusinessFormSchema>({
    resolver: zodResolver(generalBusinessFormSchema),
    defaultValues: {
      name: business.name ?? "",
      ownerEmail: business.ownerEmail ?? "",
      phoneNumber: business.phoneNumber ?? "",
      supportEmail: business.supportEmail ?? "",
      businessAddress: business.businessAddress ?? "",
      taxId: business.taxId ?? "",
      slug: business.slug ?? "",
    },
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
        businessAddress: data.business.businessAddress ?? "",
        taxId: data.business.taxId ?? "",
        phoneNumber: data.business.phoneNumber ?? "",
        slug: data.business.slug,
      });
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
      businessAddress: data.businessAddress ?? undefined,
      taxId: data.taxId ?? undefined,
    });
  };

  const handleReset = (data?: GeneralBusinessFormSchema) => {
    form.reset(
      data ?? {
        name: business.name,
        ownerEmail: business.ownerEmail,
        supportEmail: business.supportEmail ?? undefined,
        businessAddress: business.businessAddress ?? undefined,
        taxId: business.taxId ?? undefined,
        phoneNumber: business.phoneNumber ?? undefined,
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
        className="min-h-screen bg-gray-50"
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
                  label="Business Name *"
                  description="The name of your business"
                  placeholder="My Awesome Store"
                  required
                />

                <InputFormField
                  form={form}
                  name="slug"
                  label="Store Slug *"
                  description="Your unique store identifier (cannot be changed)"
                  required
                  disabled
                />
              </CardContent>
            </Card>

            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Email addresses for your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <InputFormField
                  form={form}
                  name="ownerEmail"
                  label="Owner Email *"
                  placeholder="owner@example.com"
                  description="Primary contact email for the business. Used for notifications and account management."
                  required
                />
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Public Information</CardTitle>
                <CardDescription>
                  Business address and other public information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TextareaFormField
                  form={form}
                  name="businessAddress"
                  label="Business Address"
                  description="Public business address. Customers will see this address on your storefront."
                  placeholder="123 Main St, Detroit, MI, USA"
                />
                <InputFormField
                  form={form}
                  name="supportEmail"
                  label="Support Email"
                  description="Public customer support email address. Customers will see this email address on your storefront."
                  placeholder="support@example.com"
                  type="email"
                />
                <InputFormField
                  form={form}
                  name="phoneNumber"
                  label="Phone Number"
                  description="Public business phone number. Customers will see this number on your storefront."
                  type="tel"
                  placeholder="123-456-7890"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
