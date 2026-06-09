/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "~/lib/utils";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] };

// Form schema
const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.any(), // TipTap JSON
  excerpt: z.string().optional().nullable(),
  published: z.boolean(),
  metaTitle: z.string().optional().nullable(),
  metaDescription: z.string().optional().nullable(),
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
    metaTitle: string | null;
    metaDescription: string | null;
  };
  galleriesEnabled?: boolean;
  embedsEnabled?: boolean;
};

export function PageEditor({ page, galleriesEnabled, embedsEnabled }: PageEditorProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const formRef = useRef<HTMLFormElement>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  // Initialize form with TipTap content
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      content: page?.content ?? { ...EMPTY_TIPTAP_DOC },
      excerpt: page?.excerpt ?? "",
      published: page?.published ?? false,
      metaTitle: page?.metaTitle ?? "",
      metaDescription: page?.metaDescription ?? "",
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

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    if (!page?.id) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
  };

  const handleReset = (data?: PageFormValues) => {
    form.reset({
      title: data?.title ?? page?.title ?? "",
      slug: data?.slug ?? page?.slug ?? "",
      content: data?.content ?? page?.content ?? EMPTY_TIPTAP_DOC,
      excerpt: data?.excerpt ?? page?.excerpt ?? "",
      published: data?.published ?? page?.published ?? false,
      metaTitle: data?.metaTitle ?? page?.metaTitle ?? "",
      metaDescription: data?.metaDescription ?? page?.metaDescription ?? "",
    });
  };

  const createPage = api.content.createPage.useMutation({
    onSuccess: (data) => {
      toast.dismiss();
      toast.success("Page created successfully");
      router.push(`/admin/content/pages/${data.id}`);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to create page");
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
    const pageData = {
      title: data.title,
      slug: data.slug,
      content: data.content, // TipTap JSON
      excerpt: data.excerpt ?? "",
      published: data.published,
      metaTitle: data.metaTitle ?? "",
      metaDescription: data.metaDescription ?? "",
      type: "page" as const,
      template: "default" as const,
      sortOrder: 0,
    };

    if (page?.id) {
      updatePage.mutate({ id: page.id, data: pageData });
    } else {
      createPage.mutate({ data: pageData });
    }
  };

  const isSubmitting = updatePage.isPending || createPage.isPending;
  const isDeleting = deletePage.isPending;

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
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting || !isDirty}
                onClick={() => handleReset()}
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
          <div className="admin-container">
            <Tabs defaultValue="content">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
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

                    {/* Slug */}
                    <FormField
                      control={form.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            What is the page slug?{" "}
                            <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">/</span>
                            <FormControl>
                              <Input {...field} placeholder="about-us" />
                            </FormControl>
                          </div>
                          <p className="text-xs text-gray-500">
                            URL-friendly version (lowercase, hyphens)
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Excerpt */}
                    <TextareaFormField
                      form={form}
                      name="excerpt"
                      label="Provide a short description of the page"
                      placeholder="Our business is a local business that provides services to the community..."
                      rows={3}
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
                      required
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="seo" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO Settings</CardTitle>
                    <CardDescription>
                      Fine tune the meta title and description to help boost
                      your SEO for this page.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Meta Title */}
                    <InputFormField
                      form={form}
                      name="metaTitle"
                      label="Meta Title"
                      placeholder="All About a Thing"
                      descriptionClassName="text-xs text-gray-500"
                      description={`${form.watch("metaTitle")?.length ?? 0}/60 characters`}
                    />

                    {/* Meta Description */}
                    <TextareaFormField
                      form={form}
                      name="metaDescription"
                      label="Meta Description"
                      placeholder="All About a Thing: A detailed description of the page..."
                      descriptionClassName="text-xs text-gray-500"
                      description={`${form.watch("metaDescription")?.length ?? 0}/160 characters`}
                      rows={3}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </Form>
      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product</AlertDialogTitle>
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
