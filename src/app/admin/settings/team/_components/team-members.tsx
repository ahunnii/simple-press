"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Mail,
  MoreHorizontal,
  Shield,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { InviteMemberFormData } from "~/lib/validators/team";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { inviteMemberFormSchema } from "~/lib/validators/team";
import { type RouterOutputs, api } from "~/trpc/react";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Form } from "~/components/ui/form";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

type TeamList = RouterOutputs["team"]["list"];
type Membership = TeamList["memberships"][number];
type PendingInvite = TeamList["pendingInvites"][number];

type TeamRole = "OWNER" | "MANAGER" | "STAFF";

const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

interface Props {
  memberships: Membership[];
  pendingInvites: PendingInvite[];
  currentUserId: string | null;
  currentUserRole: TeamRole | null;
}

export function TeamMembers({
  memberships: initialMemberships,
  pendingInvites: initialPendingInvites,
  currentUserId,
  currentUserRole,
}: Props) {
  const isOwner = currentUserRole === "OWNER";

  const utils = api.useUtils();

  const { data } = api.team.list.useQuery(undefined, {
    initialData: {
      memberships: initialMemberships,
      pendingInvites: initialPendingInvites,
    },
  });

  const memberships = data?.memberships ?? initialMemberships;
  const pendingInvites = data?.pendingInvites ?? initialPendingInvites;

  const invalidate = () => void utils.team.list.invalidate();

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);

  const inviteDefaultValues: InviteMemberFormData = {
    email: "",
    role: "MANAGER",
  };

  const inviteForm = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: inviteDefaultValues,
  });

  const inviteRole = inviteForm.watch("role");

  const handleInviteOpenChange = (open: boolean) => {
    setInviteOpen(open);
    inviteForm.reset(inviteDefaultValues);
  };

  const inviteMutation = api.team.invite.useMutation({
    onSuccess: () => {
      toast.success("Invitation sent!");
      setInviteOpen(false);
      inviteForm.reset(inviteDefaultValues);
      invalidate();
    },
    onError: (err) =>
      applyTrpcErrorToForm(inviteForm, err, {
        fieldMap: { email: "email" },
      }),
  });

  const changeRoleMutation = api.team.changeRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated");
      invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to update role"),
  });

  const removeMutation = api.team.remove.useMutation({
    onSuccess: () => {
      toast.success("Member removed");
      invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove member"),
  });

  const revokeMutation = api.team.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite revoked");
      invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to revoke invite"),
  });

  const onInviteSubmit = (data: InviteMemberFormData) => {
    inviteMutation.mutate({ email: data.email.trim(), role: data.role });
  };

  return (
    <div className="admin-container space-y-8">
      <div className="admin-header">
        <div>
          <h1>Team</h1>
          <p className="text-muted-foreground text-sm">
            Manage who has access to your store&apos;s admin dashboard.
          </p>
        </div>
        {isOwner && (
          <Dialog open={inviteOpen} onOpenChange={handleInviteOpenChange}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <Form {...inviteForm}>
                <form onSubmit={inviteForm.handleSubmit(onInviteSubmit)}>
                  <DialogHeader>
                    <DialogTitle>Invite Team Member</DialogTitle>
                    <DialogDescription>
                      Send an email invitation to add someone to your team.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <InputFormField
                      form={inviteForm}
                      name="email"
                      label="Email Address"
                      type="email"
                      placeholder="teammate@example.com"
                      required
                    />
                    <div>
                      <SelectFormField
                        form={inviteForm}
                        name="role"
                        label="Role"
                        values={[
                          {
                            value: "MANAGER",
                            label: "Manager — operational access",
                          },
                          {
                            value: "STAFF",
                            label: "Staff — fulfillment only",
                          },
                          {
                            value: "OWNER",
                            label: "Owner — full control",
                          },
                        ]}
                      />
                      <p className="text-muted-foreground mt-1 text-xs">
                        {inviteRole === "STAFF"
                          ? "Can view and fulfill orders only."
                          : "Managers can manage orders, products, and content but cannot invite or remove team members."}
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleInviteOpenChange(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={inviteMutation.isPending}>
                      {inviteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Invite
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="px-6 py-3 text-left font-medium">Name</th>
                <th className="px-6 py-3 text-left font-medium">Email</th>
                <th className="px-6 py-3 text-left font-medium">Role</th>
                {isOwner && (
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {memberships.map((m) => {
                const isCurrentUser = m.user.id === currentUserId;
                return (
                  <tr key={m.id} className="border-b last:border-0">
                    <td className="px-6 py-3 font-medium">
                      {m.user.name ?? m.user.email}
                      {isCurrentUser && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (you)
                        </span>
                      )}
                    </td>
                    <td className="text-muted-foreground px-6 py-3">
                      {m.user.email}
                    </td>
                    <td className="px-6 py-3">
                      {isOwner && !isCurrentUser ? (
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            changeRoleMutation.mutate({
                              membershipId: m.id,
                              role: v as TeamRole,
                            })
                          }
                          disabled={changeRoleMutation.isPending}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="OWNER">Owner</SelectItem>
                            <SelectItem value="MANAGER">Manager</SelectItem>
                            <SelectItem value="STAFF">
                              Staff — fulfillment only
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge
                          variant={
                            m.role === "OWNER" ? "default" : "secondary"
                          }
                        >
                          {m.role === "OWNER" ? (
                            <>
                              <Shield className="mr-1 h-3 w-3" />
                              Owner
                            </>
                          ) : (
                            (ROLE_LABELS[m.role as TeamRole] ?? m.role)
                          )}
                        </Badge>
                      )}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-3 text-right">
                        {!isCurrentUser && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Actions</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Remove ${m.user.name ?? m.user.email} from the team?`,
                                    )
                                  ) {
                                    removeMutation.mutate({
                                      membershipId: m.id,
                                    });
                                  }
                                }}
                                disabled={removeMutation.isPending}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="px-6 py-3 text-left font-medium">Email</th>
                  <th className="px-6 py-3 text-left font-medium">Role</th>
                  <th className="px-6 py-3 text-left font-medium">Expires</th>
                  {isOwner && (
                    <th className="px-6 py-3 text-right font-medium">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((inv) => (
                  <tr key={inv.id} className="border-b last:border-0">
                    <td className="px-6 py-3">{inv.email}</td>
                    <td className="px-6 py-3">
                      <Badge variant="outline">
                        {ROLE_LABELS[inv.role as TeamRole] ?? inv.role}
                      </Badge>
                    </td>
                    <td className="text-muted-foreground px-6 py-3">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    {isOwner && (
                      <td className="px-6 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => {
                            if (confirm("Revoke this invitation?")) {
                              revokeMutation.mutate({ inviteId: inv.id });
                            }
                          }}
                          disabled={revokeMutation.isPending}
                        >
                          Revoke
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
