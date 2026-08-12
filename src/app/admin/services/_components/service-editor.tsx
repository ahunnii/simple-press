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
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ServiceFormValues, ServiceRecord } from "./service-form";
import type { ServiceFormData } from "~/lib/validators/services";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { getDefaultServiceTemplateId } from "~/lib/service-templates";
import { parseTemplateListRows } from "~/lib/template-fields";
import { cn, sanitizeSlugInput, slugify } from "~/lib/utils";
import { serviceFormSchema } from "~/lib/validators/services";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
import { useKeyboardEnter } from "~/hooks/use-keyboard-enter";
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
import {
  erroredTabsFor,
  TabErrorDot,
} from "~/app/admin/_components/form-tab-errors";

import { ServiceForm, ServiceSeoFields } from "./service-form";
import { ServiceItemsEditor } from "./service-items-editor";
import { ServiceTemplateFieldsEditor } from "./service-template-fields-editor";

type ServiceEditorTab = "details" | "items" | "seo" | "content";

const SEO_TAB_FIELDS = new Set<string>([
  "slug",
  "metaTitle",
  "metaDescription",
  "metaKeywords",
  "ogImage",
]);

const tabForField = (name: string): ServiceEditorTab =>
  SEO_TAB_FIELDS.has(name.split(".")[0] ?? name) ? "seo" : "details";

/**
 * Stable toast ids. The record save and the page-content save can now run from
 * the same click, and the old global `toast.dismiss()` in each handler meant
 * whichever finished first wiped the other's still-pending spinner.
 */
const RECORD_TOAST = "service-record-save";
const CONTENT_TOAST = "service-content-save";

/** Narrow a Prisma JSON column to a plain object of field values. */
function toFieldRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

type Props = {
  /** Pass a service when in edit mode; omit for create mode. */
  service?: ServiceRecord;
  embedsEnabled?: boolean;
  /**
   * The current business's storefront templateId (e.g. "pollen", "vii",
   * "modern"). Controls which service-page templates are shown in the picker.
   */
  storefrontTemplateId: string;
};

/**
 * Single owner of the service edit page: the sticky toolbar, the tab strip, the
 * Details/SEO RHF form, and the Page-content draft.
 *
 * Everything the owner can act on (Back, title, status, Published, More
 * Options, Save) lives in one `admin-form-toolbar` *inside* the `<form>`, so it
 * stays put on every tab. Save is deliberately `type="button"`: it persists
 * whatever is dirty — the record, the page-content draft, or both — from any
 * tab, which a plain submit button could not do.
 */
