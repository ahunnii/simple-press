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
      ...business,
      supportEmail: business.supportEmail ?? undefined,
      businessAddress: business.businessAddress ?? undefined,
      taxId: business.taxId ?? undefined,
    },
  });

  //Mutations
  const updateGeneralMutation = api.business.updateGeneral.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
      form.reset({
        ...data.business,
        supportEmail: data.business.supportEmail ?? undefined,
        businessAddress: data.business.businessAddress ?? undefined,
        taxId: data.business.taxId ?? undefined,
      });
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update general settings");
    },
    onMutate: () => {
      toast.loading("Updating general settings...");
    },
    onSettled: () => {
      router.refresh();
    },
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

  const handleReset = () => {
    form.reset({
      ...business,
      supportEmail: business.supportEmail ?? undefined,
      businessAddress: business.businessAddress ?? undefined,
      taxId: business.taxId ?? undefined,
    });
  };

  // Checks and Hooks
  const isSaving = updateGeneralMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, handleSubmit);

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
              disabled={isSaving || !isDirty}
              onClick={handleReset}
              className="hidden md:inline-flex"
            >
              Reset
            </Button>

            <Button type="submit" size="sm" disabled={isSaving}>
              {isSaving ? (
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
                  label="Owner Email"
                  description="Primary contact email for the business owner"
                  required
                />

                <InputFormField
                  form={form}
                  name="supportEmail"
                  label="Support Email"
                  description="Customer support email address"
                />
              </CardContent>
            </Card>

            {/* Legal Information */}
            <Card>
              <CardHeader>
                <CardTitle>Legal Information</CardTitle>
                <CardDescription>
                  Business address and tax information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <TextareaFormField
                  form={form}
                  name="businessAddress"
                  label="Business Address"
                  description="Full business address for legal purposes"
                />

                <InputFormField
                  form={form}
                  name="taxId"
                  label="Tax ID / EIN"
                  description="Your business tax identification number"
                  required
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
