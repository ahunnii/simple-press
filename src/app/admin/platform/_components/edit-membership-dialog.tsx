"use client";

import { useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  currentRole: "OWNER" | "MANAGER";
  businessName?: string;
  userName?: string;
  onSuccess: () => void;
};

export function EditMembershipDialog({
  open,
  onOpenChange,
  membershipId,
  currentRole,
  businessName,
  userName,
  onSuccess,
}: Props) {
  const [role, setRole] = useState<"OWNER" | "MANAGER">(currentRole);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateMembership = api.platform.updateMembership.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to update membership");
      setIsUpdating(false);
    },
    onSuccess: () => {
      toast.success("Membership updated successfully");
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    updateMembership.mutate({
      membershipId,
      role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Membership Role</DialogTitle>
            <DialogDescription>
              {businessName && `Change role for ${businessName}`}
              {userName && `Change role for ${userName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup
              value={role}
              onValueChange={(v) => setRole(v as "OWNER" | "MANAGER")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="OWNER" id="owner" />
                <Label htmlFor="owner" className="font-normal">
                  <div>
                    <div className="font-medium">Owner</div>
                    <div className="text-muted-foreground text-sm">
                      Full control of the business
                    </div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="MANAGER" id="manager" />
                <Label htmlFor="manager" className="font-normal">
                  <div>
                    <div className="font-medium">Manager</div>
                    <div className="text-muted-foreground text-sm">
                      Operational access to the business
                    </div>
                  </div>
                </Label>
              </div>
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isUpdating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
