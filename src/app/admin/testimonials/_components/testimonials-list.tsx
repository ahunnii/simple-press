"use client";

import type { Testimonial } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Eye,
  EyeOff,
  ImageIcon,
  Mail,
  MoreVertical,
  Pencil,
  Trash2,
  UserCheck,
  UserCog,
} from "lucide-react";
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
import { Card, CardContent } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { ManageTestimonialImagesDialog } from "./manage-testimonial-images-dialog";
import { OwnerTestimonialDialog } from "./owner-testimonial-dialog";

export function TestimonialsList({
  testimonials,
  invites,
}: {
  testimonials: NonNullable<RouterOutputs["testimonial"]["list"]>;
  invites: NonNullable<RouterOutputs["testimonial"]["listInvites"]>;
}) {
  const router = useRouter();
  const utils = api.useUtils();

  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);
  const [managingImagesTestimonial, setManagingImagesTestimonial] =
    useState<Testimonial | null>(null);

  const togglePublicMutation = api.testimonial.togglePublic.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = api.testimonial.delete.useMutation({
    onSuccess: () => {
      toast.success("Deleted");
      setDeleteId(null);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const ownerCreated = testimonials?.filter((t) => t.source === "owner") ?? [];
  const customerSubmitted =
    testimonials?.filter((t) => t.source === "customer") ?? [];

  const [testimonialFilter, setTestimonialFilter] = useState<
    "all" | "customer" | "owner"
  >("all");
  const filteredTestimonials =
    testimonialFilter === "customer"
      ? customerSubmitted
      : testimonialFilter === "owner"
        ? ownerCreated
        : testimonials ?? [];

  type Invite = (typeof invites)[number];
  const now = new Date();
  const completedInvites = invites?.filter((i) => i.used) ?? [];
  const pendingInvites =
    invites?.filter(
      (i) => !i.used && new Date(i.expiresAt) > now
    ) ?? [];
  const expiredInvites =
    invites?.filter(
      (i) => !i.used && new Date(i.expiresAt) <= now
    ) ?? [];

  const [inviteFilter, setInviteFilter] = useState<
    "all" | "completed" | "pending" | "expired"
  >("all");
  const filteredInvites =
    inviteFilter === "completed"
      ? completedInvites
      : inviteFilter === "pending"
        ? pendingInvites
        : inviteFilter === "expired"
          ? expiredInvites
          : invites ?? [];

  const renderTestimonial = (testimonial: Testimonial) => (
    <Card key={testimonial.id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Header row */}
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {/* Source badge */}
              {testimonial.source === "owner" ? (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCog className="h-3 w-3" />
                  Owner Added
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-xs">
                  <UserCheck className="h-3 w-3" />
                  Customer Submitted
                </Badge>
              )}

              {/* Visibility badge */}
              {testimonial.isPublic ? (
                <Badge className="bg-green-600 text-xs">Published</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Hidden
                </Badge>
              )}
            </div>

            {/* Title (if present) */}
            {testimonial.title && (
              <p className="mb-1 text-sm font-semibold">{testimonial.title}</p>
            )}

            {/* Text */}
            <p className="mb-3 text-sm text-gray-700">{testimonial.text}</p>

            {/* Attribution */}
            <div className="text-sm">
              <span className="font-medium">{testimonial.customerName}</span>
              {testimonial.customerTitle && (
                <span className="text-gray-500">
                  , {testimonial.customerTitle}
                </span>
              )}
              {testimonial.customerCompany && (
                <span className="text-gray-500">
                  {" "}
                  at {testimonial.customerCompany}
                </span>
              )}
              {testimonial.customerEmail && (
                <span className="ml-2 text-xs text-gray-400">
                  ({testimonial.customerEmail})
                </span>
              )}
            </div>

            {/* Date */}
            <p className="mt-1 text-xs text-gray-400">
              {testimonial.source === "owner"
                ? format(new Date(testimonial.testimonialDate), "MMM d, yyyy")
                : formatDistanceToNow(new Date(testimonial.createdAt), {
                    addSuffix: true,
                  })}
            </p>
          </div>

          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* Edit — only for owner-created */}
              {testimonial.source === "owner" && (
                <>
                  <DropdownMenuItem
                    onClick={() => setEditingTestimonial(testimonial)}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              {testimonial.photoUrls && testimonial.photoUrls.length > 0 && (
                <>
                  <DropdownMenuItem
                    onClick={() => setManagingImagesTestimonial(testimonial)}
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Manage images
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}

              <DropdownMenuItem
                onClick={() =>
                  togglePublicMutation.mutate({
                    id: testimonial.id,
                    isPublic: !testimonial.isPublic,
                  })
                }
              >
                {testimonial.isPublic ? (
                  <>
                    <EyeOff className="mr-2 h-4 w-4" />
                    Hide
                  </>
                ) : (
                  <>
                    <Eye className="mr-2 h-4 w-4" />
                    Publish
                  </>
                )}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setDeleteId(testimonial.id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <p>{message}</p>
      </CardContent>
    </Card>
  );

  const getInviteStatus = (invite: Invite): "completed" | "pending" | "expired" =>
    invite.used ? "completed" : new Date(invite.expiresAt) <= now ? "expired" : "pending";

  const renderInvite = (invite: Invite) => {
    const status = getInviteStatus(invite);
    const displayName =
      invite.customer?.firstName || invite.customer?.lastName
        ? [invite.customer.firstName, invite.customer.lastName]
            .filter(Boolean)
            .join(" ")
        : null;
    return (
      <Card key={invite.id}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {status === "completed" && (
                  <Badge className="bg-green-600 text-xs">Completed</Badge>
                )}
                {status === "pending" && (
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                )}
                {status === "expired" && (
                  <Badge variant="destructive" className="text-xs">
                    Expired
                  </Badge>
                )}
              </div>
              <p className="mb-1 font-medium text-gray-900">
                {displayName ?? invite.email}
              </p>
              {displayName && (
                <p className="mb-2 text-sm text-gray-500">{invite.email}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
                <span>
                  Sent {format(new Date(invite.createdAt), "MMM d, yyyy")}
                </span>
                <span>
                  Expires {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                </span>
                {invite.maxPhotos !== undefined && (
                  <span>Up to {invite.maxPhotos} photo(s)</span>
                )}
              </div>
              {status === "completed" && invite.usedAt && (
                <p className="mt-1 text-xs text-gray-400">
                  Used {format(new Date(invite.usedAt), "MMM d, yyyy")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const testimonialEmptyMessage =
    testimonialFilter === "customer"
      ? "No customer-submitted testimonials yet"
      : testimonialFilter === "owner"
        ? "No owner-added testimonials yet"
        : "No testimonials yet";

  const inviteEmptyMessage =
    inviteFilter === "completed"
      ? "No completed invites"
      : inviteFilter === "pending"
        ? "No pending invites"
        : inviteFilter === "expired"
          ? "No expired invites"
          : "No invites sent yet";

  return (
    <>
      <Tabs defaultValue="testimonials">
        <TabsList>
          <TabsTrigger value="testimonials">
            Testimonials ({testimonials?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Invites ({invites?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials" className="mt-6">
          <Tabs
            value={testimonialFilter}
            onValueChange={(v) =>
              setTestimonialFilter(v as "all" | "customer" | "owner")
            }
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({testimonials?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="customer">
                Customer Submitted ({customerSubmitted.length})
              </TabsTrigger>
              <TabsTrigger value="owner">
                Owner Added ({ownerCreated.length})
              </TabsTrigger>
            </TabsList>
            <div className="space-y-4">
              {filteredTestimonials.length === 0 ? (
                <EmptyState message={testimonialEmptyMessage} />
              ) : (
                filteredTestimonials.map(renderTestimonial)
              )}
            </div>
          </Tabs>
        </TabsContent>

        <TabsContent value="invites" className="mt-6">
          <Tabs
            value={inviteFilter}
            onValueChange={(v) =>
              setInviteFilter(v as "all" | "completed" | "pending" | "expired")
            }
          >
            <TabsList className="mb-4">
              <TabsTrigger value="all">
                All ({invites?.length ?? 0})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedInvites.length})
              </TabsTrigger>
              <TabsTrigger value="pending">
                Pending ({pendingInvites.length})
              </TabsTrigger>
              <TabsTrigger value="expired">
                Expired ({expiredInvites.length})
              </TabsTrigger>
            </TabsList>
            <div className="space-y-4">
              {filteredInvites.length === 0 ? (
                <EmptyState message={inviteEmptyMessage} />
              ) : (
                filteredInvites.map(renderInvite)
              )}
            </div>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Edit dialog */}
      {editingTestimonial && (
        <OwnerTestimonialDialog
          testimonial={editingTestimonial}
          isOpen={true}
          onClose={() => setEditingTestimonial(null)}
          onSuccess={() => {
            void utils.testimonial.invalidate();
            setEditingTestimonial(null);
            void router.refresh();
          }}
        />
      )}

      {/* Manage images dialog */}
      <ManageTestimonialImagesDialog
        testimonial={managingImagesTestimonial}
        open={!!managingImagesTestimonial}
        onClose={() => setManagingImagesTestimonial(null)}
        onSuccess={() => {
          void utils.testimonial.invalidate();
          setManagingImagesTestimonial(null);
          void router.refresh();
        }}
      />

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Testimonial?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this testimonial and cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteId && deleteMutation.mutate({ id: deleteId })
              }
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
