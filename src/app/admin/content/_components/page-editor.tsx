/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, Images, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Textarea } from "~/components/ui/textarea";
import { InputFormField } from "~/components/inputs/input-form-field";
import { MinimalTiptapFormField } from "~/components/inputs/minimal-tiptap-form-field";

const EMPTY_TIPTAP_DOC = { type: "doc", content: [] };

// Form schema
const pageFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  content: z.any(), // TipTap JSON
  excerpt: z.string().optional(),
  published: z.boolean(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
});

type PageFormValues = z.infer<typeof pageFormSchema>;

type PageEditorProps = {
  business: { id: string; name: string };
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
};

export function PageEditor({ business, page }: PageEditorProps) {
  const router = useRouter();
  const isEditing = !!page;
  const formRef = useRef<HTMLFormElement>(null);

  // Initialize form with TipTap content
  const form = useForm<PageFormValues>({
    resolver: zodResolver(pageFormSchema),
    defaultValues: {
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      content: page?.content ?? EMPTY_TIPTAP_DOC,
      excerpt: page?.excerpt ?? "",
      published: page?.published ?? false,
      metaTitle: page?.metaTitle ?? "",
      metaDescription: page?.metaDescription ?? "",
    },
  });

  // Auto-generate slug from title
  const handleTitleChange = (value: string) => {
    form.setValue("title", value);
    if (!isEditing) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      form.setValue("slug", slug);
    }
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
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Creating page...");
    },
  });

  const handleReset = () => {
    form.reset({
      title: page?.title ?? "",
      slug: page?.slug ?? "",
      content: page?.content ?? EMPTY_TIPTAP_DOC,
      excerpt: page?.excerpt ?? "",
      published: page?.published ?? false,
      metaTitle: page?.metaTitle ?? "",
      metaDescription: page?.metaDescription ?? "",
    });
  };

  const updatePage = api.content.updatePage.useMutation({
    onSuccess: () => {
      toast.dismiss();
      toast.success("Page updated successfully");
      router.refresh();
      handleReset();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message || "Failed to update page");
    },
    onSettled: () => {
      router.refresh();
    },
    onMutate: () => {
      toast.loading("Updating page...");
    },
  });

  const onSubmit = (data: PageFormValues) => {
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

    if (isEditing) {
      updatePage.mutate({ id: page.id, data: pageData });
    } else {
      createPage.mutate({ businessId: business.id, data: pageData });
    }
  };

  const isDirty = form.formState.isDirty;
  const isSaving = createPage.isPending || updatePage.isPending;

  return (
    <Form {...form}>
      <form
        ref={formRef}
        onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}
        onChange={() => console.log(form.formState)}
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
                {isEditing ? "Edit Page" : "Create Page"}
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
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Page Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Title */}

                  <InputFormField
                    form={form}
                    name="title"
                    label="Title *"
                    placeholder="About Us"
                    onChangeAdditional={(value) => handleTitleChange(value)}
                  />

                  {/* Slug */}
                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Slug *</FormLabel>
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
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Excerpt</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Brief summary..."
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <MinimalTiptapFormField
                    form={form}
                    name="content"
                    label="Content *"
                    description="Write your page content using the rich text editor"
                    placeholder="Start writing your page content..."
                    output="json"
                    editorContentClassName="min-h-[400px] p-4"
                    businessId={business.id}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="seo" className="mt-6 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>SEO Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Meta Title */}
                  <FormField
                    control={form.control}
                    name="metaTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder={form.watch("title") || "Page title"}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {field.value?.length ?? 0}/60 characters
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Meta Description */}
                  <FormField
                    control={form.control}
                    name="metaDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meta Description</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            placeholder="Brief description for search engines..."
                            rows={3}
                          />
                        </FormControl>
                        <p className="text-xs text-gray-500">
                          {field.value?.length ?? 0}/160 characters
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </form>
    </Form>
  );
}
