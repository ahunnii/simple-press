"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, MoreVertical, RefreshCw, Trash } from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";

type InviteList = RouterOutputs["platformInvites"]["list"];

type Props = {
  businessId: string;
  pendingInvites: InviteList["pendingInvites"];
  expiredInvites: InviteList["expiredInvites"];
};

type Row = {
  id: string;
  email: string;
  role: string;
  expiresAt: Date;
  status: "Pending" | "Expired";
  inviteUrl?: string;
};

export function BusinessInvitesList({
  businessId,
  pendingInvites,
  expiredInvites,
}: Props) {
  const router = useRouter();
  const [revokeTarget, setRevokeTarget] = useState<Row | null>(null);

  const rows: Row[] = [
    ...pendingInvites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      status: "Pending" as const,
      inviteUrl: invite.inviteUrl,
    })),
    ...expiredInvites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      status: "Expired" as const,
    })),
  ];

  const resend = api.platformInvites.resend.useMutation({
    onError: (error) => toast.error(error.message ?? "Failed to resend invite"),
    onSuccess: (result) => {
      if (result.emailSent) {
        toast.success(`Invite resent to ${result.invite.email}`);
      } else {
        toast.warning("Invite created but email failed", {
          action: {
            label: "Copy link",
            onClick: () => void copyLink(result.inviteUrl),
          },
        });
      }
      router.refresh();
    },
  });

  const revoke = api.platformInvites.revoke.useMutation({
    onError: (error) => toast.error(error.message ?? "Failed to revoke invite"),
    onSuccess: () => {
      toast.success("Invite revoked");
      setRevokeTarget(null);
      router.refresh();
    },
  });

  async function copyLink(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">No outstanding invites.</p>
    );
  }

  const resendingId = resend.isPending ? resend.variables?.inviteId : null;

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.email}</TableCell>
              <TableCell>
                <Badge variant={row.role === "OWNER" ? "default" : "secondary"}>
                  {row.role}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant={row.status === "Pending" ? "outline" : "secondary"}
                  className={
                    row.status === "Expired" ? "text-muted-foreground" : ""
                  }
                >
                  {row.status}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.status === "Expired" ? "Expired " : ""}
                {new Date(row.expiresAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={resendingId === row.id}
                    >
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Invite actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {row.inviteUrl && (
                      <DropdownMenuItem
                        onClick={() => void copyLink(row.inviteUrl!)}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy link
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() =>
                        resend.mutate({ businessId, inviteId: row.id })
                      }
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Resend
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setRevokeTarget(row)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Revoke
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog
        open={revokeTarget !== null}
        onOpenChange={(next) => {
          if (!next && !revoke.isPending) setRevokeTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite</AlertDialogTitle>
            <AlertDialogDescription>
              Revoke the invitation for {revokeTarget?.email}? Their link will
              stop working immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={revoke.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={revoke.isPending}
              onClick={(e) => {
                // Keep the dialog open until the mutation settles.
                e.preventDefault();
                if (revokeTarget) {
                  revoke.mutate({ businessId, inviteId: revokeTarget.id });
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoke.isPending ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
