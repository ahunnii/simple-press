"use client";

import type { Testimonial } from "generated/prisma";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ImageIcon,
  Loader2,
  Mail,
  MoreVertical,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserCog,
  X,
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
import { Checkbox } from "~/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { ManageTestimonialImagesDialog } from "./manage-testimonial-images-dialog";
import { OwnerTestimonialDialog } from "./owner-testimonial-dialog";

const PAGE_SIZE = 20;

type SortKey = "newest" | "oldest" | "name";

export function TestimonialsList({
  testimonials,
  invites,
}: {
  testimonials: NonNullable<RouterOutputs["testimonial"]["list"]>;
  invites: NonNullable<RouterOutputs["testimonial"]["listInvites"]>;
}) {
  const router = useRouter();
  const utils = api.useUtils();

  // ── Single-item dialog / action state ──────────────────────────────────────
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTestimonial, setEditingTestimonial] =
    useState<Testimonial | null>(null);
  const [managingImagesTestimonial, setManagingImagesTestimonial] =
    useState<Testimonial | null>(null);

  // Track which row is pending a per-item action (approve / hide / delete)
  const [pendingApproveId, setPendingApproveId] = useState<string | null>(null);
  const [pendingHideId, setPendingHideId] = useState<string | null>(null);

  // ── Filter / search / sort state ───────────────────────────────────────────
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "customer" | "owner"
  >("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("newest");

  // ── Pagination state (resets on filter/search/sort/tab change) ─────────────
  const [page, setPage] = useState(1);
  const resetPage = () => setPage(1);

  // ── Bulk selection state ───────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // ── Invite action pending tracking ────────────────────────────────────────
  const [pendingResendId, setPendingResendId] = useState<string | null>(null);
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);

  // ── Mutations: single-item ─────────────────────────────────────────────────
  const approveMutation = api.testimonial.approve.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      setPendingApproveId(null);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setPendingApproveId(null);
    },
  });

  const hideMutation = api.testimonial.toggleHidden.useMutation({
    onSuccess: () => {
      toast.success("Updated");
      setPendingHideId(null);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setPendingHideId(null);
    },
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

  // ── Mutations: bulk ────────────────────────────────────────────────────────
  const bulkApproveMutation = api.testimonial.bulkApprove.useMutation({
    onSuccess: (data) => {
      toast.success(`Approved ${data.count} testimonial(s)`);
      setSelectedIds(new Set());
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkHideMutation = api.testimonial.bulkSetHidden.useMutation({
    onSuccess: (data) => {
      toast.success(`Updated ${data.count} testimonial(s)`);
      setSelectedIds(new Set());
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkDeleteMutation = api.testimonial.bulkDelete.useMutation({
    onSuccess: (data) => {
      toast.success(`Deleted ${data.count} testimonial(s)`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => toast.error(e.message),
  });

  const bulkPending =
    bulkApproveMutation.isPending ||
    bulkHideMutation.isPending ||
    bulkDeleteMutation.isPending;

  // ── Mutations: invite management ───────────────────────────────────────────
  const resendInviteMutation = api.testimonial.resendInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite resent");
      setPendingResendId(null);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setPendingResendId(null);
    },
  });

  const cancelInviteMutation = api.testimonial.cancelInvite.useMutation({
    onSuccess: () => {
      toast.success("Invite cancelled");
      setPendingCancelId(null);
      setCancelInviteId(null);
      void utils.testimonial.invalidate();
      void router.refresh();
    },
    onError: (e) => {
      toast.error(e.message);
      setPendingCancelId(null);
    },
  });

  // ── Search + sort helpers ──────────────────────────────────────────────────
  const searchLower = search.toLowerCase();

  const matchesSearch = (t: Testimonial) => {
    if (!search) return true;
    return (
      t.customerName.toLowerCase().includes(searchLower) ||
      (t.customerEmail ?? "").toLowerCase().includes(searchLower) ||
      t.text.toLowerCase().includes(searchLower)
    );
  };

  const sortFn = (a: Testimonial, b: Testimonial): number => {
    if (sortKey === "newest") {
      return (
        new Date(b.testimonialDate).getTime() -
        new Date(a.testimonialDate).getTime()
      );
    }
    if (sortKey === "oldest") {
      return (
        new Date(a.testimonialDate).getTime() -
        new Date(b.testimonialDate).getTime()
      );
    }
    // name
    return a.customerName.localeCompare(b.customerName);
  };

  // ── Status groups (raw, before search/sort/source) ─────────────────────────
  const all = testimonials ?? [];
  const pending = all.filter((t) => !t.isApproved && !t.isHidden);
  const published = all.filter((t) => t.isApproved && !t.isHidden);
  const hidden = all.filter((t) => t.isHidden);

  // Apply search + source + sort to a given status list
  const applyFilters = (list: Testimonial[]) =>
    list
      .filter(matchesSearch)
      .filter((t) => sourceFilter === "all" || t.source === sourceFilter)
      .sort(sortFn);

  // Paginate a filtered list
  const paginate = <T,>(list: T[]): { slice: T[]; totalPages: number } => {
    const totalPages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const slice = list.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
    return { slice, totalPages };
  };

  // ── Bulk selection helpers ─────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = (ids: string[]) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });

  const deselectAll = () => setSelectedIds(new Set());

  // ── Invite helpers ─────────────────────────────────────────────────────────
  type Invite = (typeof invites)[number];
  const now = new Date();
  const completedInvites = invites?.filter((i) => i.used) ?? [];
  const pendingInvites =
    invites?.filter((i) => !i.used && new Date(i.expiresAt) > now) ?? [];
  const expiredInvites =
    invites?.filter((i) => !i.used && new Date(i.expiresAt) <= now) ?? [];

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
          : (invites ?? []);

  const getInviteStatus = (
    invite: Invite,
  ): "completed" | "pending" | "expired" =>
    invite.used
      ? "completed"
      : new Date(invite.expiresAt) <= now
        ? "expired"
        : "pending";

  // ── Shared toolbar (search + source + sort) — matches collections style ────
  const filterBar = (resultCount: number) => {
    const isFiltering = search.trim() !== "" || sourceFilter !== "all";
    return (
      <div className="sticky top-0 z-20 mb-4 rounded-lg border bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                resetPage();
              }}
              placeholder="Search by name, email, or text..."
              className="pl-10"
              aria-label="Search testimonials"
            />
          </div>

          {/* Source filter */}
          <div className="w-full md:w-44">
            <Select
              value={sourceFilter}
              onValueChange={(v) => {
                setSourceFilter(v as "all" | "customer" | "owner");
                resetPage();
                deselectAll();
              }}
            >
              <SelectTrigger className="w-full" aria-label="Filter by source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="customer">Customer</SelectItem>
                <SelectItem value="owner">Owner Added</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sort */}
          <div className="w-full md:w-44">
            <Select
              value={sortKey}
              onValueChange={(v) => {
                setSortKey(v as SortKey);
                resetPage();
              }}
            >
              <SelectTrigger className="w-full" aria-label="Sort order">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name A–Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Result count */}
          {isFiltering && (
            <div className="flex items-center">
              <span className="text-muted-foreground text-sm">
                {resultCount} {resultCount === 1 ? "result" : "results"}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ── Select-all-on-page row (plain checkbox — not nested in a button) ───────
  const selectAllRow = (pageIds: string[]) => {
    if (pageIds.length === 0) return null;
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    const someSelected =
      !allSelected && pageIds.some((id) => selectedIds.has(id));
    return (
      <div className="mb-3 flex items-center gap-2 px-1">
        <Checkbox
          id="select-all-page"
          checked={allSelected ? true : someSelected ? "indeterminate" : false}
          onCheckedChange={() => {
            if (allSelected) {
              setSelectedIds((prev) => {
                const next = new Set(prev);
                pageIds.forEach((id) => next.delete(id));
                return next;
              });
            } else {
              selectAll(pageIds);
            }
          }}
          aria-label="Select all on this page"
        />
        <label
          htmlFor="select-all-page"
          className="text-muted-foreground cursor-pointer text-sm"
        >
          Select all on this page
        </label>
      </div>
    );
  };

  // ── Bulk action bar ────────────────────────────────────────────────────────
  const bulkActionBar = () => {
    if (selectedIds.size === 0) return null;
    const ids = Array.from(selectedIds);
    return (
      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2">
        <span className="text-sm font-medium text-blue-800">
          {selectedIds.size} selected
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={bulkPending}
            onClick={() =>
              bulkApproveMutation.mutate({ ids, isApproved: true })
            }
          >
            {bulkApproveMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-3.5 w-3.5" />
            )}
            Approve
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkPending}
            onClick={() => bulkHideMutation.mutate({ ids, isHidden: true })}
          >
            {bulkHideMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <EyeOff className="mr-1.5 h-3.5 w-3.5" />
            )}
            Hide
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={bulkPending}
            onClick={() => bulkHideMutation.mutate({ ids, isHidden: false })}
          >
            {bulkHideMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="mr-1.5 h-3.5 w-3.5" />
            )}
            Unhide
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={bulkPending}
            onClick={() => setBulkDeleteOpen(true)}
          >
            {bulkDeleteMutation.isPending ? (
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            )}
            Delete
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={deselectAll}
            disabled={bulkPending}
          >
            Clear
          </Button>
        </div>
      </div>
    );
  };

  // ── Pagination bar ─────────────────────────────────────────────────────────
  const paginationBar = (totalPages: number, totalItems: number) => {
    if (totalPages <= 1) return null;
    const safePage = Math.min(page, totalPages);
    return (
      <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
        <span>
          Showing {(safePage - 1) * PAGE_SIZE + 1}–
          {Math.min(safePage * PAGE_SIZE, totalItems)} of {totalItems}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => p - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2">
            {safePage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  };

  // ── Individual testimonial card ────────────────────────────────────────────
  const renderTestimonial = (testimonial: Testimonial) => {
    const isApprovePending =
      pendingApproveId === testimonial.id && approveMutation.isPending;
    const isHidePending =
      pendingHideId === testimonial.id && hideMutation.isPending;
    const isDeletePending =
      deleteId === testimonial.id && deleteMutation.isPending;
    const anyPending = isApprovePending || isHidePending || isDeletePending;

    return (
      <Card key={testimonial.id}>
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <div className="pt-1">
              <Checkbox
                id={`select-${testimonial.id}`}
                checked={selectedIds.has(testimonial.id)}
                onCheckedChange={() => toggleSelect(testimonial.id)}
                aria-label={`Select testimonial by ${testimonial.customerName}`}
              />
            </div>

            <div className="min-w-0 flex-1">
              {/* Header row */}
              <div className="mb-2 flex flex-wrap items-center gap-2">
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

                {testimonial.isApproved && !testimonial.isHidden && (
                  <Badge className="bg-green-600 text-xs">Published</Badge>
                )}
                {!testimonial.isApproved && !testimonial.isHidden && (
                  <Badge variant="secondary" className="text-xs">
                    Pending
                  </Badge>
                )}
                {testimonial.isHidden && (
                  <Badge variant="destructive" className="text-xs">
                    Hidden
                  </Badge>
                )}
              </div>

              {testimonial.title && (
                <p className="mb-1 text-sm font-semibold">
                  {testimonial.title}
                </p>
              )}

              <p className="mb-3 line-clamp-3 text-sm text-gray-700">
                {testimonial.text}
              </p>

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

              <p className="mt-1 text-xs text-gray-400">
                {testimonial.source === "owner"
                  ? format(new Date(testimonial.testimonialDate), "MMM d, yyyy")
                  : formatDistanceToNow(new Date(testimonial.createdAt), {
                      addSuffix: true,
                    })}
              </p>
            </div>

            {/* Actions dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={anyPending}
                  aria-label="Actions"
                >
                  {anyPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
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

                {!testimonial.isApproved && !testimonial.isHidden && (
                  <DropdownMenuItem
                    disabled={isApprovePending}
                    onClick={() => {
                      setPendingApproveId(testimonial.id);
                      approveMutation.mutate({
                        id: testimonial.id,
                        isApproved: true,
                      });
                    }}
                  >
                    {isApprovePending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </DropdownMenuItem>
                )}

                {testimonial.isApproved && !testimonial.isHidden && (
                  <DropdownMenuItem
                    disabled={isApprovePending}
                    onClick={() => {
                      setPendingApproveId(testimonial.id);
                      approveMutation.mutate({
                        id: testimonial.id,
                        isApproved: false,
                      });
                    }}
                  >
                    {isApprovePending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <EyeOff className="mr-2 h-4 w-4" />
                    )}
                    Unapprove
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  disabled={isHidePending}
                  onClick={() => {
                    setPendingHideId(testimonial.id);
                    hideMutation.mutate({
                      id: testimonial.id,
                      isHidden: !testimonial.isHidden,
                    });
                  }}
                >
                  {isHidePending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : testimonial.isHidden ? (
                    <Eye className="mr-2 h-4 w-4" />
                  ) : (
                    <EyeOff className="mr-2 h-4 w-4" />
                  )}
                  {testimonial.isHidden ? "Unhide" : "Hide"}
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
  };

  const emptyState = (message: string) => (
    <Card>
      <CardContent className="py-12 text-center text-gray-500">
        <p>{message}</p>
      </CardContent>
    </Card>
  );

  // ── Individual invite card ─────────────────────────────────────────────────
  const renderInvite = (invite: Invite) => {
    const status = getInviteStatus(invite);
    const displayName =
      invite.customer?.firstName || invite.customer?.lastName
        ? [invite.customer.firstName, invite.customer.lastName]
            .filter(Boolean)
            .join(" ")
        : null;

    const isResending =
      pendingResendId === invite.id && resendInviteMutation.isPending;
    const isCancelling =
      pendingCancelId === invite.id && cancelInviteMutation.isPending;

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

            {/* Resend / Cancel buttons — only for pending invites */}
            {status === "pending" && (
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isResending || isCancelling}
                  onClick={() => {
                    setPendingResendId(invite.id);
                    resendInviteMutation.mutate({ id: invite.id });
                  }}
                  aria-label="Resend invite"
                >
                  {isResending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Resend</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isResending || isCancelling}
                  onClick={() => setCancelInviteId(invite.id)}
                  className="text-red-600 hover:text-red-700"
                  aria-label="Cancel invite"
                >
                  {isCancelling ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                  <span className="ml-1.5 hidden sm:inline">Cancel</span>
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const inviteEmptyMessage =
    inviteFilter === "completed"
      ? "No completed invites"
      : inviteFilter === "pending"
        ? "No pending invites"
        : inviteFilter === "expired"
          ? "No expired invites"
          : "No invites sent yet";

  // ── Testimonials tab content with search/sort/pagination ───────────────────
  const testimonialsTabContent = (
    list: Testimonial[],
    emptyMessage: string,
  ) => {
    const filtered = applyFilters(list);
    const { slice, totalPages } = paginate(filtered);
    const pageIds = slice.map((t) => t.id);

    return (
      <>
        {filterBar(filtered.length)}
        {bulkActionBar()}
        {slice.length === 0 ? (
          emptyState(
            search || sourceFilter !== "all"
              ? "No testimonials match your filters"
              : emptyMessage,
          )
        ) : (
          <>
            {selectAllRow(pageIds)}
            <div className="space-y-3">{slice.map(renderTestimonial)}</div>
          </>
        )}
        {paginationBar(totalPages, filtered.length)}
      </>
    );
  };

  return (
    <>
      <Tabs
        defaultValue="testimonials"
        onValueChange={() => {
          resetPage();
          deselectAll();
        }}
      >
        <TabsList>
          <TabsTrigger value="testimonials">
            Testimonials ({all.length})
            {pending.length > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1">
                {pending.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-1.5">
            <Mail className="h-4 w-4" />
            Invites ({invites?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="testimonials" className="mt-6">
          <Tabs
            defaultValue="pending"
            onValueChange={() => {
              resetPage();
              deselectAll();
            }}
          >
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending
                {pending.length > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-2 h-5 min-w-5 px-1"
                  >
                    {pending.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="published">
                Published ({published.length})
              </TabsTrigger>
              <TabsTrigger value="hidden">Hidden ({hidden.length})</TabsTrigger>
              <TabsTrigger value="all">All ({all.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-3">
              {testimonialsTabContent(
                pending,
                "No pending testimonials — you're all caught up!",
              )}
            </TabsContent>

            <TabsContent value="published" className="space-y-3">
              {testimonialsTabContent(
                published,
                "No published testimonials yet",
              )}
            </TabsContent>

            <TabsContent value="hidden" className="space-y-3">
              {testimonialsTabContent(hidden, "No hidden testimonials")}
            </TabsContent>

            <TabsContent value="all" className="space-y-3">
              {testimonialsTabContent(all, "No testimonials yet")}
            </TabsContent>
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
              {filteredInvites.length === 0
                ? emptyState(inviteEmptyMessage)
                : filteredInvites.map(renderInvite)}
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

      {/* Single delete confirmation */}
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
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk delete confirmation */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedIds.size} Testimonial
              {selectedIds.size !== 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {selectedIds.size} testimonial
              {selectedIds.size !== 1 ? "s" : ""} and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                bulkDeleteMutation.mutate({ ids: Array.from(selectedIds) })
              }
              className="bg-red-600 hover:bg-red-700"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Delete {selectedIds.size}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel invite confirmation */}
      <AlertDialog
        open={!!cancelInviteId}
        onOpenChange={() => setCancelInviteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              This will expire the invite immediately. The recipient will no
              longer be able to use their link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep invite</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!cancelInviteId) return;
                setPendingCancelId(cancelInviteId);
                cancelInviteMutation.mutate({ id: cancelInviteId });
              }}
              className="bg-red-600 hover:bg-red-700"
              disabled={cancelInviteMutation.isPending}
            >
              {cancelInviteMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Cancel invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Hide/Unhide share bulkHideMutation.isPending; the bulk action bar
          distinguishes them by button label. Hide/Approve fire immediately, so
          they need no confirmation dialog. */}
    </>
  );
}
