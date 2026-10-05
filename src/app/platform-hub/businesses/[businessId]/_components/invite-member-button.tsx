"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Mail } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { InviteMemberFormData } from "~/lib/validators/platform-invites";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { inviteMemberFormSchema } from "~/lib/validators/platform-invites";
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { SelectFormField } from "~/components/inputs/select-form-field";

type Props = {
  businessId: string;
};

const defaultValues: InviteMemberFormData = {
  email: "",
  role: "MANAGER",
};

/** Copy an invite link, reporting the outcome via toast. */
async function copyInviteLink(url: string) {
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Invite link copied");
  } catch {
    toast.error("Could not copy the link");
  }
}

export function InviteMemberButton({ businessId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const form = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues,
  });

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset(defaultValues);
    }
    setOpen(next);
  };

  const invite = api.platformInvites.invite.useMutation({
    onError: (error) =>
      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Failed to send invite",
      }),
    onSuccess: (result) => {
      // The invite row is committed even when the email fails (sendEmail
      // never throws), so surface that distinctly and offer the link.
      if (result.emailSent) {
        toast.success(`Invite sent to ${result.invite.email}`);
      } else {
        toast.warning("Invite created but email failed", {
          action: {
            label: "Copy link",
            onClick: () => void copyInviteLink(result.inviteUrl),
          },
        });
      }
      setOpen(false);
      form.reset(defaultValues);
      router.refresh();
    },
  });

  const onSubmit = (data: InviteMemberFormData) => {
    invite.mutate({ businessId, email: data.email, role: data.role });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Mail className="mr-2 h-4 w-4" />
          Invite by email
        </Button>
      </DialogTrigger>
      <DialogContent>
        <Form {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)}>
            <DialogHeader>
              <DialogTitle>Invite by Email</DialogTitle>
              <DialogDescription>
                Send an invitation to join this business. The link points at the
                business&apos;s own site and expires in 14 days.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        autoComplete="off"
                        placeholder="name@example.com"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <SelectFormField
                form={form}
                name="role"
                label="Role"
                values={[
                  { value: "OWNER", label: "Owner" },
                  { value: "MANAGER", label: "Manager" },
                  { value: "STAFF", label: "Staff" },
                ]}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={invite.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={invite.isPending}>
                {invite.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send invite"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
