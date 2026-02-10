"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GripVertical, Pencil, Plus, Trash2 } from "lucide-react";

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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

type CollectionsPageProps = {
  businessId: string;
};

export function CollectionsPage({ businessId }: CollectionsPageProps) {
  const router = useRouter();
  const utils = api.useUtils();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: collections, isLoading } =
    api.collections.getByBusiness.useQuery({
      businessId,
      includeUnpublished: true,
    });

  const deleteMutation = api.collections.delete.useMutation({
    onSuccess: () => {
      void utils.collections.getByBusiness.invalidate();
      setDeleteId(null);
    },
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    deleteMutation.mutate({ id: deleteId });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading collections...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
            <p className="mt-1 text-gray-600">
              Organize your products into collections
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/collections/new">
              <Plus className="mr-2 h-4 w-4" />
              Create Collection
            </Link>
          </Button>
        </div>

        {/* Collections Grid */}
        {!collections || collections.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-gray-500">No collections yet</p>
              <Button asChild>
                <Link href="/admin/collections/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Your First Collection
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Card key={collection.id} className="overflow-hidden">
                {collection.imageUrl && (
                  <div className="relative h-48 bg-gray-100">
                    <Image
                      src={collection.imageUrl}
                      alt={collection.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">
                        {collection.name}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-2">
                        {collection.description || "No description"}
                      </CardDescription>
                    </div>
                    {!collection.published && (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-500">
                      {collection._count.collectionProducts} products
                    </p>

                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/admin/collections/${collection.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(collection.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Collection?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove the collection but won't delete the products in
                it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
