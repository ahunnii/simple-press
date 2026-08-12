"use client";

import type { FieldErrors, Path } from "react-hook-form";
import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  MoreHorizontal,
  PlusCircle,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CollectionFormData } from "~/lib/validators/collections";
import type { RouterOutputs } from "~/trpc/react";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { collectionFormSchema } from "~/lib/validators/collections";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Form, FormField } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { OgImageUploader } from "~/components/inputs/og-image-uploader";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";
import {
  SearchResultPreview,
  SocialPreviewCard,
} from "~/components/admin/seo-previews";
import {
  erroredTabsFor,
  TabErrorDot,
} from "~/app/admin/_components/form-tab-errors";

import { CollectionProductPicker } from "./collection-product-picker";

type Props = {
  collection?: RouterOutputs["collections"]["getById"];
};

type CollectionFormTab = "basics" | "seo";

const SEO_TAB_FIELDS = new Set<string>([
  "slug",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "ogImage",
]);

const tabForField = (name: string): CollectionFormTab =>
  SEO_TAB_FIELDS.has(name.split(".")[0] ?? name) ? "seo" : "basics";

const NEW_COLLECTION_DEFAULTS = {
  published: true,
  name: "",
  slug: "",
  description: "",
  imageUrl: undefined,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  ogImage: undefined,
  imageFile: undefined,
  productIds: [] as string[],
} as const;

