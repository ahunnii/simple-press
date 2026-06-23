"use client";

import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import type { BannerConfig, PopupConfig } from "~/lib/validators/site-banner";
import {
  updateBannerConfigSchema,
  updatePopupConfigSchema,
} from "~/lib/validators/site-banner";
import { api } from "~/trpc/react";
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
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { RadioFormField } from "~/components/inputs/radio-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TemplateImageUploadField } from "~/app/admin/content/template/_components/template-fields-editor";

// ─── Types ────────────────────────────────────────────────────────────────────

type BannerFormValues = z.infer<typeof updateBannerConfigSchema>;
type PopupFormValues = z.infer<typeof updatePopupConfigSchema>;

type Props = {
  banner: BannerConfig | null;
  popup: PopupConfig | null;
  bannersEnabled: boolean;
  popupsEnabled: boolean;
};

// ─── Banner Form ──────────────────────────────────────────────────────────────

function BannerForm({ banner }: { banner: BannerConfig | null }) {
  const router = useRouter();

  // `as any` on resolver matches the codebase pattern (shipping-settings.tsx)
  // to avoid the third TFieldValues generic mismatch from zodResolver.
  const form: UseFormReturn<BannerFormValues> = useForm<BannerFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    resolver: zodResolver(updateBannerConfigSchema) as any,
    defaultValues: {
      enabled: banner?.enabled ?? false,
      content: banner?.content ?? null,
      linkUrl: banner?.linkUrl ?? "",
      linkLabel: banner?.linkLabel ?? "",
      bgColor: banner?.bgColor ?? "#000000",
      textColor: banner?.textColor ?? "#ffffff",
    },
  });

  const updateBanner = api.content.updateBannerConfig.useMutation({
    onMutate: () => toast.loading("Saving banner…"),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Banner saved");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to save banner");
    },
  });

  function onSubmit(values: BannerFormValues) {
    updateBanner.mutate(values);
  }

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Link */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputFormField
                form={form}
                name="linkUrl"
                label="Link URL"
                description="Optional. Where the link in the banner goes."
                placeholder="https://example.com/sale"
                type="url"
              />
              <InputFormField
                form={form}
                name="linkLabel"
                label="Link label"
                description="Text shown for the link."
                placeholder="Shop the sale"
              />
            </div>

            <Separator />

            {/* Colors */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

            <div className="flex justify-end">
              <Button type="submit" disabled={updateBanner.isPending}>
                {updateBanner.isPending ? "Saving…" : "Save banner"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

// ─── Popup Form ───────────────────────────────────────────────────────────────

function PopupForm({ popup }: { popup: PopupConfig | null }) {
  const router = useRouter();

  const form: UseFormReturn<PopupFormValues> = useForm<PopupFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
    resolver: zodResolver(updatePopupConfigSchema) as any,
    defaultValues: {
      enabled: popup?.enabled ?? false,
      mode: popup?.mode ?? "image",
      heading: popup?.heading ?? "",
      imagePath: popup?.imagePath ?? "",
      imageAlt: popup?.imageAlt ?? "",
      content: popup?.content ?? null,
      ctaUrl: popup?.ctaUrl ?? "",
      ctaLabel: popup?.ctaLabel ?? "",
    },
  });

  const mode = useWatch({ control: form.control, name: "mode" });

  const updatePopup = api.content.updatePopupConfig.useMutation({
    onMutate: () => toast.loading("Saving popup…"),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Popup saved");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to save popup");
    },
  });

  function onSubmit(values: PopupFormValues) {
    updatePopup.mutate(values);
  }

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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

            {/* Image mode fields */}
            {mode === "image" && (
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="imagePath"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Popup image</FormLabel>
                      <FormControl>
                        <TemplateImageUploadField
                          value={field.value ?? ""}
                          onChange={field.onChange}
                          description="Recommended: 800×600 px or wider. Supports JPG, PNG, WebP."
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
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

            {/* CTA */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <InputFormField
                form={form}
                name="ctaUrl"
                label="CTA link URL"
                description="Optional. Where the call-to-action button goes."
                placeholder="https://example.com/sale"
                type="url"
              />
              <InputFormField
                form={form}
                name="ctaLabel"
                label="CTA label"
                description="Text shown on the button."
                placeholder="Shop the sale"
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={updatePopup.isPending}>
                {updatePopup.isPending ? "Saving…" : "Save popup"}
              </Button>
            </div>
          </form>
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
}: Props) {
  return (
    <div className="space-y-8">
      {bannersEnabled && <BannerForm banner={banner} />}
      {popupsEnabled && <PopupForm popup={popup} />}
    </div>
  );
}
