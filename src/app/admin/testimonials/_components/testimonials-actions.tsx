"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";

import { OwnerTestimonialDialog } from "./owner-testimonial-dialog";
import { SendInviteDialog } from "./send-invite-dialog";

export function TestimonialsActions({ businessId }: { businessId: string }) {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const router = useRouter();
  return (
    <>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Testimonial
        </Button>
        <SendInviteDialog businessId={businessId} />
      </div>

      <OwnerTestimonialDialog
        businessId={businessId}
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
