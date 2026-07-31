"use client";

import type { z } from "zod";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ExternalLink, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { ServiceFormData } from "~/lib/validators/services";
import type { RouterOutputs } from "~/trpc/react";
import {
  getDefaultServiceTemplateId,
  getServiceTemplatesForStorefront,
} from "~/lib/service-templates";
import { cn } from "~/lib/utils";
import { serviceFormSchema } from "~/lib/validators/services";
import { api } from "~/trpc/react";
import { useDirtyForm } from "~/hooks/use-dirty-form";
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
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";
import { TemplateImageUploadField } from "~/app/admin/content/template/_components/template-field-widgets";

type Props = {
  /** Pass a service when in edit mode; omit for create mode. */
  service?: RouterOutputs["services"]["getById"];
  /**
   * The current business's storefront templateId (e.g. "pollen", "vii",
   * "modern"). Controls which service-page templates are shown in the picker.
   */
  storefrontTemplateId: string;
};

export function ServiceForm({ service, storefrontTemplateId }: Props) {
  const serviceTemplateDefs =
    getServiceTemplatesForStorefront(storefrontTemplateId);
  const router = useRouter();
  const utils = api.useUtils();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState<string>(service?.image ?? "");

  const form = useForm<z.input<typeof serviceFormSchema>>({
    resolver: zodResolver(serviceFormSchema),
    mode: "onTouched",
    defaultValues: {
      name: service?.name ?? "",
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
    },
  });

  const createMutation = api.services.create.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Service created successfully");
      void utils.services.invalidate();
      router.push(`/admin/services/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to create service");
    },
    onMutate: () => toast.loading("Creating service..."),
  });

  const updateMutation = api.services.update.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Service updated successfully");
      void utils.services.invalidate();
      form.reset({
        name: data.name,
        description: data.description ?? "",
        image: data.image ?? undefined,
        serviceTemplateId: data.serviceTemplateId,
        published: data.published,
        metaTitle: data.metaTitle ?? "",
        metaDescription: data.metaDescription ?? "",
        metaKeywords: data.metaKeywords ?? "",
        ogImage: data.ogImage ?? undefined,
      });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to update service");
    },
    onMutate: () => toast.loading("Updating service..."),
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

  const onSubmit = (data: z.input<typeof serviceFormSchema>) => {
    const payload = {
      name: data.name,
      description: data.description,
      image: imageUrl || undefined,
      serviceTemplateId:
        data.serviceTemplateId ??
        getDefaultServiceTemplateId(storefrontTemplateId),
      published: data.published ?? false,
      metaTitle: data.metaTitle,
      metaDescription: data.metaDescription,
      metaKeywords: data.metaKeywords,
      ogImage: data.ogImage,
    } satisfies ServiceFormData;
    if (service?.id) {
      updateMutation.mutate({ id: service.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const watchedName = form.watch("name") ?? "";
  const metaTitleVal = form.watch("metaTitle") ?? "";
  const metaDescVal = form.watch("metaDescription") ?? "";

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty = form.formState.isDirty || imageUrl !== (service?.image ?? "");

  useDirtyForm(isDirty);

  return (
    <Form {...form}>
      <form
        onSubmit={(e) =>
          void form.handleSubmit(onSubmit, (errors) => {
            const first = Object.values(errors)[0];
            toast.error(
              first?.message ??
                "Please fix the highlighted fields and try again.",
            );
          })(e)
        }
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
                {service?.id
                  ? (service?.name ?? "Edit Service")
                  : "New Service"}
              </h1>
              <span
                className={cn(
                  "admin-status-badge",
                  `${isDirty ? "isDirty" : "isPublished"} ${!service?.id ? "isNew" : ""}`,
                )}
              >
                {isDirty ? "Unsaved Changes" : !service?.id ? "Draft" : "Saved"}
              </span>
            </div>
          </div>

          <div className="toolbar-actions">
            {service?.id && service.published && (
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="hidden sm:inline-flex"
              >
                <a
                  href={`/services/${service.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="View on storefront"
                  title="View on storefront"
                >
                  <ExternalLink className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">View on storefront</span>
                </a>
              </Button>
            )}

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

            {service && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setShowDeleteDialog(true)}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Delete</span>
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting || !isDirty}
              onClick={() => {
                form.reset();
                setImageUrl(service?.image ?? "");
              }}
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

        <div className="admin-container space-y-6">
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
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Service name{" "}
                          <span className="text-destructive" aria-hidden="true">
                            *
                          </span>
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Facial Treatments"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* URL preview */}
                  <p className="text-muted-foreground text-xs">
                    Storefront URL:{" "}
                    <span className="font-mono">
                      {service?.id
                        ? `/services/${service.slug || "…"}`
                        : `/services/${
                            watchedName
                              ? watchedName
                                  .toLowerCase()
                                  .replace(/\s+/g, "-")
                                  .replace(/[^a-z0-9-]/g, "")
                              : "…"
                          }`}
                    </span>
                  </p>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Describe what this service group includes…"
                            rows={4}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Cover image — uploads immediately, stores URL */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Cover image</Label>
                    <TemplateImageUploadField
                      value={imageUrl}
                      onChange={setImageUrl}
                      description="Used as the service thumbnail on the /services index page"
                    />
                  </div>
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
                                  isSelected
                                    ? "text-primary"
                                    : "text-foreground",
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

              {/* SEO */}
              <Card>
                <CardHeader>
                  <CardTitle>SEO</CardTitle>
                  <CardDescription>
                    Meta title and description for search engines
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => {
                      const len = metaTitleVal.length;
                      const over = len > 60;
                      return (
                        <FormItem>
                          <FormLabel>Meta Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Facial Treatments"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription
                            className={over ? "text-destructive" : undefined}
                          >
                            {len}/60 characters (optimal: 50–60)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => {
                      const len = metaDescVal.length;
                      const over = len > 160;
                      return (
                        <FormItem>
                          <FormLabel>Meta Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Professional facial treatments…"
                              rows={3}
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                            />
                          </FormControl>
                          <FormDescription
                            className={over ? "text-destructive" : undefined}
                          >
                            {len}/160 characters (optimal: 150–160)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="metaKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Keywords</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., facial, treatments, skincare, spa"
                            value={field.value ?? ""}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                          />
                        </FormControl>
                        <FormDescription>Comma-separated keywords</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </form>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;
              {form.watch("name") ?? ""}&quot;? All associated service items
              will also be deleted. This action cannot be undone.
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
    </Form>
  );
}
