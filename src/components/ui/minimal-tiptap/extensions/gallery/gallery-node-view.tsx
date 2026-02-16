/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import type { NodeViewProps } from "@tiptap/core";
import { useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { Images, Loader2, X } from "lucide-react";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { GalleryRenderer } from "~/components/gallery-renderer";

export function GalleryNodeView({
  node,
  updateAttributes,
  deleteNode,
}: NodeViewProps) {
  const [isEditing, setIsEditing] = useState(!node.attrs.galleryId);
  const businessId = node.attrs.businessId;

  // Get available galleries
  const { data: galleries, isLoading: loadingGalleries } =
    api.gallery.list.useQuery({ businessId }, { enabled: !!businessId });

  // Get selected gallery
  const { data: gallery, isLoading: loadingGallery } =
    api.gallery.getById.useQuery(
      { id: node.attrs.galleryId },
      { enabled: !!node.attrs.galleryId },
    );

  const handleGallerySelect = (galleryId: string) => {
    updateAttributes({
      galleryId,
    });
    setIsEditing(false);
  };

  const handleRemove = () => {
    if (confirm("Remove this gallery?")) {
      deleteNode();
    }
  };

  // Editing/Selection State
  if (isEditing || !node.attrs.galleryId) {
    return (
      <NodeViewWrapper className="gallery-node my-4">
        <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                <Images className="h-6 w-6 text-blue-600" />
              </div>
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="mb-1 font-medium text-gray-900">Insert Gallery</h3>
              <p className="mb-4 text-sm text-gray-600">
                Select a gallery to display in your page
              </p>

              {loadingGalleries ? (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading galleries...
                </div>
              ) : galleries && galleries.length > 0 ? (
                <div className="flex items-center gap-3">
                  <Select
                    value={node.attrs.galleryId ?? undefined}
                    onValueChange={handleGallerySelect}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select a gallery..." />
                    </SelectTrigger>
                    <SelectContent>
                      {galleries.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          <div className="flex items-center justify-between gap-4">
                            <span>{g.name}</span>
                            <span className="text-xs text-gray-500">
                              {g._count.images} images
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={handleRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-gray-600">
                  <p className="mb-2">No galleries found.</p>
                  <Button size="sm" variant="outline" asChild>
                    <a href="/admin/galleries/new" target="_blank">
                      Create a Gallery
                    </a>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  // Display State
  return (
    <NodeViewWrapper className="gallery-node my-6">
      <div className="group relative">
        {/* Edit Overlay */}
        <div className="absolute top-2 right-2 z-10 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex gap-2 rounded-lg bg-white p-1 shadow-lg">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setIsEditing(true)}
            >
              Change Gallery
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Gallery Display */}
        {loadingGallery ? (
          <div className="flex items-center justify-center rounded-lg bg-gray-50 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : gallery ? (
          <div className="overflow-hidden rounded-lg border border-gray-200">
            <GalleryRenderer gallery={gallery} />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 py-12 text-center">
            <p className="text-gray-600">Gallery not found</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2"
              onClick={() => setIsEditing(true)}
            >
              Select Different Gallery
            </Button>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
