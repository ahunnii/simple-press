"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { BrandingFormSchema } from "~/lib/validators/homepage";
import { getAvailableTemplates } from "~/lib/template-ownership";
import { cn } from "~/lib/utils";
import { brandingFormSchema } from "~/lib/validators/homepage";
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
import { Label } from "~/components/ui/label";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  business: {
    id: string;
    templateId: string;
    subdomain: string;
  };
  siteContent: {
    id: string;
    logoUrl: string | null;
    faviconUrl: string | null;
    footerText: string | null;
    socialLinks: unknown;
    primaryColor: string | null;
    secondaryColor: string | null;
    accentColor: string | null;
  };
};

export function BrandingEditor({ business, siteContent }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const socialLinks = (siteContent.socialLinks as
    | {
        instagram?: string;
        facebook?: string;
        twitter?: string;
        linkedin?: string;
        tiktok?: string;
      }
    | undefined) ?? {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
  };

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);

  const availableTemplates = getAvailableTemplates(business?.subdomain ?? "");

  // Form Setup
  const form = useForm<BrandingFormSchema>({
    resolver: zodResolver(brandingFormSchema),
    defaultValues: {
      footerText: siteContent.footerText ?? "",
      socialLinks: {
        instagram: socialLinks.instagram ?? "",
        facebook: socialLinks.facebook ?? "",
        twitter: socialLinks.twitter ?? "",
        linkedin: socialLinks.linkedin ?? "",
        tiktok: socialLinks.tiktok ?? "",
      },
      logoUrl: siteContent.logoUrl ?? undefined,
      logoFile: null,
      primaryColor: siteContent?.primaryColor ?? "",
      secondaryColor: siteContent?.secondaryColor ?? "",
      accentColor: siteContent?.accentColor ?? "",
      templateId: business?.templateId ?? "",
      faviconUrl: siteContent.faviconUrl ?? undefined,
      faviconFile: null,
    },
  });

  // Mutations
  const updateSiteContent = api.content.updateSiteContent.useMutation({
    onSuccess: ({ data, templateId }) => {
      toast.dismiss();
      toast.success("Branding updated successfully");

      const newSocialLinks = (data.socialLinks as
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

      form.reset({
        footerText: data.footerText ?? "",
        socialLinks: newSocialLinks,
        logoUrl: data.logoUrl ?? null,
        logoFile: null,
        primaryColor: data?.primaryColor ?? "",
        secondaryColor: data?.secondaryColor ?? "",
        accentColor: data?.accentColor ?? "",
        templateId: templateId ?? "",
        faviconUrl: data.faviconUrl ?? null,
        faviconFile: null,
      });
      void utils.business.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update general settings");
    },
    onMutate: () => {
      toast.loading("Updating general settings...");
    },
  });

  // Image Uploads
  const logoUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Logo upload failed.");
    },
  });

  const faviconUploader = useUploadFile({
    api: "/api/upload",
    route: "favicon",
    onError: (error) => {
      toast.error(error.message ?? "Favicon upload failed.");
    },
  });

  // Handlers
  const handleReset = () => {
    form.reset({
      footerText: siteContent.footerText ?? "",
      socialLinks: socialLinks,
      logoUrl: siteContent.logoUrl ?? "",
      primaryColor: siteContent?.primaryColor ?? "",
      secondaryColor: siteContent?.secondaryColor ?? "",
      accentColor: siteContent?.accentColor ?? "",
      templateId: business?.templateId ?? "",
      faviconUrl: siteContent.faviconUrl ?? "",
      faviconFile: null,
      logoFile: null,
    });

    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
    if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
  };

  const handleSubmit = async (data: BrandingFormSchema) => {
    let logoUrl: string | undefined = data.logoUrl ?? undefined;
    let faviconUrl: string | undefined = data.faviconUrl ?? undefined;

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

    const tempFaviconFile = data.faviconFile;
    if (tempFaviconFile instanceof File) {
      try {
        const response = await faviconUploader.upload(tempFaviconFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";

        if (fileLocation) faviconUrl = fileLocation;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    updateSiteContent.mutate({
      templateId: data.templateId,
      footerText: data.footerText ?? "",
      socialLinks: data.socialLinks ?? {},
      logoUrl,
      primaryColor: data.primaryColor ?? "",
      secondaryColor: data.secondaryColor ?? "",
      accentColor: data.accentColor ?? "",
      faviconUrl,
    });
  };

  // Checks and Hooks
  const isSubmitting = updateSiteContent.isPending || logoUploader.isPending;
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
              <Link href="/admin/content">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Edit Brand Identity</h1>

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
                <CardTitle>Site Visuals</CardTitle>
                <CardDescription>
                  How does your site look to people?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <SelectFormField
                  form={form}
                  name="templateId"
                  label="Select a template"
                  description="A template changes the overall look and feel of your storefront."
                  values={availableTemplates}
                  required
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Business Branding</CardTitle>
                <CardDescription>
                  Add your business branding here.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <ImageUploadFormField
                    form={form}
                    name="logoFile"
                    label="Upload your store's logo"
                    description="Your logo will be displayed in key places across your storefront.  Defaults to your store's name if no logo is uploaded."
                    disabled={isSubmitting}
                    existingPreviewUrl={siteContent?.logoUrl ?? undefined}
                    inputRef={logoFileInputRef}
                    className="col-span-1"
                  />
                  <ImageUploadFormField
                    form={form}
                    name="faviconFile"
                    label="Upload your store's favicon"
                    description="The small icon shown in browser tabs. Recommended: 32x32px or 16x16px .ico or .png. Defaults to SimplePress's favicon if no favicon is uploaded."
                    existingPreviewUrl={siteContent.faviconUrl ?? undefined}
                    inputRef={faviconFileInputRef}
                    className="col-span-1"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Socials and Footer</CardTitle>
                <CardDescription>
                  Promote your socials as well as add a footer tagline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TextareaFormField
                  form={form}
                  name="footerText"
                  label="Add a footer tagline"
                  placeholder="We are here for you. Contact us for any questions or concerns."
                  rows={2}
                  description="This tagline will be displayed in the footer of your storefront. Acts like a mission statement or blurb about your business."
                />

                <div>
                  <div className="space-y-2 pb-4">
                    <Label className="block">Social Links</Label>
                    <p className="text-sm text-gray-500">
                      Want to promote your social media accounts? Add your
                      social media links here and they will be displayed in the
                      footer.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <InputFormField
                      form={form}
                      name="socialLinks.instagram"
                      label="Instagram"
                      placeholder="https://instagram.com/yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.facebook"
                      label="Facebook"
                      placeholder="https://facebook.com/yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.twitter"
                      label="Twitter / X"
                      placeholder="https://twitter.com/yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.linkedin"
                      label="LinkedIn"
                      placeholder="https://linkedin.com/company/yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.tiktok"
                      label="TikTok"
                      placeholder="https://tiktok.com/@yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
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
