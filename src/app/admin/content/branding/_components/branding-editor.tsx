"use client";

import type { ReactNode } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import type { SocialLinkKey } from "~/lib/social-links";
import type { BrandingFormSchema } from "~/lib/validators/homepage";
import { socialHostMismatch } from "~/lib/social-links";
import { getAvailableTemplates } from "~/lib/template-ownership";
import { getStoredPath } from "~/lib/uploads";
import { cn } from "~/lib/utils";
import { brandingFormSchema } from "~/lib/validators/homepage";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { useMediaLibraryEnabled } from "~/hooks/use-media-library-enabled";
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

import { FaviconPreview } from "./favicon-preview";

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

/**
 * The stored `SiteContent.socialLinks` JSON — one optional URL per
 * `SocialLinkKey`. `googleBusinessProfile` is SEO-only (never an icon).
 */
type StoredSocialLinks = Partial<Record<SocialLinkKey, string | null>>;

const SOCIAL_LINK_KEYS: SocialLinkKey[] = [
  "instagram",
  "threads",
  "facebook",
  "twitter",
  "linkedin",
  "tiktok",
  "pinterest",
  "youtube",
  "googleBusinessProfile",
];

/**
 * Normalizes the stored JSON (null, legacy rows with fewer keys) to a value
 * for every key, so each input is controlled from the first render and the
 * dirty check compares like with like.
 */
const toSocialLinkValues = (raw: unknown): Record<SocialLinkKey, string> => {
  const stored = (
    raw && typeof raw === "object" ? raw : {}
  ) as StoredSocialLinks;
  return Object.fromEntries(
    SOCIAL_LINK_KEYS.map((key) => [key, stored[key] ?? ""]),
  ) as Record<SocialLinkKey, string>;
};

/**
 * A social URL input with a soft "wrong network?" hint under it. The hint is
 * advisory only — it never blocks saving (a store can have a vanity domain).
 */
function SocialLinkField({
  form,
  linkKey,
  label,
  placeholder,
  description,
  disabled,
}: {
  form: UseFormReturn<BrandingFormSchema>;
  linkKey: SocialLinkKey;
  label: string;
  placeholder: string;
  description?: ReactNode;
  disabled: boolean;
}) {
  const name = `socialLinks.${linkKey}` as const;
  const value = useWatch({ control: form.control, name });
  const mismatch = socialHostMismatch(linkKey, value);

  return (
    <InputFormField
      form={form}
      name={name}
      label={label}
      placeholder={placeholder}
      type="url"
      disabled={disabled}
      className="col-span-1"
      description={
        description || mismatch ? (
          <>
            {description}
            {mismatch ? (
              <span
                role="status"
                className={cn(
                  "block font-medium text-amber-700 dark:text-amber-400",
                  description ? "mt-1" : undefined,
                )}
              >
                {mismatch} You can still save it.
              </span>
            ) : null}
          </>
        ) : undefined
      }
    />
  );
}