export function CollectionForm({ collection }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const createAnotherRef = useRef<boolean>(false);
  const slugManuallyEditedRef = useRef(false);
  // URLs uploaded to S3 during the in-flight submit that aren't yet
  // persisted to the DB. Populated right before `create`/`update` is called
  // (those are fire-and-forget `mutate`, not `mutateAsync`) so the mutation's
  // `onError` can discard them if the save itself fails — otherwise they'd be
  // orphaned in S3 forever (the collections router never deletes from S3).
  const pendingUploadUrlsRef = useRef<string[]>([]);
  const utils = api.useUtils();

  const siteHost = useSiteHost();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<CollectionFormTab>("basics");

  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImageRemoved, setOgImageRemoved] = useState(false);

  const initialProducts =
    collection?.collectionProducts.map((cp) => cp.product) ?? [];

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    mode: "onTouched",
    defaultValues: {
      ...collection,
      published: collection?.published ?? true,
      name: collection?.name ?? "",
      slug: collection?.slug ?? "",
      description: collection?.description ?? "",
      imageUrl: collection?.imageUrl ?? undefined,
      metaTitle: collection?.metaTitle ?? "",
      metaDescription: collection?.metaDescription ?? "",
      metaKeywords: collection?.metaKeywords ?? "",
      ogImage: collection?.ogImage ?? undefined,
      imageFile: undefined,
      productIds:
        collection?.collectionProducts.map((cp) => cp.product.id) ?? [],
    },
  });

  const imageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "Image upload failed.");
    },
  });

  const ogImageUploader = useUploadFile({
    api: "/api/upload",
    route: "image",
    onError: (error) => {
      toast.error(error.message ?? "OG image upload failed.");
    },
  });

  // Best-effort S3 cleanup for uploads whose parent save step failed. Not
  // user-visible or blocking — the caller's own error path already completed.
  const discardUploadsMutation = api.upload.discardUploads.useMutation({
    onError: (err, variables) => {
      console.warn(
        "Failed to discard uploaded files; objects may be orphaned in S3:",
        variables.urls,
        err,
      );
    },
  });

  const discardPendingUploads = () => {
    const urls = pendingUploadUrlsRef.current;
    pendingUploadUrlsRef.current = [];
    if (urls.length > 0) {
      discardUploadsMutation.mutate({ urls });
    }
  };

  const slugAutoSyncs = (livePublished: boolean) =>
    !collection || (!collection.published && !livePublished);

  const handleNameChange = (value: string | null) => {
    if (!value) return;
    if (slugManuallyEditedRef.current) return;
    if (!slugAutoSyncs(form.getValues("published"))) return;
    form.setValue("slug", slugify(value), { shouldValidate: true });
  };

  const handleInvalidSubmit = (errors: FieldErrors<CollectionFormData>) => {
    const first = Object.keys(errors)[0];
    if (first) setActiveTab(tabForField(first));
  };

  const revealServerErrorTab = () => {
    const first = Object.keys(form.getValues()).find(
      (name) => form.getFieldState(name as Path<CollectionFormData>).invalid,
    );
    if (first) setActiveTab(tabForField(first));
  };

  const createMutation = api.collections.create.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      // Uploads from this submit are now persisted (referenced by the new
      // collection) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      void utils.collections.invalidate();

      if (createAnotherRef.current) {
        createAnotherRef.current = false;
        form.reset(NEW_COLLECTION_DEFAULTS);
        slugManuallyEditedRef.current = false;
        setOgImageFile(null);
        setOgImageRemoved(false);
        setActiveTab("basics");
        if (imageFileInputRef.current) imageFileInputRef.current.value = "";
        if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
        toast.success("Collection created — add another");
        router.push("/admin/collections/new");
      } else {
        toast.success("Collection created successfully");
        router.push(`/admin/collections/${data.id}`);
      }
    },
    onError: (err) => {
      createAnotherRef.current = false;
      toast.dismiss();
      discardPendingUploads();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "not found in your store": "productIds", slug: "slug" },
        fallbackMessage: "Failed to create collection",
      });
      revealServerErrorTab();
    },
    onMutate: () => {
      toast.loading("Creating collection...");
    },
  });

  const updateMutation = api.collections.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Collection updated successfully");
      // Uploads from this submit are now persisted (referenced by the
      // updated collection) — nothing to discard.
      pendingUploadUrlsRef.current = [];

      void utils.collections.invalidate();
      const values = form.getValues();
      form.reset({
        ...values,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: data.ogImage ?? undefined,
      });
      setOgImageFile(null);
      setOgImageRemoved(false);
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      discardPendingUploads();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { "not found in your store": "productIds", slug: "slug" },
        fallbackMessage: "Failed to update collection",
      });
      revealServerErrorTab();
    },
    onMutate: () => {
      toast.loading("Updating collection...");
    },
  });

  const duplicateMutation = api.collections.duplicate.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Collection duplicated — draft saved");
      void utils.collections.invalidate();
      router.push(`/admin/collections/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to duplicate collection");
    },
    onMutate: () => {
      toast.loading("Duplicating collection...");
    },
  });

  const deleteMutation = api.collections.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Collection deleted successfully");
      void utils.collections.invalidate();
      router.push("/admin/collections");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete collection");
    },
    onMutate: () => {
      toast.loading("Deleting collection...");
    },
  });

  const onSubmit = async (data: CollectionFormData) => {
    // Track objects uploaded to S3 during this submit so they can be
    // discarded if anything fails before (or during) the save mutation —
    // otherwise a rejected save leaves orphaned S3 objects with nothing
    // referencing them.
    const uploadedThisSubmit: string[] = [];

    let imageUrl: string | null | undefined;
    const imageFile = data.imageFile;
    if (imageFile === null) {
      imageUrl = null;
    } else if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          imageUrl = fileLocation;
          uploadedThisSubmit.push(fileLocation);
        }
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      imageUrl = data.imageUrl ?? undefined;
    }

    let resolvedOgImage: string | null;
    if (ogImageFile instanceof File) {
      try {
        const response = await ogImageUploader.upload(ogImageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        resolvedOgImage = fileLocation || null;
        if (fileLocation) uploadedThisSubmit.push(fileLocation);
      } catch {
        toast.error("Failed to upload Open Graph image.");
        // The cover image (if any) already uploaded successfully above but
        // we're bailing before the save mutation ever runs — nothing will
        // reference it, so discard it now instead of leaving it orphaned.
        if (uploadedThisSubmit.length > 0) {
          discardUploadsMutation.mutate({ urls: uploadedThisSubmit });
        }
        return;
      }
    } else if (ogImageRemoved) {
      resolvedOgImage = null;
    } else {
      resolvedOgImage = data.ogImage ?? null;
    }

    // Hand off to the mutation's onError/onSuccess: `mutate` below is
    // fire-and-forget, so this ref is how the mutation callbacks learn what
    // was uploaded during the submit that's now in flight.
    pendingUploadUrlsRef.current = uploadedThisSubmit;

    if (collection?.id) {
      updateMutation.mutate({
        id: collection.id,
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: resolvedOgImage,
        productIds: data.productIds,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        slug: data.slug,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
        metaKeywords: data.metaKeywords ?? undefined,
        ogImage: resolvedOgImage,
        productIds: data.productIds,
      });
    }
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    imageUploader.isPending ||
    ogImageUploader.isPending;
  const isDeleting = deleteMutation.isPending;

  const isOgImageDirty = ogImageFile !== null || ogImageRemoved;
  const isDirty = form.formState.isDirty || isOgImageDirty;

  useKeyboardEnter(form, onSubmit, handleInvalidSubmit);
  useDirtyForm(isDirty);

  const { errors: formErrors, isSubmitted: saveAttempted } = form.formState;
  const erroredTabs = useMemo(
    () =>
      saveAttempted
        ? erroredTabsFor(formErrors, tabForField)
        : new Set<CollectionFormTab>(),
    [saveAttempted, formErrors],
  );

  /* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
  const seoPreviewTitle =
    form.watch("metaTitle") || form.watch("name") || "Collection Name";
  const seoPreviewDesc =
    form.watch("metaDescription") ||
    form.watch("description") ||
    "Your collection description will appear here in search results.";
  /* eslint-enable @typescript-eslint/prefer-nullish-coalescing */

  const watchedName = form.watch("name") ?? "";
  const watchedSlug = form.watch("slug") ?? "";
  const nameDerivedSlug = slugify(watchedName);
  const slugFrozen = !slugAutoSyncs(form.watch("published"));
  const showBasicsRenameWarning =
    slugFrozen &&
    !!collection &&
    watchedName.trim() !== collection.name &&
    nameDerivedSlug !== watchedSlug;

  const metaTitleLength = form.watch("metaTitle")?.length ?? 0;
  const metaDescriptionLength = form.watch("metaDescription")?.length ?? 0;

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) =>
            void form.handleSubmit(onSubmit, handleInvalidSubmit)(e)
          }
          className="bg-muted/30 min-h-screen"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/collections">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="flex min-w-0 items-center gap-2">
                <h1 className="hidden truncate text-base font-medium sm:block">
                  {collection
                    ? form.watch("name") || "Edit Collection"
                    : "New Collection"}
                </h1>

                <span
                  className={cn(
                    `admin-status-badge`,
                    `${
                      isDirty ? "isDirty" : "isPublished"
                    } ${!collection?.id ? "isNew" : ""}`,
                  )}
                >
                  {isDirty
                    ? "Unsaved Changes"
                    : !collection?.id
                      ? "Draft"
                      : "Saved"}
                </span>
              </div>
            </div>

            <div className="toolbar-actions">
              <FormField
                control={form.control}
                name="published"
                render={({ field }) => (
                  <div className="flex shrink-0 items-center gap-2">
                    <Label htmlFor="published" className="text-sm">
                      Published
                    </Label>
                    <Switch
                      id="published"
                      aria-label="Published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only ml-2 sm:not-sr-only">
                      More Options
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {collection?.id && collection.published && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/collections/${collection.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on storefront (opens in new tab)"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on storefront
                      </a>
                    </DropdownMenuItem>
                  )}

                  {collection?.id && (
                    <DropdownMenuItem
                      disabled={isSubmitting || duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate(collection.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    disabled={isSubmitting || !isDirty}
                    onClick={() => {
                      form.reset();
                      slugManuallyEditedRef.current = false;
                      setOgImageFile(null);
                      setOgImageRemoved(false);
                      if (imageFileInputRef.current)
                        imageFileInputRef.current.value = "";
                      if (ogImageFileInputRef.current)
                        ogImageFileInputRef.current.value = "";
                    }}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </DropdownMenuItem>

                  {collection && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isSubmitting}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {!collection?.id && (
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  disabled={isSubmitting}
                  onClick={() => {
                    createAnotherRef.current = true;
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <span className="saving-indicator" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">
                        Save &amp; create another
                      </span>
                      <span className="sm:hidden">Save+</span>
                    </>
                  )}
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
              onValueChange={(value) =>
                setActiveTab(value as CollectionFormTab)
              }
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="basics">
                  Basics
                  {erroredTabs.has("basics") && <TabErrorDot />}
                </TabsTrigger>
                <TabsTrigger value="seo">
                  SEO
                  {erroredTabs.has("seo") && <TabErrorDot />}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Collection name and description
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputFormField
                      form={form}
                      name="name"
                      label="What is the name of this collection?"
                      onChangeAdditional={handleNameChange}
                      placeholder="Summer Collection"
                      required
                      autoFocus
                    />

                    {showBasicsRenameWarning ? (
                      <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                        <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                        <div className="space-y-0.5">
                          <p className="font-medium">
                            Name changed — the URL hasn&apos;t.
                          </p>
                          <p className="text-amber-700">
                            This collection is still at{" "}
                            <span className="font-mono">
                              /collections/{watchedSlug}
                            </span>
                            . Updating the URL to match will 404 old links,
                            bookmarks, and search results. We don&apos;t create
                            a redirect automatically.
                          </p>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                              slugManuallyEditedRef.current = true;
                              form.setValue("slug", nameDerivedSlug, {
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
                            /collections/{watchedSlug || "your-collection"}
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

                    <TextareaFormField
                      form={form}
                      name="description"
                      label="Describe this collection in a sentence or two"
                      placeholder="Summer Collection: Bright and Vibrant Styles"
                      rows={4}
                    />

                    <ImageUploadFormField
                      form={form}
                      name="imageFile"
                      label="Upload an image that represents this collection"
                      description="This would be the first thing that people see associated with this collection"
                      existingPreviewUrl={collection?.imageUrl ?? undefined}
                      inputRef={imageFileInputRef}
                    />
                  </CardContent>
                </Card>

                <CollectionProductPicker
                  form={form}
                  initialProducts={initialProducts}
                />
              </TabsContent>

              <TabsContent value="seo" className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Meta Tags</CardTitle>
                        <CardDescription>
                          Override how this collection appears in search engine
                          results
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <InputFormField
                          form={form}
                          name="slug"
                          label="URL Slug"
                          placeholder="summer-collection"
                          onChange={(value) => {
                            slugManuallyEditedRef.current = true;
                            form.setValue("slug", sanitizeSlugInput(value), {
                              shouldValidate: true,
                              shouldDirty: true,
                            });
                          }}
                          required
                          description={`Used in the collection URL: /collections/${watchedSlug || "your-collection"}`}
                        />

                        {collection?.id && watchedSlug !== collection.slug && (
                          <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                            <div className="space-y-0.5">
                              <p className="font-medium">
                                Heads up — this will change the
                                collection&apos;s URL.
                              </p>
                              <p className="text-amber-700">
                                Saving will change the public URL from{" "}
                                <span className="font-mono">
                                  /collections/{collection.slug}
                                </span>{" "}
                                to{" "}
                                <span className="font-mono">
                                  /collections/{watchedSlug}
                                </span>
                                . Anyone with the old link — including bookmarks
                                and search engines — will get a 404. We
                                don&apos;t set up a redirect automatically.
                              </p>
                            </div>
                          </div>
                        )}

                        <InputFormField
                          form={form}
                          name="metaTitle"
                          label="Meta Title"
                          placeholder={
                            form.watch("name") || "e.g., Summer Collection"
                          }
                          description={
                            <span
                              className={
                                metaTitleLength > 70
                                  ? "text-destructive"
                                  : undefined
                              }
                            >
                              {metaTitleLength}/70 characters — aim for 50–60.
                              Leave blank to use the collection name.
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
                            "e.g., Bright, vibrant styles picked for warm days."
                          }
                          description={
                            <span
                              className={
                                metaDescriptionLength > 200
                                  ? "text-destructive"
                                  : undefined
                              }
                            >
                              {metaDescriptionLength}/200 characters — aim for
                              150–160. Leave blank to use the collection
                              description.
                            </span>
                          }
                          descriptionClassName="text-xs text-muted-foreground"
                          rows={3}
                        />

                        <InputFormField
                          form={form}
                          name="metaKeywords"
                          label="Meta Keywords"
                          placeholder="e.g., summer, fashion, new arrivals"
                          description="Comma-separated keywords"
                          descriptionClassName="text-xs text-muted-foreground"
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Open Graph Image</CardTitle>
                        <CardDescription>
                          Shown when this collection is shared on social media.
                          Recommended: 1200×630px.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <OgImageUploader
                          file={ogImageFile}
                          existingUrl={
                            ogImageRemoved
                              ? undefined
                              : (collection?.ogImage ?? undefined)
                          }
                          fileInputRef={ogImageFileInputRef}
                          onFileChange={(f) => {
                            setOgImageFile(f);
                            setOgImageRemoved(false);
                          }}
                          onRemove={() => {
                            setOgImageFile(null);
                            setOgImageRemoved(true);
                          }}
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
                          How this collection might appear in Google
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SearchResultPreview
                          host={siteHost}
                          pathPrefix="/collections"
                          slug={watchedSlug || "collection-slug"}
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                        />
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle>Social Media Preview</CardTitle>
                        <CardDescription>
                          How this collection looks when shared on social
                          platforms
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <SocialPreviewCard
                          title={seoPreviewTitle}
                          description={seoPreviewDesc}
                          ogImageFile={ogImageFile}
                          existingOgImage={
                            ogImageRemoved
                              ? undefined
                              : (collection?.ogImage ?? undefined)
                          }
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

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{form.watch("name")}&quot;?
              This will remove the collection but won&apos;t delete the products
              in it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(collection?.id ?? "");
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
