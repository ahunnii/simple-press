"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Edit, MoreVertical, Trash } from "lucide-react";

import type { RouterOutputs } from "~/trpc/react";
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

import { DeleteMembershipDialog } from "./delete-membership-dialog";
import { EditMembershipDialog } from "./edit-membership-dialog";

type Props = {
  memberships: RouterOutputs["platform"]["getUser"]["memberships"];
};

export function UserMembershipsTable({ memberships }: Props) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<
    (typeof memberships)[0] | null
  >(null);

  const handleDelete = () => {
    setDeleteDialogOpen(false);
    setSelectedMembership(null);
    router.refresh();
  };

  const handleEdit = () => {
    setEditDialogOpen(false);
    setSelectedMembership(null);
    router.refresh();
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Business</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Member Since</TableHead>
            <TableHead className="w-[70px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {memberships.map((membership) => (
            <TableRow key={membership.id}>
              <TableCell>
                <Link
                  href={`/admin/platform/businesses/${membership.business.id}`}
                  className="font-medium hover:underline"
                >
                  {membership.business.name}
                </Link>
                <div className="text-muted-foreground text-sm">
                  {membership.business.subdomain}
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    membership.role === "OWNER" ? "default" : "secondary"
                  }
                >
                  {membership.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(membership.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Membership actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedMembership(membership);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Role
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setSelectedMembership(membership);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {selectedMembership && (
        <>
          <DeleteMembershipDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            membershipId={selectedMembership.id}
            businessName={selectedMembership.business.name}
            onSuccess={handleDelete}
          />
          <EditMembershipDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            membershipId={selectedMembership.id}
            currentRole={selectedMembership.role}
            businessName={selectedMembership.business.name}
            onSuccess={handleEdit}
          />
        </>
      )}
    </>
  );
}
