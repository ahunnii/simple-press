"use client";

import type { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { BannerConfig, PopupConfig } from "~/lib/validators/site-banner";
import { cn } from "~/lib/utils";
import {
  updateBannerConfigSchema,
  updatePopupConfigSchema,
} from "~/lib/validators/site-banner";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
import { Separator } from "~/components/ui/separator";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerFormValues = z.infer<typeof updateBannerConfigSchema>;

/**
 * `imageFile` is form-local and never goes on the wire — it holds the picked
 * `File` until Save, so abandoning the page can't orphan an S3 object. The
 * persisted value stays `imagePath` (a string), which is what the mutation
 * takes and what the storefront reads.
 */
const popupFormSchema = updatePopupConfigSchema.extend({
  imageFile: z.instanceof(File).nullable().optional(),
});

type PopupFormValues = z.infer<typeof popupFormSchema>;

type Props = {
  banner: BannerConfig | null;
  popup: PopupConfig | null;
  bannersEnabled: boolean;
  popupsEnabled: boolean;
  /** Mirrors the `media` feature flag — gates the media-library picker. */
  mediaEnabled: boolean;
};

// ─── Default values ───────────────────────────────────────────────────────────

// Declared once so `defaultValues` and the toolbar's Reset can't drift apart.
function bannerDefaults(banner: BannerConfig | null): BannerFormValues {
  return {
    enabled: banner?.enabled ?? false,
    content: banner?.content ?? null,
    linkUrl: banner?.linkUrl ?? "",
    linkLabel: banner?.linkLabel ?? "",
    bgColor: banner?.bgColor ?? "#000000",
    textColor: banner?.textColor ?? "#ffffff",
  };
}

function popupDefaults(popup: PopupConfig | null): PopupFormValues {
  return {
    enabled: popup?.enabled ?? false,
    mode: popup?.mode ?? "image",
    heading: popup?.heading ?? "",
    imagePath: popup?.imagePath ?? "",
    imageAlt: popup?.imageAlt ?? "",
    content: popup?.content ?? null,
    ctaUrl: popup?.ctaUrl ?? "",
    ctaLabel: popup?.ctaLabel ?? "",
    imageFile: null,
  };
}

// ─── Banner card (presentational) ─────────────────────────────────────────────

function BannerForm({ form }: { form: UseFormReturn<BannerFormValues> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Announcement Banner</CardTitle>
        <CardDescription>
          A site-wide bar shown at the top of every storefront page. Visitors
          can dismiss it; it reappears when you save new content.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Enable toggle */}
            <SwitchFormField
              form={form}
              name="enabled"
              label="Show banner"
              description="Toggle the banner on or off without deleting its content."
            />

            <Separator />

            {/* Rich text content */}
            <MinimalTiptapFormField
              form={form}
              name="content"
              label="Banner message"
              description="Supports bold and underline. Keep it short — one or two sentences."
              output="json"
              placeholder="Announcing our summer sale — 20% off sitewide…"
              editorContentClassName="min-h-[100px] p-4"
            />

            {/* Link — `col-span-1` on both fields is load-bearing:
                `InputFormField` defaults its `FormItem` to `col-span-full`, so
                without it these two stack full-width and the 2-col grid does
                nothing. `items-start` because only `linkUrl` can raise a
                validation error, and a `FormMessage` under one cell would
                otherwise stretch the other and sink its label. */}
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <InputFormField
                form={form}
                name="linkUrl"
                label="Link URL"
                description="Optional. Where the link in the banner goes."
                placeholder="https://example.com/sale"
                type="url"
                className="col-span-1"
              />
              <InputFormField
                form={form}
                name="linkLabel"
                label="Link label"
                description="Text shown for the link."
                placeholder="Shop the sale"
                className="col-span-1"
              />
            </div>

            <Separator />

            {/* Colors */}
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bgColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          value={field.value ?? "#000000"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-9 w-14 cursor-pointer px-1 py-1"
                          aria-label="Background color picker"
                        />
                        <span className="text-muted-foreground font-mono text-sm">
                          {field.value ?? "#000000"}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>Banner background.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="textColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text color</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-3">
                        <Input
                          type="color"
                          value={field.value ?? "#ffffff"}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="h-9 w-14 cursor-pointer px-1 py-1"
                          aria-label="Text color picker"
                        />
                        <span className="text-muted-foreground font-mono text-sm">
                          {field.value ?? "#ffffff"}
                        </span>
                      </div>
                    </FormControl>
                    <FormDescription>
                      Banner text and link color.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Popup card (presentational) ──────────────────────────────────────────────

function PopupForm({
  form,
  existingImageUrl,
  mediaEnabled,
}: {
  form: UseFormReturn<PopupFormValues>;
  existingImageUrl: string | undefined;
  mediaEnabled: boolean;
}) {
  const mode = useWatch({ control: form.control, name: "mode" });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Homepage Popup</CardTitle>
        <CardDescription>
          A dismissible modal shown once per session on your homepage. Choose
          image mode for a visual promo or text mode for a richtext message.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <div className="space-y-6">
            {/* Enable toggle */}
            <SwitchFormField
              form={form}
              name="enabled"
              label="Show popup"
              description="Toggle the popup on or off without deleting its content."
            />

            <Separator />

            {/* Heading */}
            <InputFormField
              form={form}
              name="heading"
              label="Heading"
              description="Optional. Displayed at the top of the popup."
              placeholder="Welcome — exclusive offer inside"
            />

            {/* Mode */}
            <RadioFormField
              form={form}
              name="mode"
              label="Popup mode"
              radioGroupClassName="flex gap-6"
              options={[
                { value: "image", label: "Image" },
                { value: "text", label: "Rich text" },
              ]}
            />

            <Separator />

            {/* Image mode fields — the picked file is held in `imageFile` and
                only uploaded on Save, so leaving without saving writes nothing
                to S3. `imagePath` is the persisted companion field. */}
            {mode === "image" && (
              <div className="space-y-4">
                <ImageUploadFormField
                  form={form}
                  name="imageFile"
                  urlFieldName="imagePath"
                  mediaLibraryEnabled={mediaEnabled}
                  label="Popup image"
                  description="Recommended: 800×600 px or wider. Supports JPG, PNG, WebP."
                  existingPreviewUrl={existingImageUrl}
                />
                <InputFormField
                  form={form}
                  name="imageAlt"
                  label="Image alt text"
                  description="Describe the image for screen readers."
                  placeholder="Summer sale — 20% off all products"
                />
              </div>
            )}

            {/* Text mode field */}
            {mode === "text" && (
              <MinimalTiptapFormField
                form={form}
                name="content"
                label="Popup message"
                description="Supports rich text formatting."
                output="json"
                placeholder="Welcome to our store! Sign up for 15% off your first order…"
                editorContentClassName="min-h-[140px] p-4"
              />
            )}

            <Separator />

            {/* CTA — same `col-span-1` / `items-start` reasoning as the
                banner's Link row above. */}
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2">
              <InputFormField
                form={form}
                name="ctaUrl"
                label="CTA link URL"
                description="Optional. Where the call-to-action button goes."
                placeholder="https://example.com/sale"
                type="url"
                className="col-span-1"
              />
              <InputFormField
                form={form}
                name="ctaLabel"
                label="CTA label"
                description="Text shown on the button."
                placeholder="Shop the sale"
                className="col-span-1"
              />
            </div>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── AnnouncementsEditor ──────────────────────────────────────────────────────

export function AnnouncementsEditor({
  banner,
  popup,
  bannersEnabled,
  popupsEnabled,
  mediaEnabled,
}: Props) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  // `as any` on resolver matches the codebase pattern (shipping-settings.tsx)
  // to avoid the third TFieldValues generic mismatch from zodResolver.
  const bannerForm: UseFormReturn<BannerFormValues> = useForm<BannerFormValues>(
    {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
      resolver: zodResolver(updateBannerConfigSchema) as any,
      mode: "onTouched",
      reValidateMode: "onChange",
      defaultValues: bannerDefaults(banner),
    },
  );

  const popupForm: UseFormReturn<PopupFormValues> = useForm<PopupFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    resolver: zodResolver(popupFormSchema) as any,
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: popupDefaults(popup),
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Popup image upload failed.");
    },
  });

  // No toasts on the mutations themselves — `handleSaveAll` orchestrates both
  // and owns the single success/failure message.
  const updateBanner = api.content.updateBannerConfig.useMutation();
  const updatePopup = api.content.updatePopupConfig.useMutation();

  // Best-effort S3 cleanup when the popup image uploaded during THIS save but
  // the mutation then failed — nothing in the DB references it yet. Same
  // pattern as product-form.tsx. `discardUploads` filters to this business.
  const discardUploads = api.upload.discardUploads.useMutation({
    onError: (error) => {
      console.warn(
        "Failed to discard orphaned upload(s); objects may remain in S3:",
        error,
      );
    },
  });

  const bannerDirty = bannersEnabled && bannerForm.formState.isDirty;
  const popupDirty = popupsEnabled && popupForm.formState.isDirty;
  const isDirty = bannerDirty || popupDirty;

  useDirtyForm(isDirty);

  const handleReset = () => {
    bannerForm.reset(bannerDefaults(banner));
    popupForm.reset(popupDefaults(popup));
  };

  const handleSaveAll = async () => {
    // Validate BOTH forms before writing anything, so a bad popup URL can't
    // leave the banner saved and the popup not.
    const [bannerValid, popupValid] = await Promise.all([
      bannersEnabled ? bannerForm.trigger() : Promise.resolve(true),
      popupsEnabled ? popupForm.trigger() : Promise.resolve(true),
    ]);

    if (!bannerValid || !popupValid) {
      toast.error("Fix the highlighted fields before saving.");
      return;
    }

    if (!bannerDirty && !popupDirty) {
      toast.info("No changes to save");
      return;
    }

    setIsSaving(true);
    toast.loading("Saving…");

    // Uploaded in this save but not yet referenced by any row — discarded if a
    // mutation below fails.
    const newlyUploadedUrls: string[] = [];

    // Upload before either mutation runs so an upload failure aborts cleanly
    // rather than leaving the banner saved and the popup half-written.
    let uploadedImagePath: string | null = null;
    if (popupDirty) {
      const file = popupForm.getValues("imageFile");
      if (file instanceof File) {
        try {
          const response = await imageUploader.upload(file);
          const fileLocation =
            (response.file.objectInfo.metadata?.pathname as
              | string
              | undefined) ?? "";
          if (fileLocation) {
            uploadedImagePath = fileLocation;
            newlyUploadedUrls.push(fileLocation);
          }
        } catch {
          toast.dismiss();
          toast.error("Failed to upload the popup image.");
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      if (bannerDirty) {
        const values = bannerForm.getValues();
        await updateBanner.mutateAsync(values);
        // New baseline so the badge returns to "Saved".
        bannerForm.reset(values);
      }

      if (popupDirty) {
        // `imageFile` is form-local — strip it before it reaches the wire.
        const { imageFile: _imageFile, ...rest } = popupForm.getValues();
        const payload = {
          ...rest,
          imagePath: uploadedImagePath ?? rest.imagePath,
        };
        await updatePopup.mutateAsync(payload);
        popupForm.reset({ ...payload, imageFile: null });
      }

      toast.dismiss();
      toast.success("Changes saved");
      router.refresh();
    } catch (error) {
      if (newlyUploadedUrls.length > 0) {
        discardUploads.mutate({ urls: newlyUploadedUrls });
      }
      toast.dismiss();
      toast.error(
        error instanceof Error ? error.message : "Failed to save changes",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const saving = isSaving || imageUploader.isPending;

  return (
    <div className="bg-muted/40 min-h-screen">
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
            <h1 className="text-base font-medium">Banner &amp; Popup</h1>

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
            disabled={saving || !isDirty}
            onClick={handleReset}
            className="hidden md:inline-flex"
          >
            Reset
          </Button>

          <Button
            type="button"
            size="sm"
            disabled={saving}
            onClick={() => void handleSaveAll()}
          >
            {saving ? (
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
        <div className="space-y-8">
          {bannersEnabled && <BannerForm form={bannerForm} />}
          {popupsEnabled && (
            <PopupForm
              form={popupForm}
              existingImageUrl={popup?.imagePath ?? undefined}
              mediaEnabled={mediaEnabled}
            />
          )}
        </div>
      </div>
    </div>
  );
}
