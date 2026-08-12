"use client";

import { useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

import { env } from "~/env";
import { cn } from "~/lib/utils";
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
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SwitchFormField } from "~/components/inputs/switch-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  business: {
    id: string;
    subdomain: string;
    customDomain: string | null;
    localBusinessEnabled: boolean;
    allowAiCrawlers: boolean;
  };
  siteContent: {
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    ogImage: string | null;
    faviconUrl: string | null;
  };
};

// Favicon upload/persistence already has a complete, working home on the
// Branding page (branding-editor.tsx → content.updateSiteContent →
// siteContent.faviconUrl). business.updateSeo (the mutation this form uses)
// never accepted or wrote faviconUrl, so a faviconFile/faviconUrl field here
// was dead form state that was never rendered or submitted — removed rather
// than wired up, to avoid two divergent code paths writing the same field.
const seoFormSchema = z.object({
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  ogImageFile: z.instanceof(File).optional().nullable(),
  localBusinessEnabled: z.boolean(),
  allowAiCrawlers: z.boolean(),
});

type SeoFormValues = z.infer<typeof seoFormSchema>;

export function SEOEditor({ business, siteContent }: Props) {
  const router = useRouter();

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form Setup
  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      metaTitle: siteContent.metaTitle ?? "",
      metaDescription: siteContent.metaDescription ?? "",
      metaKeywords: siteContent.metaKeywords ?? "",
      ogImage: siteContent.ogImage ?? "",
      ogImageFile: null,
      localBusinessEnabled: business.localBusinessEnabled,
      allowAiCrawlers: business.allowAiCrawlers,
    },
  });

  //Image Uploads
  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Open Graph Image upload failed.");
    },
  });

  //Mutations
  const updateSiteContent = api.business.updateSeo.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("SEO settings updated");
      form.reset({
        metaTitle: data.siteContent?.metaTitle,
        metaDescription: data.siteContent?.metaDescription,
        metaKeywords: data.siteContent?.metaKeywords,
        ogImage: data.siteContent?.ogImage,
        localBusinessEnabled: data.localBusinessEnabled,
        allowAiCrawlers: data.allowAiCrawlers,
        ogImageFile: null,
      });
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update SEO settings");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating SEO settings...");
    },
  });

  //Handlers
  const handleReset = () => {
    form.reset({
      metaTitle: siteContent.metaTitle ?? "",
      metaDescription: siteContent.metaDescription ?? "",
      metaKeywords: siteContent.metaKeywords ?? "",
      ogImage: siteContent.ogImage ?? "",
      ogImageFile: null,
      localBusinessEnabled: business.localBusinessEnabled,
      allowAiCrawlers: business.allowAiCrawlers,
    });
    if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
  };

  const handleSubmit = async (data: SeoFormValues) => {
    let ogImageUrl: string | undefined = siteContent.ogImage ?? undefined;

    const tempOgImageFile = data.ogImageFile;
    if (tempOgImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(tempOgImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) ogImageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    }

    updateSiteContent.mutate({
      metaTitle: data.metaTitle ?? undefined,
      metaDescription: data.metaDescription ?? undefined,
      metaKeywords: data.metaKeywords ?? undefined,
      ogImage: ogImageUrl,
      localBusinessEnabled: data.localBusinessEnabled,
      allowAiCrawlers: data.allowAiCrawlers,
    });
  };

  // Checks and Hooks
  const isDirty = form.formState.isDirty;
  const isSaving = updateSiteContent.isPending;

  const isDev = process.env.NODE_ENV === "development";
  // Explicit length check (not `||`/`??`): an empty-string customDomain must
  // fall through to the subdomain host, and `??` would keep it.
  const customDomain = business.customDomain?.trim();
  const fallbackHost = isDev
    ? `${business.subdomain}.localhost:3000`
    : `${business.subdomain}.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;
  const storeHost = customDomain?.length ? customDomain : fallbackHost;

  // Watched here (not inline in the JSX) so the preview guard and fallbacks
  // can test emptiness explicitly — the form defaults these to "", which is
  // not nullish, so `??` never falls through and `||` trips the lint rule.
  const previewTitle = form.watch("metaTitle")?.trim() ?? "";
  const previewDescription = form.watch("metaDescription")?.trim() ?? "";
  const showSearchPreview =
    previewTitle.length > 0 || previewDescription.length > 0;

  useKeyboardEnter(form, handleSubmit);
  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(handleSubmit)(e)}
        className="bg-muted/40 min-h-screen"
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
              <h1 className="text-base font-medium">SEO & Meta</h1>

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
            {/* Meta Tags */}
            <Card>
              <CardHeader>
                <CardTitle>Meta Tags</CardTitle>
                <CardDescription>
                  Default meta tags for your site (can be overridden per page)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <InputFormField
                  form={form}
                  name="metaTitle"
                  label="Meta Title"
                  placeholder="Your Store - Quality Products"
                  description={`${form.watch("metaTitle")?.length ?? 0}/60 characters (optimal: 50-60)`}
                />

                <TextareaFormField
                  form={form}
                  name="metaDescription"
                  label="Meta Description"
                  placeholder="Discover our amazing collection of products..."
                  description={`${form.watch("metaDescription")?.length ?? 0}/160 characters (optimal: 150-160)`}
                />

                <InputFormField
                  form={form}
                  name="metaKeywords"
                  label="Meta Keywords"
                  placeholder="ecommerce, products, shopping"
                  description="Comma-separated keywords "
                />
              </CardContent>
            </Card>

            {/* Social Media */}
            <Card>
              <CardHeader>
                <CardTitle>Social Media</CardTitle>
                <CardDescription>
                  How your site appears when shared on social media
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ImageUploadFormField
                  form={form}
                  name="ogImageFile"
                  label="Open Graph Image"
                  description="Recommended: 1200x630px"
                  existingPreviewUrl={siteContent.ogImage ?? undefined}
                  inputRef={ogImageFileInputRef}
                />
              </CardContent>
            </Card>

            {/* Search & AI Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Search &amp; AI Settings</CardTitle>
                <CardDescription>
                  Control how search engines and AI answer engines interact with
                  your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <SwitchFormField
                  form={form}
                  name="localBusinessEnabled"
                  label="Show as a local business in search & AI results"
                  description="Emits LocalBusiness structured data (schema.org Store) using your store's address and phone number from Settings → General. Enable this only if your business has a physical or local presence — online-only stores should leave it off to avoid misleading search engines. See Settings → General to manage your business address and phone number."
                />
                <SwitchFormField
                  form={form}
                  name="allowAiCrawlers"
                  label="Allow AI answer engines to crawl this store"
                  description="Controls whether AI bots such as ChatGPT (GPTBot), Perplexity (PerplexityBot), and Google AI (Google-Extended) can read your storefront to generate answers. Turning this off adds those crawlers to your robots.txt disallow list. Most stores benefit from leaving this on."
                />
              </CardContent>
            </Card>

            {/* Preview */}
            {showSearchPreview && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Result Preview</CardTitle>
                  <CardDescription>
                    How your store might appear in Google
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-card rounded-lg border p-4">
                    <div className="text-primary mb-1 text-sm">
                      {previewTitle.length > 0
                        ? previewTitle
                        : "Your Store Name"}
                    </div>
                    <div className="mb-2 text-xs text-green-700">
                      {`https://${storeHost}`}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {previewDescription.length > 0
                        ? previewDescription
                        : "Your store description will appear here..."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
