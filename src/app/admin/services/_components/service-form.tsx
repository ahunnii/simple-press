"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { TriangleAlert } from "lucide-react";

import type { serviceFormSchema } from "~/lib/validators/services";
import type { RouterOutputs } from "~/trpc/react";
import { firstNonBlank, preferNonBlank } from "~/lib/seo/blank";
import { renderSeoTitle, resolveSeoBrand } from "~/lib/seo/title";
import { getServiceTemplatesForStorefront } from "~/lib/service-templates";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useSiteHost } from "~/hooks/use-site-host";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { FormField } from "~/components/ui/form";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { OgImageUploader } from "~/components/inputs/og-image-uploader";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import {
  SearchResultPreview,
  SocialPreviewCard,
} from "~/components/admin/seo-previews";

/** The record shape handed down by the edit page. */
export type ServiceRecord = RouterOutputs["services"]["getById"];

/**
 * Form values for the Details + SEO tabs. The form itself is owned by
 * `ServiceEditor` — these components are presentational bodies that receive it.
 */
export type ServiceFormValues = z.input<typeof serviceFormSchema>;

type Props = {
  /** RHF form created and submitted by `ServiceEditor`. */
  form: UseFormReturn<ServiceFormValues>;
  /** Pass a service when in edit mode; omit for create mode. */
  service?: ServiceRecord;
  /**
   * The current business's storefront templateId (e.g. "pollen", "vii",
   * "modern"). Controls which service-page templates are shown in the picker.
   */
  storefrontTemplateId: string;
  /**
   * Fires on every keystroke in the name field. `ServiceEditor` owns the
   * auto-sync decision (see `slugAutoSyncs` there) — this component never
   * writes the slug itself.
   */
  onNameChange: (value: string) => void;
  /**
   * True when the slug is frozen (a published service) and the name has
   * drifted away from it. Swaps the URL hint for the amber rename callout.
   */
  showRenameWarning: boolean;
  /** Re-sync the slug from the current name and jump to the SEO tab. */
  onUpdateUrl: () => void;
  /** Jump to the SEO tab without touching the slug. */
  onEditSeo: () => void;
  /**
   * Shared with `ServiceEditor` so Reset can clear the native file input —
   * otherwise re-picking the same file fires no change event.
   */
  imageFileInputRef?: React.RefObject<HTMLInputElement | null>;
  disabled?: boolean;
};

