/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Eye, Images, Loader2, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
    onSuccess: () => {
      toast.success("Page created successfully");
      router.push("/admin/content/pages");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create page");
    },
  });

  const updatePage = api.content.updatePage.useMutation({
    onSuccess: () => {
      toast.success("Page updated successfully");
      router.refresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update page");
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4 flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/content/pages">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? "Edit Page" : "Create Page"}
              </h1>
              <p className="mt-2 text-gray-600">
                {isEditing
                  ? "Update page content"
                  : "Add a new page to your site"}
              </p>
            </div>
            <div className="flex items-center gap-3">
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
                onClick={form.handleSubmit(onSubmit)}
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {isEditing ? "Update" : "Create"}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              onChange={(e) =>
                                handleTitleChange(e.target.value)
                              }
                              placeholder="About Us"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
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

                    {/* TipTap Editor */}
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
          </form>
        </Form>
      </div>
    </div>
  );
}
