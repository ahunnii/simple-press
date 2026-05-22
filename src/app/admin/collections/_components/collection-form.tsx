"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadFile } from "@better-upload/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { CollectionFormData } from "~/lib/validators/collections";
import type { RouterOutputs } from "~/trpc/react";
import { cn } from "~/lib/utils";
import { collectionFormSchema } from "~/lib/validators/collections";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Form, FormField } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Switch } from "~/components/ui/switch";
import { ImageUploadFormField } from "~/components/inputs/image-upload-form-field";
import { InputFormField } from "~/components/inputs/input-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

type Props = {
  collection?: RouterOutputs["collections"]["getById"];
  allProducts: RouterOutputs["product"]["secureGetAll"];
};

export function CollectionForm({ collection, allProducts }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement | null>(null);
  const utils = api.useUtils();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const form = useForm<CollectionFormData>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      ...collection,
      name: collection?.name ?? undefined,
      description: collection?.description ?? undefined,
      imageUrl: collection?.imageUrl ?? undefined,
      metaTitle: collection?.metaTitle ?? undefined,
      metaDescription: collection?.metaDescription ?? undefined,
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

  const createMutation = api.collections.create.useMutation({
    onSuccess: async (data) => {
      toast.dismiss();
      toast.loading("Collection created successfully, updating products...");

      const productIds = form.getValues("productIds");
      for (const productId of productIds) {
        await utils.client.collections.addProduct.mutate({
          collectionId: data.id,
          productId,
        });
      }
      toast.dismiss();
      toast.success("Products updated successfully");

      void utils.collections.invalidate();
      router.push(`/admin/collections/${data.id}`);
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to create collection");
    },
    onMutate: () => {
      toast.loading("Creating collection...");
    },
  });

  const updateMutation = api.collections.update.useMutation({
    onSuccess: async (data) => {
      toast.dismiss();
      toast.success("Collection updated successfully, updating products...");

      if (collection) {
        const currentProductIds = new Set(
          collection.collectionProducts.map((cp) => cp.product.id),
        );
        const selectedIds = new Set(form.getValues("productIds"));

        for (const productId of selectedIds) {
          if (!currentProductIds.has(productId)) {
            await utils.client.collections.addProduct.mutate({
              collectionId: data.id,
              productId,
            });
          }
        }

        for (const productId of currentProductIds) {
          if (!selectedIds.has(productId)) {
            await utils.client.collections.removeProduct.mutate({
              collectionId: data.id,
              productId,
            });
          }
        }
      }

      toast.dismiss();
      toast.success("Products updated successfully");

      void utils.collections.invalidate();
      const values = form.getValues();
      form.reset({
        ...values,
        name: data.name,
        description: data.description ?? undefined,
        imageUrl: data.imageUrl ?? undefined,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
      });
      router.refresh();
    },
    onError: (err) => {
      toast.dismiss();
      toast.error(err.message ?? "Failed to update collection");
    },
    onMutate: () => {
      toast.loading("Updating collection...");
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
        if (fileLocation) imageUrl = fileLocation;
      } catch {
        toast.error("Failed to upload image.");
        return;
      }
    } else {
      imageUrl = data.imageUrl ?? undefined;
    }

    if (collection?.id) {
      updateMutation.mutate({
        id: collection.id,
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
      });
    } else {
      createMutation.mutate({
        name: data.name,
        description: data.description ?? undefined,
        imageUrl,
        published: data.published,
        metaTitle: data.metaTitle ?? undefined,
        metaDescription: data.metaDescription ?? undefined,
      });
    }
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const isDirty = form.formState.isDirty;

  useKeyboardEnter(form, onSubmit);
  useDirtyForm(isDirty);

  return (
    <>
      <Form {...form}>
        <form
          ref={formRef}
          onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
          className="min-h-screen bg-gray-50"
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
              <div className="hidden min-w-0 items-center gap-2 sm:flex">
                <h1 className="text-base font-medium">
                  {collection?.id
                    ? (collection?.name ?? "Edit Collection")
                    : "New Collection"}
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
                  <div className="flex items-center gap-2">
                    <Label htmlFor="published">Published</Label>
                    <Switch
                      id="published"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </div>
                )}
              />

              {collection && (
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
                onClick={() => form.reset()}
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
              <div className="col-span-1 space-y-4">
                {/* Basic Info */}
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
                      placeholder="Summer Collection"
                      required
                    />
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
              </div>
              <div className="col-span-1 space-y-4">
                {/* SEO */}
                <Card>
                  <CardHeader>
                    <CardTitle>SEO</CardTitle>
                    <CardDescription>
                      Fine tune the meta title and description to help boost
                      your SEO for this collection.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <InputFormField
                      form={form}
                      name="metaTitle"
                      label="Meta Title"
                      placeholder="Summer Collection"
                      description={`${form.watch("metaTitle")?.length ?? 0}/60 characters (optimal: 50-60)`}
                    />
                    <TextareaFormField
                      form={form}
                      name="metaDescription"
                      label="Meta Description"
                      placeholder="Summer Collection: Bright and Vibrant Styles"
                      rows={3}
                      description={`${form.watch("metaDescription")?.length ?? 0}/160 characters (optimal: 150-160)`}
                    />
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-full">
                {/* Products */}
                <Card>
                  <CardHeader>
                    <CardTitle>Products</CardTitle>
                    <CardDescription>
                      Select products to include in this collection
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="productIds"
                      render={({ field }) => {
                        const ids = field.value;
                        const toggleProduct = (productId: string) => {
                          const next = new Set(ids);
                          if (next.has(productId)) next.delete(productId);
                          else next.add(productId);
                          field.onChange([...next]);
                        };
                        return (
                          <>
                            <ScrollArea className="h-96 min-h-0 overflow-hidden">
                              <div className="space-y-2">
                                {allProducts?.map((product) => (
                                  <div
                                    key={product.id}
                                    className="flex cursor-pointer items-center gap-3 rounded border p-3 hover:bg-gray-50"
                                    onClick={() => toggleProduct(product.id)}
                                  >
                                    <span
                                      className="shrink-0"
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={(e) => e.stopPropagation()}
                                    >
                                      <Checkbox
                                        checked={ids.includes(product.id)}
                                        onCheckedChange={(checked) => {
                                          if (checked === "indeterminate")
                                            return;
                                          toggleProduct(product.id);
                                        }}
                                      />
                                    </span>
                                    {product.images[0] && (
                                      <div className="relative h-12 w-12 rounded bg-gray-100">
                                        <Image
                                          src={product.images[0].url}
                                          alt={product.name}
                                          fill
                                          className="rounded object-cover"
                                        />
                                      </div>
                                    )}
                                    <div className="flex-1">
                                      <p className="font-medium">
                                        {product.name}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        ${(product.price / 100).toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>

                            <p className="mt-4 text-sm text-gray-500">
                              {ids.length} products selected
                            </p>
                          </>
                        );
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </form>
      </Form>

      {/* Delete Dialog */}
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
