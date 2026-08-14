/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { FieldErrors, Path } from "react-hook-form";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  ExternalLink,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { AdminFormMoreMenuItem } from "~/app/admin/_components/admin-form-more-menu";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
import { useSiteHost } from "~/hooks/use-site-host";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/components/ui/alert-dialog";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Form, FormField } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import {
  SearchResultPreview,
  SocialPreviewCard,
} from "~/components/admin/seo-previews";
import { AdminFormMoreMenu } from "~/app/admin/_components/admin-form-more-menu";
import {
  erroredTabsFor,
  TabErrorDot,
} from "~/app/admin/_components/form-tab-errors";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] };

type PageEditorTab = "content" | "seo";

/** Fields that live on the SEO tab — everything else is on Content. */
const SEO_TAB_FIELDS = new Set<string>([
  "slug",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "ogImage",
  "ogImageFile",
]);

const tabForField = (name: string): PageEditorTab =>
  SEO_TAB_FIELDS.has(name.split(".")[0] ?? name) ? "seo" : "content";

const NEW_PAGE_DEFAULTS = {
  title: "",
  slug: "",
  content: { ...EMPTY_TIPTAP_DOC },
  excerpt: "",
  published: true,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  image: undefined,
  imageFile: undefined,
  ogImage: undefined,
  ogImageFile: undefined,
};

