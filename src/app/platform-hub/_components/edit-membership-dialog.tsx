"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { EditMembershipFormData } from "~/lib/validators/platform";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { editMembershipFormSchema } from "~/lib/validators/platform";
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
import { Form, FormField, FormItem, FormMessage } from "~/components/ui/form";
import { Label } from "~/components/ui/label";
import { RadioGroup, RadioGroupItem } from "~/components/ui/radio-group";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  membershipId: string;
  currentRole: "OWNER" | "MANAGER" | "STAFF";
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
  const form = useForm<EditMembershipFormData>({
    resolver: zodResolver(editMembershipFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: { role: currentRole },
  });

  // This dialog is rendered persistently by its parents (business-members-table,
  // user-memberships-table) without a `key`, and swaps membershipId/currentRole
  // props in place rather than remounting. Reseed the form every time the
  // dialog opens (and whenever currentRole changes while open) so a cancelled
  // edit for one membership can't leak its role into the next membership.
  useEffect(() => {
    if (open) {
      form.reset({ role: currentRole });
    }
  }, [open, currentRole, form]);

  const updateMembership = api.platform.updateMembership.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to update membership",
      }),
    onSuccess: () => {
      toast.success("Membership updated successfully");
      onSuccess();
    },
  });

  const onSubmit = (data: EditMembershipFormData) => {
    updateMembership.mutate({
      membershipId,
      role: data.role,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Edit Membership Role</DialogTitle>
              <DialogDescription>
                {businessName && `Change role for ${businessName}`}
                {userName && `Change role for ${userName}`}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
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
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="STAFF" id="staff" />
                        <Label htmlFor="staff" className="font-normal">
                          <div>
                            <div className="font-medium">Staff</div>
                            <div className="text-muted-foreground text-sm">
                              Can view and fulfill orders only
                            </div>
                          </div>
                        </Label>
                      </div>
                    </RadioGroup>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMembership.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMembership.isPending}>
                {updateMembership.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Role"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
