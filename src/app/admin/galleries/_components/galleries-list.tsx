"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, Images, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type GalleriesListProps = {
  businessId: string;
};

export function GalleriesList({ businessId }: GalleriesListProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: galleries, isLoading } = api.gallery.list.useQuery({
    businessId,
  });

  const deleteMutation = api.gallery.delete.useMutation({
    onSuccess: () => {
      toast.success("Gallery deleted");
      setDeleteId(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete gallery");
    },
  });

  if (isLoading) {
    return <div>Loading galleries...</div>;
  }

  if (!galleries || galleries.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Images className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">No galleries yet</h3>
          <p className="mt-2 text-gray-600">
            Create your first gallery to get started
          </p>
          <Button className="mt-4" asChild>
            <Link href="/admin/galleries/new">Create Gallery</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const getLayoutIcon = (layout: string) => {
    const icons = {
      grid: "⊞",
      masonry: "▦",
      carousel: "⊏",
      collage: "▤",
      justified: "▬",
    };
    return icons[layout as keyof typeof icons] || "⊞";
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {galleries.map((gallery) => (
          <Card key={gallery.id} className="overflow-hidden">
            {/* Preview Images */}
            <div className="grid grid-cols-2 gap-1 bg-gray-100 p-2">
              {gallery.images.slice(0, 4).map((image) => (
                <div
                  key={image.id}
                  className="aspect-square overflow-hidden rounded bg-white"
                >
                  <img
                    src={image.url}
                    alt={image.altText ?? ""}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
              {gallery.images.length === 0 && (
                <div className="col-span-2 flex aspect-square items-center justify-center rounded bg-gray-200">
                  <Images className="h-8 w-8 text-gray-400" />
                </div>
              )}
            </div>

            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">{gallery.name}</h3>
                  {gallery.description && (
                    <p className="mt-1 truncate text-sm text-gray-600">
                      {gallery.description}
                    </p>
                  )}
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {getLayoutIcon(gallery.layout)} {gallery.layout}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {gallery._count.images} images
                    </Badge>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/admin/galleries/${gallery.id}`}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteId(gallery.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Gallery?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the gallery and all its images. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
