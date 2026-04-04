"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { GalleryCreateData } from "~/lib/validators/gallery";
import { cn } from "~/lib/utils";
import { galleryCreateSchema } from "~/lib/validators/gallery";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

import { LayoutPreview } from "./layout-preview";

const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();

export function NewGalleryForm() {
  const router = useRouter();
  const utils = api.useUtils();

  const form = useForm<GalleryCreateData>({
    resolver: zodResolver(galleryCreateSchema),
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      layout: "grid",
      columns: 3,
      gap: 16,
      showCaptions: true,
      enableLightbox: true,
    },
  });

  const createMutation = api.gallery.create.useMutation({
    onSuccess: ({ data, message }) => {
      toast.dismiss();
      toast.success(message);
      void utils.gallery.invalidate();
      router.push(`/admin/galleries/${data.id}`);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to create gallery");
    },
    onMutate: () => {
      toast.loading("Creating gallery...");
    },
  });

  const onSubmit = (data: GalleryCreateData) => {
    createMutation.mutate({
      ...data,
      description: data.description?.trim() ?? undefined,
    });
  };

  const layout = form.watch("layout");
  const columns = form.watch("columns");
  const gap = form.watch("gap");
  const isDirty = form.formState.isDirty;

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        className="min-h-screen bg-gray-50"
      >
        <div className={cn("admin-form-toolbar", isDirty ? "dirty" : "")}>
          <div className="toolbar-info">
            <Button variant="ghost" size="sm" asChild className="shrink-0">
              <Link href="/admin/galleries">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
            <div className="bg-border hidden h-6 w-px shrink-0 sm:block" />
            <div className="hidden min-w-0 items-center gap-2 sm:flex">
              <h1 className="text-base font-medium">New Gallery</h1>
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
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/galleries">Cancel</Link>
            </Button>

            <Button type="submit" size="sm" disabled={createMutation.isPending}>
              {createMutation.isPending ? (
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
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your gallery a name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Gallery Name <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="My Gallery"
                        onChange={(e) => {
                          field.onChange(e);
                          const currentSlug = form.getValues("slug");
                          const prevName = field.value;
                          if (
                            !currentSlug ||
                            currentSlug === slugify(prevName)
                          ) {
                            form.setValue("slug", slugify(e.target.value), {
                              shouldDirty: true,
                            });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Slug <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="my-gallery"
                        onChange={(e) =>
                          field.onChange(slugify(e.target.value))
                        }
                      />
                    </FormControl>
                    <p className="text-muted-foreground text-xs">
                      URL: /galleries/{form.watch("slug") || "my-gallery"}
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Describe what this gallery is about..."
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Layout Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Layout Settings</CardTitle>
              <CardDescription>
                Choose how your gallery will be displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="layout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Layout Style</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="grid">
                          <div className="flex items-center gap-2">
                            <span>⊞</span>
                            <div>
                              <div className="font-medium">Grid</div>
                              <div className="text-xs text-gray-500">
                                Equal-sized images in rows and columns
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="masonry">
                          <div className="flex items-center gap-2">
                            <span>▦</span>
                            <div>
                              <div className="font-medium">Masonry</div>
                              <div className="text-xs text-gray-500">
                                Pinterest-style cascading layout
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="carousel">
                          <div className="flex items-center gap-2">
                            <span>⊏</span>
                            <div>
                              <div className="font-medium">Carousel</div>
                              <div className="text-xs text-gray-500">
                                Slideshow with navigation
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="collage">
                          <div className="flex items-center gap-2">
                            <span>▤</span>
                            <div>
                              <div className="font-medium">Collage</div>
                              <div className="text-xs text-gray-500">
                                Mixed sizes arrangement
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                        <SelectItem value="justified">
                          <div className="flex items-center gap-2">
                            <span>▬</span>
                            <div>
                              <div className="font-medium">Justified</div>
                              <div className="text-xs text-gray-500">
                                Flickr-style justified rows
                              </div>
                            </div>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {(layout === "grid" || layout === "masonry") && (
                <>
                  <FormField
                    control={form.control}
                    name="columns"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columns</FormLabel>
                        <Select
                          value={field.value.toString()}
                          onValueChange={(v) => field.onChange(parseInt(v))}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2">2 columns</SelectItem>
                            <SelectItem value="3">3 columns</SelectItem>
                            <SelectItem value="4">4 columns</SelectItem>
                            <SelectItem value="5">5 columns</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="gap"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gap between images (px)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={0}
                            max={64}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value) || 16)
                            }
                          />
                        </FormControl>
                        <p className="text-muted-foreground text-xs">
                          Recommended: 8–24px
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </CardContent>
          </Card>

          {/* Display Options */}
          <Card>
            <CardHeader>
              <CardTitle>Display Options</CardTitle>
              <CardDescription>
                Configure how images are displayed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="showCaptions"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Show Image Captions</FormLabel>
                        <p className="text-sm text-gray-500">
                          Display captions below or over images
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="enableLightbox"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <FormLabel>Enable Lightbox</FormLabel>
                        <p className="text-sm text-gray-500">
                          Allow users to view full-size images
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Layout Preview</CardTitle>
              <CardDescription>
                How your gallery layout will look
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LayoutPreview layout={layout} columns={columns} gap={gap} />
            </CardContent>
          </Card>
        </div>
      </form>
    </Form>
  );
}
