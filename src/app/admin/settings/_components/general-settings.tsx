"use client";

import type { Business, SiteContent } from "generated/prisma";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GeneralBusinessFormSchema } from "~/lib/validators/general-business";
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

type GeneralSettingsProps = {
  business: Business & { siteContent?: SiteContent | null };
};

export function GeneralSettings({ business }: GeneralSettingsProps) {
  const router = useRouter();

  // Form refs
  const formRef = useRef<HTMLFormElement>(null);

  const form = useForm<GeneralBusinessFormSchema>({
    resolver: zodResolver(generalBusinessFormSchema),
    defaultValues: {
      ...business,
      supportEmail: business.supportEmail ?? undefined,
      businessAddress: business.businessAddress ?? undefined,
      taxId: business.taxId ?? undefined,
    },
  });

  const updateGeneralMutation = api.business.updateGeneral.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success(data.message);
    },
    onError: (error) => {
      toast.error(error.message ?? "Failed to update branding");
    },
    onMutate: () => {
      toast.loading("Updating branding...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

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

  // Checks
  const isSubmitting = updateGeneralMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, handleSubmit);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="space-y-6"
      >
        <div className="border-border/30 sticky top-0 z-10 -mx-4 -mt-4 flex w-[calc(100%+2rem)] justify-center border-b px-4 py-3 transition-all duration-300 md:-mx-6 md:w-[calc(100%+3rem)] md:px-6">
          <div
            className={`flex w-[90%] items-center justify-between gap-2 rounded-full border px-4 py-3 shadow-sm backdrop-blur transition-all duration-300 ${
              isDirty
                ? "bg-background/95 supports-backdrop-filter:bg-background/80 border-amber-200 shadow-md dark:border-amber-800"
                : "border-border/50 bg-background/60 supports-backdrop-filter:bg-background/50"
            }`}
          >
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/dashboard">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={handleReset}
              >
                Reset
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="border-background border-t-foreground mr-2 h-4 w-4 animate-spin rounded-full border-2" />
                    Saving...
                  </>
                ) : (
                  "Update general settings"
                )}
              </Button>
            </div>
          </div>
        </div>
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

            {/* <Label htmlFor="slug">Store Slug</Label>
              <Input
                id="slug"
                value={business.slug}
                disabled
                className="bg-gray-50"
              />
              <p className="mt-1 text-sm text-gray-500">
                Your unique store identifier (cannot be changed)
              </p>
            </div> */}
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>Email addresses for your business</CardDescription>
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
      </form>
    </Form>
  );
}
