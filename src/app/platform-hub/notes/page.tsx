import Link from "next/link";

import { cn } from "~/lib/utils";
import { api } from "~/trpc/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

import { PlatformListFilters } from "../_components/platform-list-filters";
import { PlatformListPagination } from "../_components/platform-list-pagination";
import { PlatformTrailHeader } from "../_components/platform-trail-header";
import { NotesTable } from "./_components/notes-table";

const PAGE_SIZE = 25;

const STATUS_TABS = [
  { value: "open", label: "Open" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["value"];

type Props = {
  searchParams: Promise<{
    status?: string;
    search?: string;
    page?: string;
  }>;
};

export default async function PlatformNotesPage({ searchParams }: Props) {
  const params = await searchParams;
  const status: StatusFilter =
    params.status === "resolved" || params.status === "all"
      ? params.status
      : "open";
  const page = Math.max(1, parseInt(params.page ?? "1", 10));
  const offset = (page - 1) * PAGE_SIZE;

  const { notes, total } = await api.editorNote.platformList({
    status,
    search: params.search,
    limit: PAGE_SIZE,
    offset,
  });

  const buildStatusHref = (value: StatusFilter) => {
    const query = new URLSearchParams();
    if (value !== "open") {
      query.set("status", value);
    }
    if (params.search) {
      query.set("search", params.search);
    }
    const qs = query.toString();
    return qs ? `/notes?${qs}` : "/notes";
  };

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Notes" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Site Notes</h1>
            <p>Change requests clients leave in their site editor</p>
          </div>
        </div>

        <div className="mb-6 flex w-fit items-center gap-1 rounded-lg border bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <Link
              key={tab.value}
              href={buildStatusHref(tab.value)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                status === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
              aria-current={status === tab.value ? "page" : undefined}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        <PlatformListFilters
          total={total}
          placeholder="Search by business name..."
        />

        {notes.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No notes found</CardTitle>
              <CardDescription>
                {params.search
                  ? "Try a different search term."
                  : status === "open"
                    ? "No open notes right now."
                    : status === "resolved"
                      ? "No resolved notes yet."
                      : "No notes have been left on the platform yet."}
              </CardDescription>
            </CardHeader>
            <CardContent />
          </Card>
        ) : (
          <>
            <NotesTable notes={notes} />
            <PlatformListPagination
              total={total}
              page={page}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Notes",
};
