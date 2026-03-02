"use client";

import { useState } from "react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  businessName?: string;
  userName?: string;
  onSuccess: () => void;
};

export function DeleteMembershipDialog({
  open,
  onOpenChange,
  membershipId,
  businessName,
  userName,
  onSuccess,
}: Props) {
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteMembership = api.platform.deleteMembership.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to remove membership");
      setIsDeleting(false);
    },
    onSuccess: () => {
      toast.success("Membership removed successfully");
      onSuccess();
    },
  });

  const handleDelete = () => {
    setIsDeleting(true);
    deleteMembership.mutate(membershipId);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove Membership</AlertDialogTitle>
          <AlertDialogDescription>
            {businessName && `Remove user from ${businessName}?`}
            {userName && `Remove ${userName} from this business?`}
            {!businessName && !userName && "Remove this membership?"} This action
            cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? "Removing..." : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
