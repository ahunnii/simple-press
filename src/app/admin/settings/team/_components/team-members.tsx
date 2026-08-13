"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Info,
  Loader2,
  Mail,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  Trash2,
  UserPlus,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import type { InviteMemberFormData } from "~/lib/validators/team";
import { ROLE_DESCRIPTIONS } from "~/app/admin/_lib/admin-nav";
import { applyTrpcErrorToForm } from "~/lib/forms/apply-trpc-error";
import { inviteMemberFormSchema } from "~/lib/validators/team";
import { type RouterOutputs, api } from "~/trpc/react";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "~/components/ui/table";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";

type TeamList = RouterOutputs["team"]["list"];
type Membership = TeamList["memberships"][number];
type PendingInvite = TeamList["pendingInvites"][number];
type ExpiredInvite = TeamList["expiredInvites"][number];

type TeamRole = "OWNER" | "MANAGER" | "STAFF";

const ROLE_LABELS: Record<TeamRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

interface Props {
  memberships: Membership[];
  pendingInvites: PendingInvite[];
  /**
   * Optional because the server page that renders this component
   * (`settings/team/page.tsx`) is outside this component's file ownership
   * and does not currently pass it — defaulting to `[]` keeps this a valid
   * standalone prop rather than forcing every caller to supply it. The live
   * `api.team.list.useQuery` below still resolves the real list shortly
   * after mount (React Query's `staleTime` just delays that refetch — see
   * the comment on `initialExpiredInvites` below), so the gap is a brief
   * "no expired invites" flash rather than a permanently wrong answer.
   */
  expiredInvites?: ExpiredInvite[];
  currentUserId: string | null;
  currentUserRole: TeamRole | null;
  canManage: boolean;
  isPlatformAdmin: boolean;
}

