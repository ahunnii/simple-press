"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
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
    logoAltText: string | null;
    faviconUrl: string | null;
    footerText: string | null;
    socialLinks: unknown;
    primaryColor: string | null;
  };
};

/** Fallback for the color picker when no primary color has been saved yet. */
const DEFAULT_PRIMARY_COLOR = "#000000";

/**
 * `<input type="color">` needs a concrete value; a store that has never saved a
 * color has `null`/`""`. Display-only — the empty value is left alone on save
 * so the templates' own fallbacks keep working.
 */
const colorInputValue = (value: string | null | undefined) =>
  value === null || value === undefined || value === ""
    ? DEFAULT_PRIMARY_COLOR
    : value;

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
        pinterest?: string;
        youtube?: string;
      }
    | undefined) ?? {
    instagram: "",
    facebook: "",
    twitter: "",
    linkedin: "",
    pinterest: "",
    tiktok: "",
    youtube: "",
  };

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const logoFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);

  const availableTemplates = getAvailableTemplates(business?.subdomain ?? "");

  // Form Setup
  const form = useForm<BrandingFormSchema>({
    resolver: zodResolver(brandingFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      footerText: siteContent.footerText ?? "",
      socialLinks: {
        instagram: socialLinks.instagram ?? "",
        facebook: socialLinks.facebook ?? "",
        twitter: socialLinks.twitter ?? "",
        linkedin: socialLinks.linkedin ?? "",
        tiktok: socialLinks.tiktok ?? "",
        pinterest: socialLinks.pinterest ?? "",
        youtube: socialLinks.youtube ?? "",
      },
      logoUrl: siteContent.logoUrl ?? undefined,
      logoFile: null,
      logoAltText: siteContent.logoAltText ?? "",
      primaryColor: siteContent?.primaryColor ?? "",
      templateId: business?.templateId ?? "",
      faviconUrl: siteContent.faviconUrl ?? undefined,
      faviconFile: null,
    },
  });

  // Mutations
  // A template switch is NOT part of the site-content save: commercial
  // templates are ownership-gated per subdomain and only
  // `business.updateTemplate` re-validates that server-side (it throws
  // FORBIDDEN for a template this store doesn't own). Both calls are driven
  // from `handleSubmit` so the page shows one loading state and one toast.
  const updateSiteContent = api.content.updateSiteContent.useMutation();
  const updateTemplate = api.business.updateTemplate.useMutation();

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
      logoAltText: siteContent.logoAltText ?? "",
      primaryColor: siteContent?.primaryColor ?? "",
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
          (response.file.objectInfo.metadata?.pathName as string | undefined) ??
          "";

        if (fileLocation) faviconUrl = fileLocation;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    const nextTemplateId = data.templateId;
    const templateChanged = nextTemplateId !== business.templateId;

    // A color picker can never produce an empty value, so an empty one means
    // this store never set a color — omit it rather than writing "" over the
    // null the templates fall back from.
    const primaryColor =
      data.primaryColor === null || data.primaryColor === ""
        ? undefined
        : data.primaryColor;

    toast.loading("Updating brand identity...");

    try {
      // Template first: if this store isn't allowed the selected template the
      // server throws FORBIDDEN and nothing else is written.
      if (templateChanged) {
        await updateTemplate.mutateAsync({ templateId: nextTemplateId });
      }

      const { data: saved } = await updateSiteContent.mutateAsync({
        footerText: data.footerText ?? "",
        socialLinks: data.socialLinks ?? {},
        logoUrl,
        logoAltText: data.logoAltText ?? "",
        primaryColor,
        faviconUrl,
      });

      const newSocialLinks = (saved.socialLinks as
        | {
            instagram?: string;
            facebook?: string;
            twitter?: string;
            linkedin?: string;
            tiktok?: string;
            pinterest?: string;
            youtube?: string;
          }
        | undefined) ?? {
        instagram: "",
        facebook: "",
        twitter: "",
        linkedin: "",
        pinterest: "",
        tiktok: "",
        youtube: "",
      };

      form.reset({
        footerText: saved.footerText ?? "",
        socialLinks: newSocialLinks,
        logoUrl: saved.logoUrl ?? null,
        logoFile: null,
        logoAltText: saved.logoAltText ?? "",
        primaryColor: saved?.primaryColor ?? "",
        templateId: nextTemplateId,
        faviconUrl: saved.faviconUrl ?? null,
        faviconFile: null,
      });

      toast.dismiss();
      toast.success("Branding updated successfully");
      void utils.business.invalidate();
      router.refresh();
    } catch (error) {
      toast.dismiss();
      toast.error(
        error instanceof Error && error.message
          ? error.message
          : "Failed to update brand identity",
      );
    }
  };

  // Checks and Hooks
  const isSubmitting =
    updateTemplate.isPending ||
    updateSiteContent.isPending ||
    logoUploader.isPending ||
    faviconUploader.isPending;
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
              <Link href="/admin/content">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">Brand & Appearance</h1>

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

                <FormField
                  control={form.control}
                  name="primaryColor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Checkout accent color</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-3">
                          <Input
                            type="color"
                            value={colorInputValue(field.value)}
                            onChange={(e) => field.onChange(e.target.value)}
                            disabled={isSubmitting}
                            className="h-9 w-14 cursor-pointer px-1 py-1"
                            aria-label="Checkout accent color picker"
                          />
                          <span className="text-muted-foreground font-mono text-sm">
                            {colorInputValue(field.value)}
                          </span>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Shown on checkout and cart buttons on supported
                        templates.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="bg-muted/50 flex items-center rounded-lg border px-4 py-3 text-sm">
                  <Link
                    href="/editor"
                    className="text-primary inline-flex items-center gap-1.5 font-medium underline-offset-2 hover:underline"
                  >
                    Edit sections, colors and fonts in the Site Editor
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
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
                {/* items-start: logo/favicon previews render at different
                    heights depending on whether an existing image is set for
                    each, so the two `FormItem`s aren't guaranteed equal
                    height — without it, stretch inflates the shorter one's
                    label row. */}
                <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                  <div className="col-span-1 space-y-4">
                    <ImageUploadFormField
                      form={form}
                      name="logoFile"
                      label="Logo"
                      description="Your logo will be displayed in key places across your storefront.  Defaults to your store's name if no logo is uploaded."
                      disabled={isSubmitting}
                      existingPreviewUrl={siteContent?.logoUrl ?? undefined}
                      inputRef={logoFileInputRef}
                    />
                    <InputFormField
                      form={form}
                      name="logoAltText"
                      label="Logo alt text"
                      placeholder="Your business name"
                      disabled={isSubmitting}
                      description="Describes your logo for screen readers and for search engines when the image can't load. Usually just your business name."
                    />
                  </div>
                  <ImageUploadFormField
                    form={form}
                    name="faviconFile"
                    label="Favicon"
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
                <CardTitle>Footer & social links</CardTitle>
                <CardDescription>
                  Promote your socials as well as add a footer tagline.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <TextareaFormField
                  form={form}
                  name="footerText"
                  label="Footer tagline"
                  placeholder="We are here for you. Contact us for any questions or concerns."
                  rows={2}
                  description="This tagline will be displayed in the footer of your storefront. Acts like a mission statement or blurb about your business."
                />

                <div>
                  <div className="space-y-2 pb-4">
                    <Label className="block">Social Links</Label>
                    <p className="text-muted-foreground text-sm">
                      Want to promote your social media accounts? Add your
                      social media links here and they will be displayed in the
                      footer.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
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
                    <InputFormField
                      form={form}
                      name="socialLinks.pinterest"
                      label="Pinterest"
                      placeholder="https://pinterest.com/yourstore"
                      type="url"
                      disabled={isSubmitting}
                      className="col-span-1"
                    />
                    <InputFormField
                      form={form}
                      name="socialLinks.youtube"
                      label="YouTube"
                      placeholder="https://youtube.com/@yourchannel"
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