// Form schema
const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.any(), // TipTap JSON
  excerpt: z.string().optional().nullable(),
  published: z.boolean(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
  metaKeywords: z.string().optional().nullable(),
  imageFile: z.instanceof(File).optional().nullable(),
  image: z.string().url().optional().nullable(),
  ogImage: z.string().url().optional().nullable(),
  ogImageFile: z.instanceof(File).optional().nullable(),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

type PageEditorProps = {
  page?: {
    id: string;
    title: string;
    slug: string;
    content: any; // JSON from TipTap
    excerpt: string | null;
    published: boolean;
    scheduledPublishAt?: Date | null;
    metaTitle: string | null;
    metaDescription: string | null;
    metaKeywords: string | null;
    image: string | null;
    ogImage: string | null;
  };
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
  quotesEnabled?: boolean;
};

export function PageEditor({
  page,
  galleriesEnabled,
  embedsEnabled,
  quotesEnabled,
}: PageEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const siteHost = useSiteHost();
  const formRef = useRef<HTMLFormElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const createAnotherRef = useRef<boolean>(false);
  const slugManuallyEditedRef = useRef(false);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<PageEditorTab>("content");
  // Initialize form with TipTap content
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      content: page?.content ?? { ...EMPTY_TIPTAP_DOC },
      excerpt: page?.excerpt ?? "",
      published: page?.published ?? true,
      metaTitle: page?.metaTitle ?? "",
      metaDescription: page?.metaDescription ?? "",
      metaKeywords: page?.metaKeywords ?? "",
      image: page?.image ?? undefined,
      imageFile: undefined,
      ogImage: page?.ogImage ?? undefined,
      ogImageFile: undefined,
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  /** Re-baseline after TipTap normalizes empty doc on mount (avoids false dirty). */
  const dirtyBaselineRef = useRef(false);
  useEffect(() => {
    if (dirtyBaselineRef.current) return;
    dirtyBaselineRef.current = true;
    const raf = requestAnimationFrame(() => {
      form.reset(form.getValues());
    });
    return () => cancelAnimationFrame(raf);
  }, [form]);

  /**
   * The slug tracks the title only while the page has never been live. There
   * is no redirect infrastructure, so once a URL has been public — or has been
   * committed to a scheduled publish time — a silent rename 404s every link
   * that already points at it, including hand-written navigation-menu entries.
   * Same contract as Products/Collections, plus the scheduled-publish guard:
   * a page with `scheduledPublishAt` set is treated as already frozen, because
   * the cron will flip it live without anyone reopening this editor.
   */
  const slugAutoSyncs = (livePublished: boolean) =>
    !page || (!page.published && !livePublished && !page.scheduledPublishAt);

  const handleTitleChange = (value: string) => {
    if (!value) return;
    if (slugManuallyEditedRef.current) return;
    if (!slugAutoSyncs(form.getValues("published"))) return;
    form.setValue("slug", slugify(value), { shouldValidate: true });
  };

  const handleInvalidSubmit = (errors: FieldErrors<PageFormValues>) => {
    createAnotherRef.current = false;
    const first = Object.keys(errors)[0];
    if (first) setActiveTab(tabForField(first));
  };

  const revealServerErrorTab = () => {
    const first = Object.keys(form.getValues()).find(
      (name) => form.getFieldState(name as Path<PageFormValues>).invalid,
    );
    if (first) setActiveTab(tabForField(first));
  };

  const handleReset = (data?: PageFormValues) => {
    // A user-initiated Reset also un-sticks the "the owner typed their own
    // slug" latch, so a fresh draft resumes tracking the title.
    if (data === undefined) slugManuallyEditedRef.current = false;
    form.reset({
      title: data?.title ?? page?.title ?? "",
      slug: data?.slug ?? page?.slug ?? "",
      content: data?.content ?? page?.content ?? EMPTY_TIPTAP_DOC,
      excerpt: data?.excerpt ?? page?.excerpt ?? "",
      published: data?.published ?? page?.published ?? true,
      metaTitle: data?.metaTitle ?? page?.metaTitle ?? "",
      metaDescription: data?.metaDescription ?? page?.metaDescription ?? "",
      metaKeywords: data?.metaKeywords ?? page?.metaKeywords ?? "",
      image:
        data !== undefined ? (data.image ?? null) : (page?.image ?? undefined),
      imageFile: undefined,
      ogImage:
        data !== undefined
          ? (data.ogImage ?? null)
          : (page?.ogImage ?? undefined),
      ogImageFile: undefined,
    });
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
  };

  const createPage = api.content.createPage.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      if (createAnotherRef.current) {
        createAnotherRef.current = false;
        slugManuallyEditedRef.current = false;
        form.reset(NEW_PAGE_DEFAULTS);
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
        toast.success("Page created — add another");
        router.push("/admin/content/pages/new");
      } else {
        toast.success("Page created successfully");
        router.push(`/admin/content/pages/${data.id}`);
      }
    },
    onError: (error) => {
      createAnotherRef.current = false;
      toast.dismiss();
      toast.error(error.message || "Failed to create page");
      revealServerErrorTab();
    },
    onMutate: () => {
      toast.loading("Creating page...");
    },
  });

  const updatePage = api.content.updatePage.useMutation({
    onSuccess: ({ data, message }) => {
      toast.dismiss();
      toast.success(message);
      handleReset(data);
      requestAnimationFrame(() => {
        form.reset(form.getValues());
      });
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update page");
      revealServerErrorTab();
    },
    onMutate: () => {
      toast.loading("Updating page...");
    },
  });

  const deletePage = api.content.deletePage.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Page deleted successfully");
      void utils.content.invalidate();
      router.push("/admin/content/pages");
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to delete page");
    },
    onMutate: () => {
      toast.loading("Deleting page...");
    },
  });

  const onSubmit = async (data: PageFormValues) => {
    let imageUrl: string | null | undefined;
    let ogImageUrl: string | null | undefined;
    const imageFile = data.imageFile;
    if (imageFile === null) {
      imageUrl = null;
    } else if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) imageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      imageUrl = data.image ?? undefined;
    }

    const ogImageFile = data.ogImageFile;
    if (ogImageFile === null) {
      ogImageUrl = null;
    } else if (ogImageFile instanceof File) {
      try {
        const response = await imageUploader.upload(ogImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) ogImageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload Open Graph image.");
        return;
      }
    } else {
      ogImageUrl = data.ogImage ?? undefined;
    }

    const pageData = {
      title: data.title,
      slug: data.slug,
      content: data.content, // TipTap JSON
      image: imageUrl,
      ogImage: ogImageUrl,
      excerpt: data.excerpt ?? "",
      published: data.published,
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      metaKeywords: data.metaKeywords ?? "",
    };

    if (page?.id) {
      // Update path: omit type/template/sortOrder — this editor doesn't
      // manage those fields, and sending them would clobber records
      // (e.g. blog posts) that were created with different values.
      updatePage.mutate({ id: page.id, data: pageData });
    } else {
      createPage.mutate({
        data: {
          ...pageData,
          type: "page" as const,
          template: "default" as const,
          sortOrder: 0,
        },
      });
    }
  };

  const isSubmitting =
    updatePage.isPending || createPage.isPending || imageUploader.isPending;
  const isDeleting = deletePage.isPending;

  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit, handleInvalidSubmit);
  useDirtyForm(isDirty);

  const { errors: formErrors, isSubmitted: saveAttempted } = form.formState;
  const erroredTabs = useMemo(
    () =>
      saveAttempted
        ? erroredTabsFor(formErrors, tabForField)
        : new Set<PageEditorTab>(),
    [saveAttempted, formErrors],
  );

  const watchedTitle = form.watch("title") ?? "";
  const watchedSlug = form.watch("slug") ?? "";
  const titleDerivedSlug = slugify(watchedTitle);
  const slugFrozen = !slugAutoSyncs(form.watch("published"));
  const showContentRenameWarning =
    slugFrozen &&
    !!page &&
    watchedTitle.trim() !== page.title &&
    titleDerivedSlug !== watchedSlug;

  const metaTitleLength = form.watch("metaTitle")?.length ?? 0;
  const metaDescriptionLength = form.watch("metaDescription")?.length ?? 0;

  // SEO preview values — || is intentional so empty string falls back
  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const seoPreviewTitle =
    form.watch("metaTitle") || form.watch("title") || "Page Title";
  const seoPreviewDesc =
    form.watch("metaDescription") ||
    form.watch("excerpt") ||
    "Your page description will appear here in search results.";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const watchedOgImageFile = form.watch("ogImageFile");
  const existingOgImage =
    watchedOgImageFile === null ? undefined : (page?.ogImage ?? undefined);

  const moreMenuItems: AdminFormMoreMenuItem[] = [];
  if (page?.id && page.published) {
    moreMenuItems.push({
      label: "View on storefront",
      icon: ExternalLink,
      href: `/${page.slug}`,
    });
  }
  moreMenuItems.push({
    label: "Reset",
    icon: RotateCcw,
    disabled: isSubmitting || !isDirty,
    onSelect: () => handleReset(),
  });
  if (page?.id) {
    moreMenuItems.push({
      label: "Delete",
      icon: Trash2,
      destructive: true,
      disabled: isSubmitting || isDeleting,
      onSelect: () => setShowDeleteDialog(true),
    });
  }

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) =>
            void form.handleSubmit(onSubmit, handleInvalidSubmit)(e)
          }
          className="bg-muted/40 min-h-screen"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/content/pages">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="text-base font-medium">
                  {!!page ? `Edit ${page.title}` : "Create Page"}
                </h1>

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
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor="published">Published</Label>
                    <Switch
                      id="published"
                      aria-label="Published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              <AdminFormMoreMenu items={moreMenuItems} />

              {!page?.id && (
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    createAnotherRef.current = true;
                  }}
                  className="hidden sm:inline-flex"
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Save &amp; create another
                </Button>
              )}

              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  createAnotherRef.current = false;
                }}
              >
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
          <div className="admin-container">
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as PageEditorTab)}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="content">
                  Content
                  {erroredTabs.has("content") && <TabErrorDot />}
                </TabsTrigger>
                <TabsTrigger value="seo">
                  SEO
                  {erroredTabs.has("seo") && <TabErrorDot />}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Page Content</CardTitle>
                    <CardDescription>
                      Write out your page content
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Title */}
                    <InputFormField
                      form={form}
                      name="title"
                      label="What is the page title?"
                      placeholder="About Us"
                      onChangeAdditional={(value) => handleTitleChange(value)}
                      required
                    />

                    {/* Slug affordance — the field itself lives on the SEO tab */}
                    {showContentRenameWarning ? (
                      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            Title changed — the URL hasn&apos;t.
                          </p>
                          <p className="text-amber-700">
                            This page is still at{" "}
                            <span className="font-mono">/{watchedSlug}</span>.
                            Updating the URL to match will 404 old links,
                            bookmarks and search results, and will silently
                            break any navigation-menu link pointing at this
                            page. We don&apos;t create a redirect automatically.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              slugManuallyEditedRef.current = true;
                              form.setValue("slug", titleDerivedSlug, {
                                shouldValidate: true,
                                shouldDirty: true,
                              });
                              setActiveTab("seo");
                            }}
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
                            /{watchedSlug || "your-page"}
                          </span>
                        </span>
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0 text-xs"
                          onClick={() => setActiveTab("seo")}
                        >
                          Edit in SEO
                        </Button>
                      </div>
                    )}

                    {/* Excerpt */}
                    <TextareaFormField
                      form={form}
                      name="excerpt"
                      label="Provide a short description of the page"
                      placeholder="Our business is a local business that provides services to the community..."
                      rows={3}
                    />

                    {/* Cover Image */}
                    <ImageUploadFormField
                      form={form}
                      name="imageFile"
                      label="Cover image"
                      description="Shown as the page hero on supported templates."
                      existingPreviewUrl={page?.image ?? undefined}
                      inputRef={imageFileInputRef}
                    />

                    <MinimalTiptapFormField
                      form={form}
                      name="content"
                      label="Write out your page content"
                      placeholder="Start writing your page content..."
                      output="json"
                      editorContentClassName="min-h-[400px] p-4"
                      galleriesEnabled={galleriesEnabled}
                      embedsEnabled={embedsEnabled}
                      quotesEnabled={quotesEnabled}
                      required
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="mt-6 space-y-6">
                <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Meta Tags</CardTitle>
                        <CardDescription>
                          Fine tune the URL, meta title and description to help
                          boost your SEO for this page.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InputFormField
                          form={form}
                          name="slug"
                          label="URL Slug"
                          placeholder="about-us"
                          onChange={(value) => {
                            slugManuallyEditedRef.current = true;
                            form.setValue("slug", sanitizeSlugInput(value), {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          required
                          description={`Used in the page URL: /${watchedSlug || "your-page"}`}
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        {page?.id && watchedSlug !== page.slug && (
                          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                Heads up — this will change the page&apos;s URL.
                              </p>
                              <p className="text-amber-700">
                                Saving will change the public URL from{" "}
                                <span className="font-mono">/{page.slug}</span>{" "}
                                to{" "}
                                <span className="font-mono">
                                  /{watchedSlug}
                                </span>
                                . Anyone with the old link — including bookmarks
                                and search results — will get a 404, and any
                                navigation-menu item pointing at{" "}
                                <span className="font-mono">/{page.slug}</span>{" "}
                                will keep pointing there: menu links store the
                                address, not the page, so they won&apos;t follow
                                the rename. Update them under Site Setup →
                                Navigation. We don&apos;t set up a redirect
                                automatically.
                              </p>
                            </div>
                          </div>
                        )}

                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Meta Title"
                          placeholder={
                            form.watch("title") || "All About a Thing"
                          }
                          description={
                            <span
                              className={
                                metaTitleLength > 60
                                  ? "text-destructive"
                                  : undefined
                              }
                            >
                              {metaTitleLength}/60 characters — leave blank to
                              use the page title
                            </span>
                          }
                          descriptionClassName="text-xs text-muted-foreground"
                        />

                        <TextareaFormField
                          form={form}
                          name="metaDescription"
                          label="Meta Description"
                          placeholder="All About a Thing: A detailed description of the page..."
                          description={
                            <span
                              className={
                                metaDescriptionLength > 160
                                  ? "text-destructive"
                                  : undefined
                              }
                            >
                              {metaDescriptionLength}/160 characters — leave
                              blank to use the page description
                            </span>
                          }
                          descriptionClassName="text-xs text-muted-foreground"
                          rows={3}
                        />

                        <InputFormField
                          form={form}
                          name="metaKeywords"
                          label="Meta Keywords"
                          placeholder="e.g., about us, our story, team"
                          description="Comma-separated keywords"
                          descriptionClassName="text-xs text-muted-foreground"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Open Graph Image</CardTitle>
                        <CardDescription>
                          Shown when this page is shared on social media.
                          Recommended: 1200×630px.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ImageUploadFormField
                          form={form}
                          name="ogImageFile"
                          label="Open Graph Image"
                          description="This is the image that will be used for the Open Graph image"
                          existingPreviewUrl={page?.ogImage ?? undefined}
                          inputRef={ogImageFileInputRef}
                          disabled={isSubmitting}
                        />
                      </CardContent>
                    </Card>
                  </div>

                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Search Result Preview</CardTitle>
                        <CardDescription>
                          How this page might appear in Google
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SearchResultPreview
                          host={siteHost}
                          pathPrefix=""
                          slug={watchedSlug || "page-slug"}
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Social Media Preview</CardTitle>
                        <CardDescription>
                          How this page looks when shared on social platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SocialPreviewCard
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                          ogImageFile={watchedOgImageFile}
                          existingOgImage={existingOgImage}
                          siteHost={siteHost}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </Form>
      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{page?.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deletePage.mutate({ id: page?.id ?? "" });
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
