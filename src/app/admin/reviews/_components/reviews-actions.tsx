"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";

import { OwnerReviewDialog } from "./owner-review-dialog";

export function ReviewsActions() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="flex gap-3">
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Review
        </Button>
      </div>

      <OwnerReviewDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={() => {
          setShowCreateDialog(false);
          router.refresh();
        }}
      />
    </>
  );
}