export function ServiceEditor({
  service,
  embedsEnabled,
  storefrontTemplateId,
}: Props) {
  const router = useRouter();
  const utils = api.useUtils();

  const [activeTab, setActiveTab] = useState<ServiceEditorTab>("details");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const ogImageFileInputRef = useRef<HTMLInputElement | null>(null);
  const slugManuallyEditedRef = useRef(false);
  // URLs uploaded to S3 during the in-flight submit that aren't yet persisted
  // to the DB. Populated right before `create`/`update` is called (those are
  // fire-and-forget `mutate`, not `mutateAsync`) so the mutation's `onError`
  // can discard them — otherwise a rejected save orphans them in S3 forever
  // (`services.delete` deliberately never deletes objects).
  const pendingUploadUrlsRef = useRef<string[]>([]);

  const [ogImageFile, setOgImageFile] = useState<File | null>(null);
  const [ogImageRemoved, setOgImageRemoved] = useState(false);

  // ─── Page-content draft ────────────────────────────────────────────────────
  const initialCustomFields = useMemo(
    () => toFieldRecord(service?.customFields),
    [service?.customFields],
  );
  const [customFields, setCustomFields] =
    useState<Record<string, unknown>>(initialCustomFields);
  const [contentDirty, setContentDirty] = useState(false);

  // Section rows drive the "Specific services" section picker. Read from the
  // live draft so sections added on the Page content tab are pickable without
  // a round-trip.
  const sections = parseTemplateListRows(
    customFields["vii-collection.sections"],
  );

  // ─── Details + SEO form ────────────────────────────────────────────────────
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: service?.name ?? "",
      slug: service?.slug ?? "",
      description: service?.description ?? "",
      image: service?.image ?? undefined,
      serviceTemplateId:
        service?.serviceTemplateId ??
        getDefaultServiceTemplateId(storefrontTemplateId),
      // New services start published, matching products, collections, and
      // service items — an owner creating one almost always intends it to go
      // live, and the toolbar Switch is right there to opt out.
      published: service?.published ?? true,
      metaTitle: service?.metaTitle ?? "",
      metaDescription: service?.metaDescription ?? "",
      metaKeywords: service?.metaKeywords ?? "",
      ogImage: service?.ogImage ?? undefined,
      imageFile: undefined,
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

  // ─── Slug freeze ───────────────────────────────────────────────────────────
  // The slug only tracks the name while nothing can be linking to it yet: a
  // brand-new service, or one that is unpublished and staying unpublished.
  // Once it's live the URL is frozen and renaming is a separate, explicit act
  // — there is no redirect infrastructure, so a silent slug change 404s every
  // existing link. Same contract as Collections and Products.
  const slugAutoSyncs = (livePublished: boolean) =>
    !service || (!service.published && !livePublished);

  const handleNameChange = (value: string) => {
    if (!value) return;
    if (slugManuallyEditedRef.current) return;
    if (!slugAutoSyncs(form.getValues("published") ?? false)) return;
    form.setValue("slug", slugify(value), { shouldValidate: true });
  };

  const handleSlugChange = (value: string) => {
    slugManuallyEditedRef.current = true;
    form.setValue("slug", sanitizeSlugInput(value), {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleInvalidSubmit = (errors: FieldErrors<ServiceFormValues>) => {
    const first = Object.keys(errors)[0];
    if (first) setActiveTab(tabForField(first));
    const firstError = Object.values(errors)[0];
    toast.error(
      firstError?.message ?? "Please fix the highlighted fields and try again.",
    );
  };

  const revealServerErrorTab = () => {
    const first = Object.keys(form.getValues()).find(
      (name) => form.getFieldState(name as Path<ServiceFormValues>).invalid,
    );
    if (first) setActiveTab(tabForField(first));
  };

  const createMutation = api.services.create.useMutation({
    onSuccess: (data) => {
      // Uploads from this submit are now persisted (referenced by the new
      // service) — nothing to discard.
      pendingUploadUrlsRef.current = [];
      toast.success("Service created successfully", { id: RECORD_TOAST });
      void utils.services.invalidate();
      router.push(`/admin/services/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss(RECORD_TOAST);
      discardPendingUploads();
      applyTrpcErrorToForm(form, err, {
        fieldMap: { slug: "slug" },
        fallbackMessage: "Failed to create service",
      });
      revealServerErrorTab();
    },
    onMutate: () => toast.loading("Creating service...", { id: RECORD_TOAST }),
  });

  const updateMutation = api.services.update.useMutation({
    onSuccess: (data) => {
      pendingUploadUrlsRef.current = [];
      toast.success("Service updated successfully", { id: RECORD_TOAST });
      void utils.services.invalidate();
      form.reset({
        name: data.name,
        slug: data.slug,
        description: data.description ?? "",
        image: data.image ?? undefined,
        serviceTemplateId: data.serviceTemplateId,
        published: data.published,
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        metaKeywords: data.metaKeywords ?? "",
        ogImage: data.ogImage ?? undefined,
        // Back to "untouched" so the cover field falls through to the freshly
        // saved `service.image` preview instead of the consumed File.
        imageFile: undefined,
      });
      setOgImageFile(null);
      setOgImageRemoved(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = "";
      if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss(RECORD_TOAST);
      discardPendingUploads();
      applyTrpcErrorToForm(form, err, {
        // The server throws BAD_REQUEST "A service with this slug already
        // exists" — this pins that onto the slug input instead of a toast.
        fieldMap: { slug: "slug" },
        fallbackMessage: "Failed to update service",
      });
      revealServerErrorTab();
    },
    onMutate: () => toast.loading("Updating service...", { id: RECORD_TOAST }),
  });

  const duplicateMutation = api.services.duplicate.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Service duplicated — draft saved");
      void utils.services.invalidate();
      router.push(`/admin/services/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to duplicate service");
    },
    onMutate: () => toast.loading("Duplicating service..."),
  });

  const deleteMutation = api.services.delete.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Service deleted successfully");
      void utils.services.invalidate();
      router.push("/admin/services");
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to delete service");
    },
    onMutate: () => toast.loading("Deleting service..."),
  });

  const updateCustomFieldsMutation =
    api.services.updateCustomFields.useMutation({
      onSuccess: () => {
        toast.success("Page content saved", { id: CONTENT_TOAST });
        setContentDirty(false);
        router.refresh();
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to save page content", {
          id: CONTENT_TOAST,
        });
      },
      onMutate: () =>
        toast.loading("Saving page content…", { id: CONTENT_TOAST }),
    });

  /**
   * Persist the Page-content draft. No-op unless there's something to write,
   * so it's safe to call from every save path.
   */
  const flushContent = () => {
    if (!service?.id || !contentDirty) return;
    updateCustomFieldsMutation.mutate({ id: service.id, customFields });
  };

  const onSubmit = async (data: ServiceFormValues) => {
    // The Published switch is visible on every tab, so a save started from the
    // Page content tab has to carry the record too — and vice versa. Both
    // halves go out from this one handler.
    flushContent();

    // Track objects uploaded to S3 during this submit so they can be discarded
    // if anything fails before (or during) the save mutation.
    const uploadedThisSubmit: string[] = [];

    let image: string | null | undefined;
    const imageFile = data.imageFile;
    if (imageFile === null) {
      image = null;
    } else if (imageFile instanceof File) {
      try {
        const response = await imageUploader.upload(imageFile);
        const fileLocation =
          (response.file.objectInfo.metadata?.pathname as string | undefined) ??
          "";
        if (fileLocation) {
          image = fileLocation;
          uploadedThisSubmit.push(fileLocation);
        }
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      image = data.image ?? undefined;
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
        // The cover image (if any) uploaded successfully above but we're
        // bailing before the save mutation ever runs — nothing will reference
        // it, so discard it now instead of leaving it orphaned.
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

    const payload = {
      name: data.name,
      slug: data.slug,
      description: data.description,
      image,
      serviceTemplateId:
        data.serviceTemplateId ??
        getDefaultServiceTemplateId(storefrontTemplateId),
      published: data.published ?? false,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      metaKeywords: data.metaKeywords,
      ogImage: resolvedOgImage,
    } satisfies ServiceFormData;

    if (service?.id) {
      updateMutation.mutate({ id: service.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setCustomFields((prev) => ({ ...prev, [key]: value }));
    setContentDirty(true);
  };

  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    // Without these the Save button stayed live while a picked file was still
    // uploading, so a second click could fire the save mid-upload.
    imageUploader.isPending ||
    ogImageUploader.isPending;
  const isDeleting = deleteMutation.isPending;
  const isSavingContent = updateCustomFieldsMutation.isPending;

  // The cover image is an RHF field now (`imageFile`), so `formState.isDirty`
  // covers it — the old `imageUrl` string state and its manual diff are gone.
  // The OG image is still parent-held state, so it's OR'd in explicitly.
  const isOgImageDirty = ogImageFile !== null || ogImageRemoved;
  const isFormDirty = form.formState.isDirty || isOgImageDirty;
  const isDirty = isFormDirty || contentDirty;

  /**
   * One Save for the whole editor, on every tab. It used to be contextual —
   * on the Page content tab it only wrote `customFields` — which silently
   * discarded the toolbar's Published toggle while the dirty badge kept
   * insisting there were unsaved changes.
   */
  const handleSaveAll = () => {
    if (isFormDirty || !service?.id) {
      // `onSubmit` flushes the page-content draft itself, so one click lands
      // both halves. A validation error blocks both rather than half-saving.
      void form.handleSubmit(onSubmit, handleInvalidSubmit)();
      return;
    }
    flushContent();
  };

  /** Restore everything — record fields, images and the content draft. */
  const handleResetAll = () => {
    form.reset();
    slugManuallyEditedRef.current = false;
    setOgImageFile(null);
    setOgImageRemoved(false);
    if (imageFileInputRef.current) imageFileInputRef.current.value = "";
    if (ogImageFileInputRef.current) ogImageFileInputRef.current.value = "";
    setCustomFields({ ...initialCustomFields });
    setContentDirty(false);
  };

  useKeyboardEnter(form, onSubmit, handleInvalidSubmit);
  useDirtyForm(isDirty);

  const { errors: formErrors, isSubmitted: saveAttempted } = form.formState;
  const erroredTabs = useMemo(
    () =>
      saveAttempted
        ? erroredTabsFor(formErrors, tabForField)
        : new Set<ServiceEditorTab>(),
    [saveAttempted, formErrors],
  );

  const watchedName = form.watch("name") ?? "";
  const watchedSlug = form.watch("slug") ?? "";
  const nameDerivedSlug = slugify(watchedName);
  const slugFrozen = !slugAutoSyncs(form.watch("published") ?? false);
  const showRenameWarning =
    slugFrozen &&
    !!service &&
    watchedName.trim() !== service.name &&
    nameDerivedSlug !== watchedSlug;

  const isBusy = isSubmitting || isSavingContent;

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={(e) => {
            // The Page content / Specific services bodies live inside this
            // <form> so they share the toolbar. Neither has a submit button,
            // so an Enter keypress in one of their text fields would otherwise
            // implicitly submit — and silently save Details/SEO instead of
            // whatever the owner was actually editing. The toolbar Save is
            // `type="button"` and calls `handleSaveAll`, so this guard only
            // ever sees implicit submits.
            if (activeTab !== "details" && activeTab !== "seo") {
              e.preventDefault();
              return;
            }
            void form.handleSubmit(onSubmit, handleInvalidSubmit)(e);
          }}
          className="bg-muted/40 min-h-screen"
        >
          <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
            <div className="toolbar-info">
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/admin/services">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
              <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="truncate text-base font-medium">
                  {service?.id ? watchedName || "Edit Service" : "New Service"}
                </h1>
                <span
                  className={cn(
                    "admin-status-badge",
                    `${isDirty ? "isDirty" : "isPublished"} ${!service?.id ? "isNew" : ""}`,
                  )}
                >
                  {isDirty
                    ? "Unsaved Changes"
                    : !service?.id
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
                    <Label htmlFor="service-published" className="text-sm">
                      Published
                    </Label>
                    <Switch
                      id="service-published"
                      aria-label="Published"
                      checked={field.value ?? false}
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
                  {service?.id && service.published && (
                    <DropdownMenuItem asChild>
                      <a
                        href={`/services/${service.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="View on storefront (opens in new tab)"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View on storefront
                      </a>
                    </DropdownMenuItem>
                  )}

                  {service?.id && (
                    <DropdownMenuItem
                      disabled={isBusy || duplicateMutation.isPending}
                      onClick={() => duplicateMutation.mutate(service.id)}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    disabled={isBusy || !isDirty}
                    onClick={handleResetAll}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset
                  </DropdownMenuItem>

                  {service && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        disabled={isBusy}
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/*
                Per-item edits on the Specific services tab write through their
                own mutations, so the toolbar Save has nothing to do with them.
              */}
              {activeTab === "items" && (
                <span className="text-muted-foreground hidden text-xs sm:inline">
                  Items save as you add or edit them
                </span>
              )}

              <Button
                type="button"
                size="sm"
                disabled={isBusy || (!!service?.id && !isDirty)}
                onClick={handleSaveAll}
              >
                {isBusy ? (
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
              onValueChange={(value) => setActiveTab(value as ServiceEditorTab)}
              className="w-full"
            >
              <TabsList>
                <TabsTrigger value="details">
                  Details
                  {erroredTabs.has("details") && <TabErrorDot />}
                </TabsTrigger>
                {/*
                  Items and page content write through their own
                  serviceId-scoped mutations, so they can't exist until the
                  service record does.
                */}
                {service && (
                  <TabsTrigger value="items">Specific services</TabsTrigger>
                )}
                <TabsTrigger value="seo">
                  SEO
                  {erroredTabs.has("seo") && <TabErrorDot />}
                </TabsTrigger>
                {service && (
                  <TabsTrigger value="content">Page content</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                <ServiceForm
                  form={form}
                  service={service}
                  storefrontTemplateId={storefrontTemplateId}
                  onNameChange={handleNameChange}
                  showRenameWarning={showRenameWarning}
                  onUpdateUrl={() => {
                    slugManuallyEditedRef.current = true;
                    form.setValue("slug", nameDerivedSlug, {
                      shouldValidate: true,
                      shouldDirty: true,
                    });
                    setActiveTab("seo");
                  }}
                  onEditSeo={() => setActiveTab("seo")}
                  imageFileInputRef={imageFileInputRef}
                  disabled={isSubmitting}
                />
              </TabsContent>

              {service && (
                <TabsContent value="items" className="space-y-6">
                  <ServiceItemsEditor
                    serviceId={service.id}
                    items={service.items}
                    serviceTemplateId={service.serviceTemplateId}
                    sections={sections}
                    embedsEnabled={embedsEnabled}
                  />
                </TabsContent>
              )}

              <TabsContent value="seo" className="space-y-6">
                <ServiceSeoFields
                  form={form}
                  service={service}
                  onSlugChange={handleSlugChange}
                  ogImageFile={ogImageFile}
                  ogImageRemoved={ogImageRemoved}
                  ogImageFileInputRef={ogImageFileInputRef}
                  onOgImageFileChange={(file) => {
                    setOgImageFile(file);
                    setOgImageRemoved(false);
                  }}
                  onOgImageRemove={() => {
                    setOgImageFile(null);
                    setOgImageRemoved(true);
                  }}
                  disabled={isSubmitting}
                />
              </TabsContent>

              {service && (
                <TabsContent value="content" className="space-y-6">
                  <ServiceTemplateFieldsEditor
                    serviceTemplateId={service.serviceTemplateId}
                    customFields={customFields}
                    onFieldChange={handleFieldChange}
                    embedsEnabled={embedsEnabled}
                  />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </form>
      </Form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {watchedName}&quot;? All associated service items will also be
              deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate(service?.id ?? "");
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
