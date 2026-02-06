"use client";

import type { SiteContent } from "generated/prisma";
import { MoreHorizontal } from "lucide-react";
import Link from "next/link";
import { useRouter } from "nextjs-toploader/app";
import { useState } from "react";
import { toast } from "sonner";

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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { api } from "~/trpc/react";

function encodeKeyForUrl(key: string): string {
  return encodeURIComponent(key);
}

export function SiteContentRowActions({
  siteContent,
}: {
  siteContent: SiteContent;
}) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const apiUtils = api.useUtils();
  const editHref = `/admin/site-content/${encodeKeyForUrl(siteContent.key)}`;

  const deleteMutation = api.siteContent.delete.useMutation({
    onSuccess: ({ message }) => {
      toast.info(message);
      void apiUtils.siteContent.invalidate();
      router.refresh();
      setShowDeleteDialog(false);
    },
    onError: (error) => {
      toast.error("Error deleting site content.");
      console.error("Error deleting site content:", error);
    },
  });

  const handleDelete = () => {
    deleteMutation.mutate({ key: siteContent.key });
  };

  const handleCopyKey = () => {
    void navigator.clipboard.writeText(siteContent.key);
    toast.info("Key copied to clipboard.");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem asChild>
              <Link href={editHref}>Edit</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleCopyKey}>
              Copy key
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onSelect={(e) => {
                e.preventDefault();
                setShowDeleteDialog(true);
              }}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete site content</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the entry with key
              &quot;{siteContent.key}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
