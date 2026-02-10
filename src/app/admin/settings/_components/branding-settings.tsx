"use client";

import type { Business, SiteContent } from "generated/prisma";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFiles } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { BusinessBrandingFormSchema } from "~/lib/validators/branding";
import { businessBrandingFormSchema } from "~/lib/validators/branding";
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
import { Form, FormField } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type BrandingSettingsProps = {
  business: Business & { siteContent?: SiteContent | null };
};

export function BrandingSettings({ business }: BrandingSettingsProps) {
  const router = useRouter();

  const siteContent = business?.siteContent ?? null;

  // Form refs
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<BusinessBrandingFormSchema>({
    resolver: zodResolver(businessBrandingFormSchema),
    defaultValues: {
      ...business,
      siteContent: {
        ...siteContent,
        primaryColor: siteContent?.primaryColor ?? "#3b82f6",
      },
      logoFile: null,
      faviconFile: null,
    },
  });

  // Image uploads
  const logoUploader = useUploadFiles({
    api: "/api/upload",
    route: "logo",
    onError: (error) => {
      toast.error(error.message ?? "Logo upload failed.");
    },
  });

  const faviconUploader = useUploadFiles({
    api: "/api/upload",
    route: "favicon",
    onError: (error) => {
      toast.error(error.message ?? "Favicon upload failed.");
    },
  });

  // Operations
  const updateBrandingMutation = api.business.updateBranding.useMutation({
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

  const handleSubmit = async (data: BusinessBrandingFormSchema) => {
    let logoUrl: string | undefined = data?.siteContent?.logoUrl ?? undefined;
    let faviconUrl: string | undefined =
      data?.siteContent?.faviconUrl ?? undefined;

    const faviconFile = data.faviconFile;
    if (faviconFile instanceof File) {
      try {
        const { metadata } = await faviconUploader.upload([faviconFile]);
        const fileLocation = (metadata?.pathName as string | undefined) ?? "";
        if (fileLocation) faviconUrl = fileLocation;
      } catch {
        toast.error("Failed to upload favicon.");
        return;
      }
    }
    const logoFile = data.logoFile;
    if (logoFile instanceof File) {
      try {
        const { metadata } = await logoUploader.upload([logoFile]);
        const fileLocation = (metadata?.pathName as string | undefined) ?? "";
        if (fileLocation) logoUrl = fileLocation;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    updateBrandingMutation.mutate({
      templateId: data.templateId,
      siteContent: {
        heroTitle: data.siteContent?.heroTitle ?? undefined,
        heroSubtitle: data.siteContent?.heroSubtitle ?? undefined,
        aboutText: data.siteContent?.aboutText ?? undefined,
        primaryColor: data.siteContent?.primaryColor ?? undefined,
        logoUrl,
        faviconUrl,
        footerText: data.siteContent?.footerText ?? undefined,
      },
    });
  };

  const handleReset = () => {
    form.reset({ ...business, logoFile: null, faviconFile: null });
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
  };

  // Checks
  const isSubmitting =
    updateBrandingMutation.isPending ||
    logoUploader.isPending ||
    faviconUploader.isPending;

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
                    {logoUploader.isPending
                      ? "Uploading logo..."
                      : faviconUploader.isPending
                        ? "Uploading favicon..."
                        : "Saving..."}
                  </>
                ) : (
                  "Update business branding"
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Template */}
        <Card>
          <CardHeader>
            <CardTitle>Store Template</CardTitle>
            <CardDescription>
              Choose the design template for your storefront
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SelectFormField
              form={form}
              name="templateId"
              label="Template"
              description="Choose the design template for your storefront"
              values={[
                { value: "modern", label: "Modern" },
                { value: "vintage", label: "Vintage" },
                { value: "minimal", label: "Minimal" },
              ]}
            />
          </CardContent>
        </Card>

        {/* Colors & Logo */}
        <Card>
          <CardHeader>
            <CardTitle>Brand Identity</CardTitle>
            <CardDescription>
              Logo and color scheme for your store
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="siteContent.primaryColor"
              render={({ field }) => (
                <>
                  <Label htmlFor="primaryColor">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="h-10 w-20"
                    />
                    <Input
                      type="text"
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="#3b82f6"
                      className="flex-1"
                    />
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    Main color used for buttons and accents
                  </p>
                </>
              )}
            />

            <div>
              <ImageUploadFormField
                form={form}
                name="logoFile"
                label="Logo image"
                description="Upload your store logo image here!"
                disabled={isSubmitting}
                existingPreviewUrl={business.siteContent?.logoUrl ?? undefined}
                inputRef={logoFileInputRef}
              />
            </div>

            <div>
              <ImageUploadFormField
                form={form}
                name="faviconFile"
                label="Favicon image"
                description="Upload your store favicon image here!"
                disabled={isSubmitting}
                existingPreviewUrl={
                  business.siteContent?.faviconUrl ?? undefined
                }
                inputRef={faviconFileInputRef}
              />
            </div>
          </CardContent>
        </Card>

        {/* Homepage Content */}
        <Card>
          <CardHeader>
            <CardTitle>Homepage Content</CardTitle>
            <CardDescription>
              Hero section and about text for your homepage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputFormField
              form={form}
              name="siteContent.heroTitle"
              label="Hero Title"
              placeholder="Welcome to Our Store"
            />

            <InputFormField
              form={form}
              name="siteContent.heroSubtitle"
              label="Hero Subtitle"
              placeholder="Discover amazing products"
            />

            <TextareaFormField
              form={form}
              name="siteContent.aboutText"
              label="About Text"
              placeholder="Tell customers about your business..."
            />
          </CardContent>
        </Card>

        {/* Footer */}
        <Card>
          <CardHeader>
            <CardTitle>Footer</CardTitle>
            <CardDescription>Footer text for your store</CardDescription>
          </CardHeader>
          <CardContent>
            <TextareaFormField
              form={form}
              name="siteContent.footerText"
              label="Footer Text"
              placeholder="© 2024 Your Store. All rights reserved."
              rows={3}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
