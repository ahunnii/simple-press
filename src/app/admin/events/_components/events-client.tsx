"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import type { RouterOutputs } from "~/trpc/react";
import { eventCutoff, formatEventDate } from "~/lib/events/format";
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
import { Card } from "~/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import { AdminEmpty } from "../../_components/admin-empty";

type Event = RouterOutputs["events"]["getAll"][number];

type Props = {
  events: RouterOutputs["events"]["getAll"];
  /** Business.timeZone — every date shown here goes through formatEventDate. */
  timeZone: string;
};

/**
 * "Past" = archived, OR its cutoff (end time, or start time when there's no
 * end) has already passed. This must NOT be `e.isArchived` alone: a cron job
 * only flips `isArchived` on a ~15-minute cadence, so an event that ended five
 * minutes ago would still read `isArchived: false` and sit under "Upcoming"
 * looking broken until the next cron run. Checking the real cutoff here makes
 * the tab split correct between cron runs, not just eventually.
 */
function isPast(e: Event, now: number): boolean {
  return e.isArchived || eventCutoff(e).getTime() < now;
}

export function EventsClient({ events, timeZone }: Props) {
  const utils = api.useUtils();
  const router = useRouter();

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteMutation = api.events.delete.useMutation({
    onMutate: () => toast.loading("Deleting event..."),
    onSuccess: () => {
      toast.dismiss();
      toast.success("Event deleted successfully");
      void utils.events.invalidate();
      router.refresh();
      setDeleteId(null);
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to delete event");
    },
  });

  const archiveMutation = api.events.setArchived.useMutation({
    onMutate: () => toast.loading("Updating event..."),
    onSuccess: (_data, variables) => {
      toast.dismiss();
      toast.success(
        variables.isArchived
          ? "Event archived — it's hidden from your site"
          : "Event moved back to upcoming",
      );
      void utils.events.invalidate();
      router.refresh();
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message ?? "Failed to update event");
    },
  });

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId);
  };

  const now = Date.now();
  const upcoming = events
    .filter((e) => !isPast(e, now))
    .sort(
      (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
    );
  const past = events
    .filter((e) => isPast(e, now))
    .sort(
      (a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime(),
    );

  const deletingEvent = events.find((e) => e.id === deleteId);
  const hasEvents = events.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Events</h1>
          <p>Manage the markets, pop-ups, and dates shown on your site</p>
        </div>
        <Button asChild>
          <Link href="/admin/events/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Event
          </Link>
        </Button>
      </div>

      {!hasEvents ? (
        <AdminEmpty
          icon={CalendarDays}
          title="No events yet"
          description="Add a market, pop-up, or workshop date so shoppers can see when to find you."
          action={
            <Button asChild>
              <Link href="/admin/events/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Event
              </Link>
            </Button>
          }
        />
      ) : (
        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">
              Upcoming ({upcoming.length})
            </TabsTrigger>
            <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="mt-4">
            {upcoming.length === 0 ? (
              <AdminEmpty
                icon={CalendarDays}
                title="No upcoming events"
                description="Anything you add here shows up on your site until it's over."
                action={
                  <Button asChild>
                    <Link href="/admin/events/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Event
                    </Link>
                  </Button>
                }
              />
            ) : (
              <EventsTable
                events={upcoming}
                timeZone={timeZone}
                tab="upcoming"
                onDelete={setDeleteId}
                onArchive={(id, isArchived) =>
                  archiveMutation.mutate({ id, isArchived })
                }
                archivePendingId={
                  archiveMutation.isPending
                    ? archiveMutation.variables?.id
                    : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="past" className="mt-4">
            {past.length === 0 ? (
              <AdminEmpty
                icon={CalendarDays}
                title="Nothing has happened yet"
                description="Events land here automatically once they've ended or been archived."
              />
            ) : (
              <EventsTable
                events={past}
                timeZone={timeZone}
                tab="past"
                onDelete={setDeleteId}
                onArchive={(id, isArchived) =>
                  archiveMutation.mutate({ id, isArchived })
                }
                archivePendingId={
                  archiveMutation.isPending
                    ? archiveMutation.variables?.id
                    : undefined
                }
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete
              {deletingEvent ? ` "${deletingEvent.name}"` : " this event"}? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

type EventsTableProps = {
  events: Event[];
  timeZone: string;
  tab: "upcoming" | "past";
  onDelete: (id: string) => void;
  onArchive: (id: string, isArchived: boolean) => void;
  archivePendingId: string | undefined;
};

function EventsTable({
  events,
  timeZone,
  tab,
  onDelete,
  onArchive,
  archivePendingId,
}: EventsTableProps) {
  const router = useRouter();

  return (
    <Card>
      <Table>
        <TableCaption className="sr-only">
          {tab === "upcoming" ? "Upcoming events" : "Past events"}
        </TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Event</TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              Date
            </TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              Location
            </TableHead>
            <TableHead scope="col" className="hidden md:table-cell">
              Status
            </TableHead>
            <TableHead scope="col">
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((event) => {
            const dateLabel = formatEventDate(event, timeZone);
            const isArchiving = archivePendingId === event.id;
            return (
              <TableRow
                key={event.id}
                onClick={() => router.push(`/admin/events/${event.id}`)}
                className="cursor-pointer"
              >
                <TableCell className="whitespace-normal">
                  <div className="flex items-center gap-3">
                    {event.coverImage ? (
                      <div className="bg-muted relative h-10 w-10 shrink-0 overflow-hidden rounded">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={event.coverImage}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                        <CalendarDays className="text-muted-foreground h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/admin/events/${event.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium hover:underline"
                        >
                          {event.name}
                        </Link>
                        {!event.published && (
                          <Badge variant="secondary" className="md:hidden">
                            Draft
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-sm md:hidden">
                        {dateLabel}
                      </p>
                    </div>
                  </div>
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {dateLabel}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {event.location ?? (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>

                <TableCell className="hidden md:table-cell">
                  {event.published ? (
                    <Badge variant="default">Published</Badge>
                  ) : (
                    <Badge variant="secondary">Draft</Badge>
                  )}
                  {event.isArchived && (
                    <Badge variant="outline" className="ml-1.5">
                      Archived
                    </Badge>
                  )}
                </TableCell>

                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">
                          Actions for {event.name}
                        </span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/admin/events/${event.id}`}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </DropdownMenuItem>
                      {tab === "upcoming" ? (
                        <DropdownMenuItem
                          disabled={isArchiving}
                          title="Archiving also hides this event from your site"
                          onClick={() => onArchive(event.id, true)}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Archive (hides from your site)
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          disabled={isArchiving}
                          onClick={() => onArchive(event.id, false)}
                        >
                          <ArchiveRestore className="mr-2 h-4 w-4" />
                          Move to upcoming
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDelete(event.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
