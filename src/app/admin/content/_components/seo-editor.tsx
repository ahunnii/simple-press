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
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  business: { id: string };
  siteContent: {
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    ogImage: string | null;
    faviconUrl: string | null;
  };
};

const seoFormSchema = z.object({
  metaTitle: z.string().nullable().optional(),
  metaDescription: z.string().nullable().optional(),
  metaKeywords: z.string().nullable().optional(),
  ogImage: z.string().nullable().optional(),
  faviconUrl: z.string().nullable().optional(),
  ogImageFile: z.instanceof(File).optional().nullable(),
  faviconFile: z.instanceof(File).optional().nullable(),
});

type SeoFormValues = z.infer<typeof seoFormSchema>;

export function SEOEditor({ siteContent }: Props) {
  const router = useRouter();

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const faviconFileInputRef = useRef<HTMLInputElement | null>(null);

  // Form Setup
  const form = useForm<SeoFormValues>({
    resolver: zodResolver(seoFormSchema),
    defaultValues: {
      metaTitle: siteContent.metaTitle ?? "",
      metaDescription: siteContent.metaDescription ?? "",
      metaKeywords: siteContent.metaKeywords ?? "",
      ogImage: siteContent.ogImage ?? "",
      faviconUrl: siteContent.faviconUrl ?? "",
      ogImageFile: null,
      faviconFile: null,
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
        ...data.siteContent,
        ogImageFile: null,
        faviconFile: null,
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
      faviconUrl: siteContent.faviconUrl ?? "",
      ogImageFile: null,
      faviconFile: null,
    });
    if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
    if (faviconFileInputRef.current) faviconFileInputRef.current.value = "";
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
        toast.error("Failed to upload favicon.");
        return;
      }
    }

    updateSiteContent.mutate({
      metaTitle: data.metaTitle ?? undefined,
      metaDescription: data.metaDescription ?? undefined,
      metaKeywords: data.metaKeywords ?? undefined,
      ogImage: ogImageUrl,
    });
  };

  // Checks and Hooks
  const isDirty = form.formState.isDirty;
  const isSaving = updateSiteContent.isPending;

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

            {/* Preview */}
            {(form.watch("metaTitle") ?? form.watch("metaDescription")) && (
              <Card>
                <CardHeader>
                  <CardTitle>Search Result Preview</CardTitle>
                  <CardDescription>
                    How your store might appear in Google
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-lg border bg-white p-4">
                    <div className="mb-1 text-sm text-blue-600">
                      {form.watch("metaTitle") ?? "Your Store Name"}
                    </div>
                    <div className="mb-2 text-xs text-green-700">
                      https://yourstore.com
                    </div>
                    <div className="text-sm text-gray-600">
                      {form.watch("metaDescription") ??
                        "Your store description will appear here..."}
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