export function BrandingEditor({ business, siteContent }: Props) {
  const router = useRouter();
  const utils = api.useUtils();
  const mediaLibraryEnabled = useMediaLibraryEnabled();
  const socialLinks = toSocialLinkValues(siteContent.socialLinks);

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
      socialLinks,
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
    // Fixed-key route that also accepts SVG (the generic `image` route is
    // raster-only).
    route: "logo",
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
    // Remove clears `logoUrl` (null/""); send "" so it reaches the server when
    // a logo was stored, and omit it when the store never had one.
    let logoUrl: string | undefined =
      data.logoUrl === null || data.logoUrl === undefined || data.logoUrl === ""
        ? siteContent.logoUrl
          ? ""
          : undefined
        : data.logoUrl;
    // `handleReset` seeds this with "" for a store that has no favicon, and the
    // server schema accepts "" — so an empty value would write "" over the null
    // the platform favicon falls back from. Same treatment as `primaryColor`.
    //
    // The exception is a Remove on a store that HAD a favicon: the field's
    // Remove button clears `faviconUrl` to "", and that has to reach the server
    // (layout.tsx trims it, so "" falls back to the platform icon like null).
    let faviconUrl: string | undefined =
      data.faviconUrl === null || data.faviconUrl === ""
        ? siteContent.faviconUrl
          ? ""
          : undefined
        : data.faviconUrl;

    const logoFile = data.logoFile;
    if (logoFile instanceof File) {
      try {
        const response = await logoUploader.upload(logoFile);
        const fileLocation = getStoredPath(response.file);
        if (!fileLocation) {
          // Falling through would report success while silently saving nothing
          // — same guard as `src/lib/avatar-upload.ts:28-38`.
          toast.error("Logo upload succeeded but returned no URL");
          return;
        }
        // Same fixed-key caching problem as the favicon below: the `logo`
        // route writes `{businessId}/logo{ext}`, so a re-upload returns a
        // byte-identical URL. Safe: `normalizeUrl` (media usage) and
        // `rewriteUrl` (store transfer) strip the query first, and next/image
        // ignores it when detecting `.svg`.
        logoUrl = `${fileLocation}?v=${Date.now()}`;
      } catch {
        toast.error("Failed to upload logo.");
        return;
      }
    }

    const tempFaviconFile = data.faviconFile;
    if (tempFaviconFile instanceof File) {
      try {
        const response = await faviconUploader.upload(tempFaviconFile);
        const fileLocation = getStoredPath(response.file);
        if (!fileLocation) {
          toast.error("Favicon upload succeeded but returned no URL");
          return;
        }
        // The S3 key is fixed per business (`{businessId}/favicon{ext}`), so a
        // re-upload returns a byte-identical URL and browsers keep serving the
        // old icon — see `src/lib/avatar-upload.ts:40-44`. Safe: `normalizeUrl`
        // (media usage) and `rewriteUrl` (store transfer) strip the query first.
        faviconUrl = `${fileLocation}?v=${Date.now()}`;
      } catch {
        toast.error("Failed to upload favicon.");
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

      const newSocialLinks = toSocialLinkValues(saved.socialLinks);

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
                      mediaLibraryEnabled={mediaLibraryEnabled}
                      urlFieldName="logoUrl"
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
                  <div className="col-span-1 space-y-4">
                    <ImageUploadFormField
                      form={form}
                      name="faviconFile"
                      label="Favicon"
                      description="Square image, 512×512 or larger (PNG or SVG works best). We generate the browser-tab, Google and home-screen sizes for you. If left blank, your logo is used."
                      existingPreviewUrl={siteContent.faviconUrl ?? undefined}
                      inputRef={faviconFileInputRef}
                      mediaLibraryEnabled={mediaLibraryEnabled}
                      urlFieldName="faviconUrl"
                    />
                    <FaviconPreview form={form} />
                  </div>
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
                    <SocialLinkField
                      form={form}
                      linkKey="instagram"
                      label="Instagram"
                      placeholder="https://instagram.com/yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="threads"
                      label="Threads"
                      placeholder="https://threads.net/@yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="facebook"
                      label="Facebook"
                      placeholder="https://facebook.com/yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="twitter"
                      label="Twitter / X"
                      placeholder="https://twitter.com/yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="linkedin"
                      label="LinkedIn"
                      placeholder="https://linkedin.com/company/yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="tiktok"
                      label="TikTok"
                      placeholder="https://tiktok.com/@yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="pinterest"
                      label="Pinterest"
                      placeholder="https://pinterest.com/yourstore"
                      disabled={isSubmitting}
                    />
                    <SocialLinkField
                      form={form}
                      linkKey="youtube"
                      label="YouTube"
                      placeholder="https://youtube.com/@yourchannel"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                <div className="border-t pt-6">
                  <div className="space-y-2 pb-4">
                    <Label className="block">Google Business Profile</Label>
                    <p className="text-muted-foreground text-sm">
                      Have a Google Business Profile (the listing that shows on
                      Google Maps)? The most important step happens there: set
                      the profile&apos;s website to this site&apos;s address,
                      and use the same business name on both.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
                    <SocialLinkField
                      form={form}
                      linkKey="googleBusinessProfile"
                      label="Google Business Profile link"
                      placeholder="https://maps.google.com/?cid=…"
                      description="Optional. Paste your listing's link from Google Maps (the Share button works). It gives Google one more hint that this site and your profile belong together. It isn't shown on your site."
                      disabled={isSubmitting}
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
