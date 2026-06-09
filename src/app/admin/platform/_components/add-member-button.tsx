"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
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
  DialogTrigger,
} from "~/components/ui/dialog";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type Props = {
  businessId: string;
};

export function AddMemberButton({ businessId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState<string>("");
  const [role, setRole] = useState<"OWNER" | "MANAGER">("MANAGER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: usersData } = api.platform.listUsers.useQuery();
  const users = usersData?.users ?? [];

  const createMembership = api.platform.createMembership.useMutation({
    onError: (error) => {
      toast.error(error.message ?? "Failed to add member");
      setIsSubmitting(false);
    },
    onSuccess: () => {
      toast.success("Member added to business successfully");
      setOpen(false);
      setUserId("");
      setRole("MANAGER");
      router.refresh();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      toast.error("Please select a user");
      return;
    }
    setIsSubmitting(true);
    createMembership.mutate({
      userId,
      businessId,
      role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add Member
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Member to Business</DialogTitle>
            <DialogDescription>
              Select a user and role to grant them access to this business.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="user">User</Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger id="user">
                  <SelectValue placeholder="Select a user" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup
                value={role}
                onValueChange={(v) => setRole(v as "OWNER" | "MANAGER")}
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="OWNER" id="add-owner" />
                  <Label htmlFor="add-owner" className="font-normal">
                    <div>
                      <div className="font-medium">Owner</div>
                      <div className="text-muted-foreground text-sm">
                        Full control of the business
                      </div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="MANAGER" id="add-manager" />
                  <Label htmlFor="add-manager" className="font-normal">
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
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
