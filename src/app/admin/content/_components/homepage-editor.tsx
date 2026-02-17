"use client";

import { Fragment, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { HomepageFormSchema } from "~/lib/validators/homepage";
import { cn } from "~/lib/utils";
import { homepageFormSchema } from "~/lib/validators/homepage";
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
import { Form, FormField } from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  business: {
    id: string;
    name: string;
    subdomain: string;
    customDomain: string | null;
    templateId: string;
  };
  siteContent: {
    id: string;
    logoUrl: string | null;
    heroTitle: string | null;
    heroSubtitle: string | null;
    heroImageUrl: string | null;
    heroButtonText: string | null;
    heroButtonLink: string | null;
    aboutTitle: string | null;
    aboutText: string | null;
    aboutImageUrl: string | null;
    features: unknown;
    footerText: string | null;
    socialLinks: unknown;
    primaryColor: string | null;
  };
};

export function HomepageEditor({ business, siteContent }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);

  const socialLinks = (siteContent.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        linkedin?: string;
      }
    | undefined) ?? {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  };

  const form = useForm<HomepageFormSchema>({
    resolver: zodResolver(homepageFormSchema),
    defaultValues: {
      footerText: siteContent.footerText ?? "",
      socialLinks: {
        instagram: socialLinks.instagram ?? "",
        facebook: socialLinks.facebook ?? "",
        twitter: socialLinks.twitter ?? "",
        linkedin: socialLinks.linkedin ?? "",
      },
      logoUrl: siteContent.logoUrl ?? "",
      logoFile: null,
      primaryColor: siteContent?.primaryColor ?? "",
      templateId: business?.templateId ?? "",
    },
  });

  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("General settings updated successfully");
      handleReset();
    },
    onError: (error) => {
      handleReset();
      toast.error(error.message ?? "Failed to update general settings");
    },
    onMutate: () => {
      toast.loading("Updating general settings...");
    },
    onSettled: () => {
      router.refresh();
    },
  });

  const logoUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Logo upload failed.");
    },
  });

  const onSubmit = async (data: HomepageFormSchema) => {
    let logoUrl: string | undefined = data.logoUrl ?? undefined;

    const logoFile = data.logoFile;
    if (logoFile instanceof File) {
      try {
        const response = await logoUploader.upload(logoFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) logoUrl = fileLocation;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    updateSiteContent.mutate({
      businessId: business.id,
      data: {
        templateId: data.templateId,
        footerText: data.footerText ?? "",
        socialLinks: data.socialLinks ?? {},
        logoUrl,
        primaryColor: data.primaryColor ?? "",
      },
    });
  };

  const isSubmitting = updateSiteContent.isPending || logoUploader.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  const handleReset = () => {
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";

    form.reset({
      footerText: siteContent.footerText ?? "",
      socialLinks: socialLinks,
      logoUrl: siteContent.logoUrl ?? "",
      primaryColor: siteContent?.primaryColor ?? "",
    });
  };

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="min-h-screen bg-gray-50"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/content">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Branding</h1>

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
              onClick={handleReset}
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

        {/* Content Tabs */}
        <div className="admin-container">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Visuals</CardTitle>
                <CardDescription>
                  How does your site look to people? Upload a logo and choose a
                  template.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SelectFormField
                  form={form}
                  name="templateId"
                  label="Template"
                  description="Choose the design template for your storefront"
                  values={[
                    { value: "default", label: "Default" },
                    { value: "modern", label: "Modern" },
                    { value: "vintage", label: "Vintage" },
                    { value: "minimal", label: "Minimal" },
                    { value: "elegant", label: "Elegant" },
                    { value: "dark-trend", label: "Dark Trend" },
                    { value: "pollen", label: "Pollen" },
                  ]}
                />

                <ImageUploadFormField
                  form={form}
                  name="logoFile"
                  label="Logo image"
                  description="Upload your store logo image here!"
                  disabled={isSubmitting}
                  existingPreviewUrl={siteContent?.logoUrl ?? undefined}
                  inputRef={logoFileInputRef}
                />

                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <>
                      <Label htmlFor="primaryColor">Primary Color (WIP)</Label>
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
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Footer</CardTitle>
                <CardDescription>
                  Footer text and social media links
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TextareaFormField
                  form={form}
                  name="footerText"
                  label="Footer Text"
                  placeholder="© 2024 Your Store. All rights reserved."
                  rows={3}
                />

                <div>
                  <Label className="mb-4 block">Social Links</Label>
                  <div className="space-y-3">
                    <InputFormField
                      form={form}
                      name="socialLinks.instagram"
                      label="Instagram"
                      placeholder="https://instagram.com/yourstore"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.facebook"
                      label="Facebook"
                      placeholder="https://facebook.com/yourstore"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.twitter"
                      label="Twitter / X"
                      placeholder="https://twitter.com/yourstore"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.linkedin"
                      label="LinkedIn"
                      placeholder="https://linkedin.com/company/yourstore"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </Form>
  );
}