export function TeamMembers({
  memberships: initialMemberships,
  pendingInvites: initialPendingInvites,
  expiredInvites: initialExpiredInvites = [],
  currentUserId,
  currentUserRole,
  canManage,
  isPlatformAdmin,
}: Props) {
  const utils = api.useUtils();

  const { data } = api.team.list.useQuery(undefined, {
    initialData: {
      memberships: initialMemberships,
      pendingInvites: initialPendingInvites,
      expiredInvites: initialExpiredInvites,
    },
  });

  const memberships = data?.memberships ?? initialMemberships;
  const pendingInvites = data?.pendingInvites ?? initialPendingInvites;
  const expiredInvites = data?.expiredInvites ?? initialExpiredInvites;

  const invalidate = () => void utils.team.list.invalidate();

  // Invite dialog state
  const [inviteOpen, setInviteOpen] = useState(false);

  // Which membership is targeted by the Remove confirmation dialog, or null.
  // Also doubles as the per-row `disabled` flag, replacing the old
  // `removeMutation.isPending` check that disabled every row's Remove action
  // at once.
  const [removingId, setRemovingId] = useState<string | null>(null);
  // Same shape, for the Revoke confirmation dialog on pending invites.
  const [revokingId, setRevokingId] = useState<string | null>(null);
  // Same shape again, for the Resend button on expired invites — tracked as
  // state rather than derived from `resendMutation.variables` because the
  // mutation only carries `{ email, role }` (it re-invites, it doesn't
  // target the expired row by id), and two expired rows could share an
  // email if the same address was invited and left to expire more than
  // once.
  const [resendingId, setResendingId] = useState<string | null>(null);

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
      setRemovingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to remove member"),
  });

  const revokeMutation = api.team.revokeInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite revoked");
      setRevokingId(null);
      invalidate();
    },
    onError: (err) => toast.error(err.message ?? "Failed to revoke invite"),
  });

  // Deliberately a second `useMutation` instance on `team.invite` rather than
  // reusing `inviteMutation` above: that one's `onSuccess`/`onError` are wired
  // to the Invite Member dialog's form (closes it, resets it, writes field
  // errors onto it via `applyTrpcErrorToForm`) — none of which applies to a
  // one-click Resend from the Expired Invitations table, and running a
  // resend through it would silently eat a "duplicate active invite" error
  // into a form field nobody can see. The `team.invite` procedure itself is
  // untouched; this only calls it a second, independent way.
  const resendMutation = api.team.invite.useMutation({
    onSuccess: () => {
      toast.success("Invitation resent");
      setResendingId(null);
      invalidate();
    },
    onError: (err) => {
      setResendingId(null);
      toast.error(err.message ?? "Failed to resend invite");
    },
  });

  const onInviteSubmit = (data: InviteMemberFormData) => {
    inviteMutation.mutate({ email: data.email.trim(), role: data.role });
  };

  const removeTarget = memberships.find((m) => m.id === removingId) ?? null;
  const revokeTarget = pendingInvites.find((i) => i.id === revokingId) ?? null;

  return (
    <div className="admin-container space-y-8">
      <div className="admin-header">
        <div>
          <h1>Team</h1>
          <p className="text-muted-foreground text-sm">
            Manage who has access to your store&apos;s admin dashboard.
          </p>
        </div>
        {canManage && (
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
                    <SelectFormField
                      form={inviteForm}
                      name="role"
                      label="Role"
                      description={ROLE_DESCRIPTIONS[inviteRole]?.summary}
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

      {isPlatformAdmin && (
        <Alert>
          <ShieldAlert />
          <AlertTitle>Viewing as platform admin</AlertTitle>
          <AlertDescription>
            Platform admin access lets you manage this business&apos;s team
            without being one of its Owners. Changes made here affect the
            business owner&apos;s team, not your own.
          </AlertDescription>
        </Alert>
      )}

      {!canManage && !isPlatformAdmin && (
        <Alert>
          <Info />
          <AlertTitle>Team management is Owner-only</AlertTitle>
          <AlertDescription>
            {currentUserRole && ROLE_DESCRIPTIONS[currentUserRole].summary} You
            can view the team below, but only an{" "}
            {ROLE_DESCRIPTIONS.OWNER.label} can invite members, change roles,
            or remove people.
          </AlertDescription>
        </Alert>
      )}

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Members</CardTitle>
          <p className="text-muted-foreground text-xs">
            {Object.values(ROLE_DESCRIPTIONS)
              .map(({ label, summary }) => `${label}: ${summary}`)
              .join(" · ")}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-6 py-3">Name</TableHead>
                <TableHead className="px-6 py-3">Email</TableHead>
                <TableHead className="px-6 py-3">Role</TableHead>
                {canManage && (
                  <TableHead className="px-6 py-3 text-right">
                    Actions
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {memberships.map((m) => {
                const isCurrentUser = m.user.id === currentUserId;
                return (
                  <TableRow key={m.id}>
                    <TableCell className="px-6 py-3 font-medium">
                      {m.user.name ?? m.user.email}
                      {isCurrentUser && (
                        <span className="text-muted-foreground ml-2 text-xs">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground px-6 py-3">
                      {m.user.email}
                    </TableCell>
                    <TableCell className="px-6 py-3">
                      {canManage && !isCurrentUser ? (
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
                    </TableCell>
                    {canManage && (
                      <TableCell className="px-6 py-3 text-right">
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
                              {/* Opens the confirm dialog rendered once below
                                  the table, rather than `window.confirm()` —
                                  a browser suppressing native dialogs turned
                                  that into a silent no-op. `disabled` is
                                  scoped to THIS row via `removingId`, not
                                  `removeMutation.isPending`, which used to
                                  freeze every row's Remove action at once.
                                  No `type="button"` here: Radix renders
                                  DropdownMenuItem as a `div[role=menuitem]`,
                                  not a `<button>`, so the attribute isn't
                                  applicable — unlike the Revoke button below,
                                  which is a real `<Button>`. */}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setRemovingId(m.id)}
                                disabled={removingId === m.id}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Remove
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-3">Email</TableHead>
                  <TableHead className="px-6 py-3">Role</TableHead>
                  <TableHead className="px-6 py-3">Expires</TableHead>
                  {canManage && (
                    <TableHead className="px-6 py-3 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingInvites.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="px-6 py-3">{inv.email}</TableCell>
                    <TableCell className="px-6 py-3">
                      <Badge variant="outline">
                        {ROLE_LABELS[inv.role as TeamRole] ?? inv.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground px-6 py-3">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                      <TableCell className="px-6 py-3 text-right">
                        {/* Opens the confirm dialog rendered once below the
                            table — see the comment on the Remove
                            DropdownMenuItem above for why `window.confirm()`
                            was the likely cause of "Revoke does nothing".
                            `disabled` is scoped to THIS row via `revokingId`,
                            not `revokeMutation.isPending`, which used to
                            freeze every row's Revoke button at once.
                            `type="button"` is defensive: harmless today since
                            no `<form>` wraps this table, but this IS a real
                            `<button>` under the hood (unlike DropdownMenuItem
                            above), so it's worth stating rather than leaving
                            it to default to `type="submit"`. */}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setRevokingId(inv.id)}
                          disabled={revokingId === inv.id}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expired invites — a third array from `team.list`, kept separate from
          `pendingInvites` rather than folded into it (that field's meaning —
          "still usable" — must not shift for anything else that reads it).
          No Revoke here: `revokeInvite` sets `used: true`, which is
          meaningless for an invite that's already dead. Resend is the only
          action — it re-invites the same email/role via `team.invite`,
          which is unaffected by the old expired row (its duplicate-invite
          guard only matches `expiresAt: { gt: now }`). */}
      {expiredInvites.length > 0 && (
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-muted-foreground">
              Expired Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-6 py-3">Email</TableHead>
                  <TableHead className="px-6 py-3">Role</TableHead>
                  <TableHead className="px-6 py-3">Expired</TableHead>
                  {canManage && (
                    <TableHead className="px-6 py-3 text-right">
                      Actions
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expiredInvites.map((inv) => {
                  const isResending = resendingId === inv.id;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-muted-foreground px-6 py-3">
                        {inv.email}
                      </TableCell>
                      <TableCell className="px-6 py-3">
                        <Badge variant="outline">
                          {ROLE_LABELS[inv.role as TeamRole] ?? inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground px-6 py-3">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      {canManage && (
                        <TableCell className="px-6 py-3 text-right">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isResending}
                            onClick={() => {
                              setResendingId(inv.id);
                              resendMutation.mutate({
                                email: inv.email,
                                role: inv.role as TeamRole,
                              });
                            }}
                          >
                            {isResending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Mail className="mr-2 h-4 w-4" />
                            )}
                            Resend
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Remove member confirmation — replaces the old `window.confirm()`.
          Controlled by `removingId` rather than an `AlertDialogTrigger`,
          since the trigger lives one component away (a DropdownMenuItem per
          row) rather than wrapping this dialog directly. */}
      <AlertDialog
        open={!!removingId}
        onOpenChange={(open) => {
          if (!open) setRemovingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {removeTarget
                ? `Remove ${removeTarget.user.name ?? removeTarget.user.email} from the team?`
                : "Remove team member?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose access to this store&apos;s admin
              dashboard. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            {/* `variant`, NOT className — see DeleteProductAlertDialog for
                why a className here would render the button black. */}
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (removingId) {
                  removeMutation.mutate({ membershipId: removingId });
                }
              }}
              disabled={removeMutation.isPending}
            >
              {removeMutation.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke invite confirmation — same replacement, for the Pending
          Invitations table's Revoke button. */}
      <AlertDialog
        open={!!revokingId}
        onOpenChange={(open) => {
          if (!open) setRevokingId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {revokeTarget
                ? `Revoke the invitation to ${revokeTarget.email}?`
                : "Revoke this invitation?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Their invite link will stop working immediately. You can invite
              them again afterward if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revokeMutation.isPending}>
              Keep invite
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (revokingId) {
                  revokeMutation.mutate({ inviteId: revokingId });
                }
              }}
              disabled={revokeMutation.isPending}
            >
              {revokeMutation.isPending ? "Revoking…" : "Revoke invite"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