/** Body of the "Details" tab — everything except the SEO card. */
export function ServiceForm({
  form,
  service,
  storefrontTemplateId,
  onNameChange,
  showRenameWarning,
  onUpdateUrl,
  onEditSeo,
  imageFileInputRef,
  disabled,
}: Props) {
  const serviceTemplateDefs =
    getServiceTemplatesForStorefront(storefrontTemplateId);

  const watchedSlug = form.watch("slug") ?? "";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {/* Left column */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Service name, description, and cover image
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputFormField
              form={form}
              name="name"
              label="Service name"
              placeholder="e.g. Facial Treatments"
              onChangeAdditional={onNameChange}
              required
              disabled={disabled}
            />

            {/*
              URL hint. Once the service is live its slug is frozen, so a
              rename no longer drags the public URL along with it — say so
              loudly and make re-syncing an explicit choice.
            */}
            {showRenameWarning ? (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-medium">
                    Name changed — the URL hasn&apos;t.
                  </p>
                  <p className="text-amber-700">
                    This service is still at{" "}
                    <span className="font-mono">/services/{watchedSlug}</span>.
                    Updating the URL to match will 404 old links, bookmarks, and
                    search results. We don&apos;t create a redirect
                    automatically.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={onUpdateUrl}
                  >
                    Update URL
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
                <span>
                  Storefront URL:{" "}
                  <span className="font-mono">
                    /services/{watchedSlug || "your-service"}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={onEditSeo}
                >
                  Edit in SEO
                </Button>
              </div>
            )}

            <TextareaFormField
              form={form}
              name="description"
              label="Description"
              placeholder="Describe what this service group includes…"
              rows={4}
              disabled={disabled}
            />

            {/*
              Deferred upload: the picked File sits on the form until submit,
              so abandoning the page can't strand an object in S3 the way the
              old upload-on-pick widget did.
            */}
            <ImageUploadFormField
              form={form}
              name="imageFile"
              label="Cover image"
              description="Used as the service thumbnail on the /services index page"
              existingPreviewUrl={service?.image ?? undefined}
              inputRef={imageFileInputRef}
              disabled={disabled}
            />
          </CardContent>
        </Card>
      </div>

      {/* Right column */}
      <div className="space-y-4">
        {/* Service template picker */}
        <Card>
          <CardHeader>
            <CardTitle>Page Template</CardTitle>
            <CardDescription>
              Choose how this service&apos;s detail page is laid out
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="serviceTemplateId"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {serviceTemplateDefs.map((meta) => {
                    const isSelected = field.value === meta.id;
                    return (
                      <label
                        key={meta.id}
                        className={cn(
                          "flex cursor-pointer flex-col gap-1.5 rounded-lg border p-3 transition-colors",
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-border/80 hover:bg-muted",
                        )}
                      >
                        <input
                          type="radio"
                          name="serviceTemplateId"
                          value={meta.id}
                          checked={isSelected}
                          onChange={() => field.onChange(meta.id)}
                          className="sr-only"
                        />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            isSelected ? "text-primary" : "text-foreground",
                          )}
                        >
                          {meta.label}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {meta.description}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type SeoProps = {
  form: UseFormReturn<ServiceFormValues>;
  /** Pass a service when in edit mode; omit for create mode. */
  service?: ServiceRecord;
  /**
   * Handles a manual slug edit — `ServiceEditor` sanitizes the value and
   * records that auto-sync from the name should stop.
   */
  onSlugChange: (value: string) => void;
  ogImageFile: File | null;
  ogImageRemoved: boolean;
  ogImageFileInputRef: React.RefObject<HTMLInputElement | null>;
  onOgImageFileChange: (file: File) => void;
  onOgImageRemove: () => void;
  disabled?: boolean;
};

/**
 * Body of the "SEO" tab — URL slug, meta tags and Open Graph image on the
 * left, live search/social previews on the right.
 */
export function ServiceSeoFields({
  form,
  service,
  onSlugChange,
  ogImageFile,
  ogImageRemoved,
  ogImageFileInputRef,
  onOgImageFileChange,
  onOgImageRemove,
  disabled,
}: SeoProps) {
  const siteHost = useSiteHost();
  const { data: businessInfo } = api.business.simplifiedGet.useQuery();
  // The title-suffix brand — `seoBrandName` when the owner set one, else the
  // business name. Used to render the meta-title counter and preview the
  // same way the storefront `<title>` actually renders.
  const brand = resolveSeoBrand({
    name: businessInfo?.name ?? "",
    siteContent: businessInfo?.siteContent,
  });

  const watchedSlug = form.watch("slug") ?? "";

  // SEO preview values. Title is rendered through `renderSeoTitle`, exactly
  // as the storefront `<title>` will, including the " | brand" suffix.
  // Description is untouched by this pass — `||` is intentional there so a
  // cleared "" falls through to the next candidate.
  const seoPreviewTitle = renderSeoTitle(
    firstNonBlank(form.watch("metaTitle"), form.watch("name")) ??
      "Service Name",
    brand,
  );
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const seoPreviewDesc =
    form.watch("metaDescription") ||
    form.watch("description") ||
    "Your service description will appear here in search results.";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  // Description counter still mirrors the validator cap (200) rather than the
  // 160 display number — turning the copy red at a length the schema happily
  // accepts trained owners to ignore it. Title is different: it now measures
  // the RENDERED "title | brand" length against 60, the number that matches
  // what Google actually shows, since `renderSeoTitle` is what every
  // storefront `<title>` goes through.
  const metaTitleLength = renderSeoTitle(
    preferNonBlank(form.watch("metaTitle"), form.watch("name") ?? ""),
    brand,
  ).length;
  const metaDescriptionLength = form.watch("metaDescription")?.length ?? 0;

  const existingOgImage = ogImageRemoved
    ? undefined
    : (service?.ogImage ?? undefined);

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Meta Tags</CardTitle>
            <CardDescription>
              Override how this service appears in search engine results
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <InputFormField
              form={form}
              name="slug"
              label="URL Slug"
              placeholder="facial-treatments"
              onChange={onSlugChange}
              required
              disabled={disabled}
              description={`Used in the service URL: /services/${watchedSlug || "your-service"}`}
            />

            {service?.id && watchedSlug !== service.slug && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <div className="space-y-0.5">
                  <p className="font-medium">
                    Heads up — this will change the service&apos;s URL.
                  </p>
                  <p className="text-amber-700">
                    Saving will change the public URL from{" "}
                    <span className="font-mono">/services/{service.slug}</span>{" "}
                    to{" "}
                    <span className="font-mono">/services/{watchedSlug}</span>.
                    Anyone with the old link — including bookmarks and search
                    engines — will get a 404. We don&apos;t set up a redirect
                    automatically.
                  </p>
                </div>
              </div>
            )}

            <InputFormField
              form={form}
              name="metaTitle"
              label="Meta Title"
              placeholder={form.watch("name") || "e.g., Facial Treatments"}
              disabled={disabled}
              description={
                <span
                  className={
                    metaTitleLength > 60 ? "text-destructive" : undefined
                  }
                >
                  {metaTitleLength}/60 characters including &quot; | {brand}
                  &quot; — aim for 50–60. Leave blank to use the service name.
                </span>
              }
              descriptionClassName="text-xs text-muted-foreground"
            />

            <TextareaFormField
              form={form}
              name="metaDescription"
              label="Meta Description"
              placeholder={
                form.watch("description") ??
                "e.g., Professional facial treatments tailored to your skin."
              }
              rows={3}
              disabled={disabled}
              description={
                <span
                  className={
                    metaDescriptionLength > 200 ? "text-destructive" : undefined
                  }
                >
                  {metaDescriptionLength}/200 characters — aim for 150–160.
                  Leave blank to use the service description.
                </span>
              }
              descriptionClassName="text-xs text-muted-foreground"
            />

          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Open Graph Image</CardTitle>
            <CardDescription>
              The service photo is used when this is shared. Upload a different
              crop only if you want a 1200×630 share card instead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OgImageUploader
              file={ogImageFile}
              existingUrl={existingOgImage}
              fileInputRef={ogImageFileInputRef}
              onFileChange={onOgImageFileChange}
              onRemove={onOgImageRemove}
              disabled={disabled}
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Search Result Preview</CardTitle>
            <CardDescription>
              How this service might appear in Google
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchResultPreview
              host={siteHost}
              pathPrefix="/services"
              slug={watchedSlug || "service-slug"}
              title={seoPreviewTitle}
              description={seoPreviewDesc}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Social Media Preview</CardTitle>
            <CardDescription>
              How this service looks when shared on social platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SocialPreviewCard
              title={seoPreviewTitle}
              description={seoPreviewDesc}
              ogImageFile={ogImageFile}
              existingOgImage={existingOgImage}
              siteHost={siteHost}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
