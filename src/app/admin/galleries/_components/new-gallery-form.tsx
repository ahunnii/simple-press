"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

type NewGalleryFormProps = {
  businessId: string;
};

export function NewGalleryForm({ businessId }: NewGalleryFormProps) {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [layout, setLayout] = useState<
    "grid" | "masonry" | "carousel" | "collage" | "justified"
  >("grid");
  const [columns, setColumns] = useState(3);
  const [gap, setGap] = useState(16);
  const [showCaptions, setShowCaptions] = useState(true);
  const [enableLightbox, setEnableLightbox] = useState(true);

  const createMutation = api.gallery.create.useMutation({
    onSuccess: (gallery) => {
      toast.success("Gallery created");
      router.push(`/admin/galleries/${gallery.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create gallery");
    },
  });

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate slug from name
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/--+/g, "-")
      .trim();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Please enter a gallery name");
      return;
    }

    if (!slug.trim()) {
      toast.error("Please enter a gallery slug");
      return;
    }

    createMutation.mutate({
      businessId,
      name: name.trim(),
      slug: slug.trim(),
      description: description.trim() || undefined,
      layout,
      columns,
      gap,
      showCaptions,
      enableLightbox,
    });
  };

  return (
    <div className="admin-container">
      <div className="mb-8">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin/galleries">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Galleries
            </Link>
          </Button>
        </div>

        <div>
          <h1 className="text-3xl font-bold">Create Gallery</h1>
          <p className="mt-2 text-gray-600">
            Set up a new image gallery for your site
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>
              Give your gallery a name and description
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">
                Gallery Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Gallery"
                className="mt-2"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug">
                Slug <span className="text-red-500">*</span>
              </Label>
              <Input
                id="slug"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                placeholder="my-gallery"
                className="mt-2"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                URL: /galleries/{slug || "my-gallery"}
              </p>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this gallery is about..."
                rows={3}
                className="mt-2"
              />
            </div>
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
            <div>
              <Label htmlFor="layout">Layout Style</Label>
              <Select
                value={layout}
                onValueChange={(
                  value:
                    | "grid"
                    | "masonry"
                    | "carousel"
                    | "collage"
                    | "justified",
                ) => setLayout(value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
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
            </div>

            {layout === "grid" && (
              <>
                <div>
                  <Label htmlFor="columns">Columns</Label>
                  <Select
                    value={columns.toString()}
                    onValueChange={(v) => setColumns(parseInt(v))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 columns</SelectItem>
                      <SelectItem value="3">3 columns</SelectItem>
                      <SelectItem value="4">4 columns</SelectItem>
                      <SelectItem value="5">5 columns</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gap">Gap between images (px)</Label>
                  <Input
                    id="gap"
                    type="number"
                    value={gap}
                    onChange={(e) => setGap(parseInt(e.target.value) || 16)}
                    min={0}
                    max={64}
                    className="mt-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Recommended: 8-24px
                  </p>
                </div>
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
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="captions">Show Image Captions</Label>
                <p className="text-sm text-gray-500">
                  Display captions below or over images
                </p>
              </div>
              <Switch
                id="captions"
                checked={showCaptions}
                onCheckedChange={setShowCaptions}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="lightbox">Enable Lightbox</Label>
                <p className="text-sm text-gray-500">
                  Allow users to view full-size images
                </p>
              </div>
              <Switch
                id="lightbox"
                checked={enableLightbox}
                onCheckedChange={setEnableLightbox}
              />
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Layout Preview</CardTitle>
            <CardDescription>How your gallery layout will look</CardDescription>
          </CardHeader>
          <CardContent>
            <LayoutPreview layout={layout} columns={columns} gap={gap} />
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 border-t pt-6">
          <Button type="button" variant="outline" asChild>
            <Link href="/admin/galleries">Cancel</Link>
          </Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Gallery
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

// Layout Preview Component
function LayoutPreview({
  layout,
  columns,
  gap,
}: {
  layout: string;
  columns: number;
  gap: number;
}) {
  const placeholders = Array.from({ length: 6 }, (_, i) => i);

  if (layout === "carousel") {
    return (
      <div className="relative aspect-video overflow-hidden rounded-lg bg-gray-100">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-6xl">⊏</div>
        </div>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full ${i === 0 ? "bg-gray-700" : "bg-gray-300"}`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (layout === "masonry") {
    return (
      <div className="columns-2 gap-4 md:columns-3">
        {placeholders.map((i) => (
          <div
            key={i}
            className="mb-4 break-inside-avoid"
            style={{ height: i % 2 === 0 ? "120px" : "80px" }}
          >
            <div className="h-full w-full rounded bg-gray-200" />
          </div>
        ))}
      </div>
    );
  }

  // Grid layout
  return (
    <div
      className="grid"
      style={{
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: `${gap}px`,
      }}
    >
      {placeholders.map((i) => (
        <div key={i} className="aspect-square rounded bg-gray-200" />
      ))}
    </div>
  );
}
