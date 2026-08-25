"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ExternalLink,
  Info,
  MoreVertical,
  Plug,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { AdminFormMoreMenuItem } from "../../_components/admin-form-more-menu";
import type { InvoiceFormDefaults } from "./invoice-form-dialog";
import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { DepositRule } from "~/lib/quickbooks/types";
import type { QboInvoiceKind } from "~/lib/validators/quickbooks";
import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { qboInvoiceUrl } from "~/lib/quickbooks/constants";
import { cn } from "~/lib/utils";
import {
  QBO_INVOICE_KIND_LABELS,
  QBO_INVOICE_KIND_VALUES,
} from "~/lib/validators/quickbooks";
import { api } from "~/trpc/react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
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

import { AdminEmpty } from "../../_components/admin-empty";
import { AdminFilters } from "../../_components/admin-filters";
import { AdminPagination } from "../../_components/admin-pagination";
import {
  DANGER_TEXT,
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import {
  dismissLoadingToast,
  loadingToast,
} from "../../_lib/admin-mutation-toast";
import { InvoiceFormDialog } from "./invoice-form-dialog";
import { InvoiceStatusBadge } from "./invoice-status-badge";

/**
 * Same idiom as `InvoiceStatusBadge`'s `KNOWN_STATUSES` — `kind` is a plain
 * `string` column (see the schema comment on `QuickBooksInvoice.kind`), so
 * the tuple guards the label lookup rather than an unchecked index.
 */
const KNOWN_KINDS: readonly string[] = QBO_INVOICE_KIND_VALUES;

function kindLabel(kind: string): string {
  return KNOWN_KINDS.includes(kind)
    ? QBO_INVOICE_KIND_LABELS[kind as QboInvoiceKind]
    : kind;
}

/**
 * Both date formatters take an EXPLICIT zone rather than going through
 * `~/lib/format-date`, which reads the ambient one — that's the server's zone
 * during the RSC render and the viewer's once React hydrates, so a Detroit
 * store viewed from Denver server-renders one date and client-renders another.
 * A hydration mismatch that only reproduces for people in the wrong zone.
 * `formatEventDate` is the same fix on the Events table.
 *
 * The two zones are deliberately DIFFERENT:
 *
 * - `createdAt` is a real instant, so it renders in the store's own zone
 *   (`Business.timeZone`, threaded down from `quickbooks.getConnection`).
 * - `dueDate` is a CALENDAR date. It is written as UTC midnight of that date
 *   (`new Date(\`${input.dueDate}T00:00:00Z\`)` in `quickbooks.createInvoice`
 *   and in the sync path) and read back with `.toISOString().slice(0, 10)` in
 *   `issueInvoice`, so the calendar date IS the UTC one. Rendering that
 *   instant in any zone west of UTC yields the PREVIOUS day — an off-by-one on
 *   the single date the customer is being held to — so it is formatted in UTC,
 *   matching how it was stored.
 */
const CREATED_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatCreated(date: Date, timeZone: string): string {
  // Cached per zone: constructing an Intl.DateTimeFormat is the expensive
  // part and the format never varies per row (same reason `src/lib/events/
  // format.ts` caches, and why the Orders table hoists its formatter).
  let formatter = CREATED_FORMATTERS.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    CREATED_FORMATTERS.set(timeZone, formatter);
  }
  return formatter.format(date);
}

const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

// The row shape `quickbooks.listInvoices` returns, narrowed to exactly what
// this table renders — mirrors `QuoteRow` on the Quotes page.
export type InvoiceRow = Pick<
  RouterOutputs["quickbooks"]["listInvoices"]["rows"][number],
  | "id"
  | "kind"
  | "amountCents"
  | "balanceCents"
  | "status"
  | "dueDate"
  | "customerName"
  | "customerEmail"
  | "qboInvoiceId"
  | "qboDocNumber"
  | "lastError"
  | "createdAt"
  | "quoteSubmission"
>;

type ConnectionData =
  RouterOutputs["quickbooks"]["getConnection"]["connection"];

type Props = {
  connection: ConnectionData;
  environment: QboEnvironment;
  timeZone: string;
  rows: InvoiceRow[];
  totalCount: number;
  totalPages: number;
  page: number;
  pageSize: number;
  /** Unfiltered rows fetched (bounded by QBO_INVOICE_LIST_MAX_ROWS) — distinguishes "no invoices yet" from "no matches". */
  totalInvoices: number;
  /** True lifetime count from the DB — exceeds totalInvoices once the fetch cap trims old rows. */
  lifetimeTotal: number;
  filters: AdminFilterDef[];
  openNew: boolean;
  defaultDueDays: number;
  depositRule: DepositRule;
  /** `quickbooks.isEnabled` from the resolved business flags — `ownerCanToggle: true`, so the page stays reachable and the records stay visible while it's off; only write actions are disabled. */
  featureEnabled: boolean;
};

const BASE_PATH = "/admin/invoices";
const ITEM_NOUN = { one: "invoice", many: "invoices" } as const;

// Aliased to the short names this file reads with, matching every migrated
// table (Orders, Inventory, Events).
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

/**
 * Deliberately NO checkbox column and NO AdminBulkBar — the Inventory/Orders
 * selective-adoption precedent (docs/admin-table-migration.md §7). Every
 * row action here either emails a real customer through QuickBooks
 * (Send/Resend) or calls Intuit (Refresh/Retry), and there is no bulk
 * counterpart to any of them; a mis-click on "all 25" would put 25 real
 * invoices in 25 real inboxes with no undo. Nor is there a bulk delete to
 * hang off a selection: the invoice lives in QuickBooks Online, so removing
 * it is a void performed over there, not a row this table owns. Filters,
 * pagination, empty states and the style tokens are adopted in full — the
 * primitives are independently adoptable.
 */

const NEW_INVOICE_DEFAULTS: InvoiceFormDefaults = {
  kind: "custom",
  amountCents: null,
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

/** Rendered in both the desktop Balance cell and the md:hidden reflow line —
 *  one constant so the two can't drift into reading like different facts. */
const PARTIALLY_PAID_NOTE = "Partially paid";

const NOT_CONNECTED_HELP =
  "Connect QuickBooks in Settings → Integrations first.";

const FEATURE_DISABLED_HELP =
  "QuickBooks invoicing is turned off. Turn it back on in Settings → Features first.";

/** Shared disabled-button tooltip for the header actions and the empty-state "New invoice" button — feature-off takes precedence over not-connected, since re-enabling it is the first step either way. */
function actionDisabledTitle(
  featureEnabled: boolean,
  isActive: boolean,
): string | undefined {
  if (!featureEnabled) return FEATURE_DISABLED_HELP;
  if (!isActive) return NOT_CONNECTED_HELP;
  return undefined;
}

/** "Deposits default to 25% of the quote total; new invoices are due in 7 days." */
function describeDefaults(rule: DepositRule, defaultDueDays: number): string {
  const depositPart =
    rule.depositMode === "percent"
      ? `${rule.depositPercent}% of the quote total`
      : formatPrice(rule.depositFixedCents);
  const duePart =
    defaultDueDays === 0
      ? "due on receipt"
      : `due in ${defaultDueDays} day${defaultDueDays === 1 ? "" : "s"}`;
  return `Deposits default to ${depositPart}; new invoices are ${duePart}.`;
}

export function InvoicesClient({
  connection,
  environment,
  timeZone,
  rows,
  totalCount,
  totalPages,
  page,
  pageSize,
  totalInvoices,
  lifetimeTotal,
  filters,
  openNew,
  defaultDueDays,
  depositRule,
  featureEnabled,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  const isActive = connection?.status === "active";
  const neverConnected = !connection || connection.status === "disconnected";
  // Every write action (create/send/sync) requires BOTH an active connection
  // AND the feature flag on — the same "not-active" treatment `isActive`
  // already got, now widened to also cover the owner toggle.
  const canAct = isActive && featureEnabled;

  // Mirrors the `?new=1` → dialog-open contract other admin pages use for
  // deep-linking a create flow from the command palette. Re-synced on a
  // false→true transition of the prop, same "adjust state during render"
  // idiom `AdminFilters` uses to re-seed its search box — a param that was
  // already true when this component mounted is handled by the `useState`
  // initializer, this only catches a LATER navigation to `?new=1` on an
  // already-mounted page.
  const [newOpen, setNewOpen] = useState(openNew && canAct);
  const [lastOpenNewProp, setLastOpenNewProp] = useState(openNew);
  if (openNew !== lastOpenNewProp) {
    setLastOpenNewProp(openNew);
    if (openNew && canAct) setNewOpen(true);
  }

  const handleNewOpenChange = (next: boolean) => {
    setNewOpen(next);
    // Drop `?new=1` once the dialog closes (cancelled or submitted) so a
    // refresh/back-nav doesn't reopen it.
    if (!next && searchParams.get("new") !== null) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("new");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    }
  };

  /**
   * The §2 settle step, identical on all four mutations: no optimistic
   * updates (the rows arrive as RSC props, so there is no client cache entry
   * to patch), just invalidate the router's queries and re-render the server
   * component. `invalidate()` matters even though this table reads its rows
   * from props — `quickbooks.getConnection` and `getLeadInvoices` are cached
   * client-side and a sync changes what both of them say.
   */
  const afterWrite = () => {
    void utils.quickbooks.invalidate();
    router.refresh();
  };

  const syncMutation = api.quickbooks.syncNow.useMutation({
    onMutate: loadingToast("Syncing…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Synced ${data.updated} ${data.updated === 1 ? ITEM_NOUN.one : ITEM_NOUN.many}`,
      );
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to sync invoices");
    },
  });

  const sendMutation = api.quickbooks.sendInvoice.useMutation({
    onMutate: loadingToast("Sending…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice sent");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to send invoice");
    },
  });

  const refreshMutation = api.quickbooks.refreshInvoice.useMutation({
    onMutate: loadingToast("Refreshing…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice status refreshed");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to refresh invoice");
    },
  });

  const retryMutation = api.quickbooks.retryInvoice.useMutation({
    onMutate: loadingToast("Retrying…"),
    onSuccess: (_data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success("Invoice retried");
      afterWrite();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to retry invoice");
    },
  });

  const rowIsPending = (rowId: string) =>
    (sendMutation.isPending && sendMutation.variables?.id === rowId) ||
    (refreshMutation.isPending && refreshMutation.variables?.id === rowId) ||
    (retryMutation.isPending && retryMutation.variables?.id === rowId);

  const buildRowActions = (row: InvoiceRow): AdminFormMoreMenuItem[] => {
    const pending = rowIsPending(row.id);
    const items: AdminFormMoreMenuItem[] = [];

    // Send/Resend/Refresh/Retry all mutate or call Intuit, so they drop out
    // entirely while the feature is off — "Open in QuickBooks" below is a
    // plain outbound link and stays regardless.
    if (featureEnabled) {
      if (row.status === "created") {
        items.push({
          label: "Send",
          icon: Send,
          disabled: pending,
          onSelect: () => sendMutation.mutate({ id: row.id }),
        });
      } else if (row.status === "sent" || row.status === "overdue") {
        items.push({
          label: "Resend",
          icon: Send,
          disabled: pending,
          onSelect: () => sendMutation.mutate({ id: row.id }),
        });
      }

      if (row.qboInvoiceId) {
        items.push({
          label: "Refresh status",
          icon: RefreshCw,
          disabled: pending,
          onSelect: () => refreshMutation.mutate({ id: row.id }),
        });
      }

      if (row.status === "error" || row.status === "pending") {
        items.push({
          label: "Retry",
          icon: RotateCcw,
          disabled: pending,
          onSelect: () => retryMutation.mutate({ id: row.id }),
        });
      }
    }

    if (row.qboInvoiceId) {
      items.push({
        label: "Open in QuickBooks",
        icon: ExternalLink,
        href: qboInvoiceUrl(environment, row.qboInvoiceId),
      });
    }

    return items;
  };

  const hasAnyInvoices = totalInvoices > 0;
  const hasResults = rows.length > 0;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Invoices</h1>
          <p>Send and track QuickBooks Online invoices for your leads</p>
          <p className="text-xs">
            {describeDefaults(depositRule, defaultDueDays)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => syncMutation.mutate()}
            disabled={!canAct || syncMutation.isPending}
            title={actionDisabledTitle(featureEnabled, isActive)}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync now
          </Button>
          <Button
            onClick={() => setNewOpen(true)}
            disabled={!canAct}
            title={actionDisabledTitle(featureEnabled, isActive)}
          >
            <Plus className="mr-2 h-4 w-4" />
            New invoice
          </Button>
        </div>
      </div>

      {!featureEnabled && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>QuickBooks invoicing is turned off</AlertTitle>
          <AlertDescription>
            Your invoices are kept and stay in sync with nothing — turn the
            feature back on in Settings → Features to send new invoices or
            refresh status.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" asChild size="xs">
              <Link href="/admin/settings/features">Settings → Features</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* The connection state is an Alert, not an AdminEmpty — a sibling of
          the feature-off banner above, because it says the same KIND of thing
          ("the integration isn't ready", with the one link that fixes it).
          It used to be an AdminEmpty, which conflated two different questions:
          a disconnected store with 40 invoices got a full-height "nothing
          here" block stacked on top of its populated table, and a connected
          store with none got a different empty state than a disconnected one.
          AdminEmpty is now reserved for the two DATA-empty states below, whose
          gate is the unfiltered row count and nothing else. */}
      {!isActive && (
        <Alert className="mb-6">
          <Plug className="h-4 w-4" />
          <AlertTitle>
            {neverConnected
              ? "Connect QuickBooks to send invoices"
              : "Reconnect QuickBooks"}
          </AlertTitle>
          <AlertDescription>
            {neverConnected
              ? "Connect your QuickBooks Online account to create and send invoices from your leads."
              : "QuickBooks needs to be reconnected before you can send or sync invoices."}
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" asChild size="xs">
              <Link href="/admin/settings/integrations">
                {neverConnected ? "Connect QuickBooks" : "Reconnect QuickBooks"}
              </Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* The empty-state gate is the UNFILTERED total, never `totalCount` — a
          search matching nothing reports zero and would tell a store with 400
          invoices it has none (§4). Historical invoices stay visible while
          disconnected, so this is about data, not about the connection. */}
      {!hasAnyInvoices ? (
        <AdminEmpty
          icon={Receipt}
          title="No invoices yet"
          description="Invoices you raise against a quote lead, or create by hand, show up here."
          action={
            // Primary, like Orders' "Create Manual Order" — the unfiltered
            // empty state's whole job is to offer the create action. It stays
            // rendered but disabled (with the reason in `title`) when the
            // feature is off or QuickBooks isn't connected, so the page never
            // reads as having nothing to offer.
            <Button
              onClick={() => setNewOpen(true)}
              disabled={!canAct}
              title={actionDisabledTitle(featureEnabled, isActive)}
            >
              <Plus className="mr-2 h-4 w-4" />
              New invoice
            </Button>
          }
        />
      ) : (
        <>
          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search invoices…"
            // Names every field the predicate in page.tsx actually matches —
            // the placeholder has no room for it and a bare "Search invoices"
            // leaves a screen-reader user guessing whether a doc number hits.
            searchAriaLabel="Search invoices by customer name, customer email, QuickBooks document number, or lead name"
            filters={filters}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
          />

          {lifetimeTotal > totalInvoices && (
            <p className="text-muted-foreground text-xs">
              Showing the {totalInvoices} most recent of {lifetimeTotal}{" "}
              invoices — older invoices are not listed.
            </p>
          )}

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title="No invoices match your filters"
              // AdminEmpty renders its own "Try adjusting your search or
              // filters." line when `filtered` — don't say it twice.
              filtered
              action={
                <Button variant="outline" asChild>
                  <Link href={BASE_PATH}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <Card className={TABLE_CARD}>
                <Table>
                  <TableCaption className="sr-only">Invoices</TableCaption>
                  <TableHeader>
                    <TableRow>
                      {/* One breakpoint for every secondary column, so the
                          single `md:hidden` reflow line under the identity
                          cell can carry all of them — a second `lg` tier would
                          leave Lead/Created invisible in the md–lg band, where
                          neither the column nor the reflow line renders. Same
                          shape Orders and Inventory use. */}
                      <TableHead scope="col" className={TH}>
                        Customer
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Kind
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Amount
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Balance
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Status
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Due
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Lead
                      </TableHead>
                      {/* The sort key for newest/oldest, rendered as its own
                          column so the default order has a visible cause.
                          Due is a SECOND date column on purpose — a distinct,
                          owner-meaningful field with its own sort, the same
                          exception Orders makes. */}
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Created
                      </TableHead>
                      <TableHead scope="col" className={cn("text-right", TH)}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      // Computed once per row: every one of these is rendered
                      // in BOTH the desktop column and the md:hidden reflow
                      // line, and two hand-written copies are how the two
                      // start reading like different facts (§5e).
                      const kindText = kindLabel(row.kind);
                      const amountLabel = formatPrice(row.amountCents);
                      const balanceLabel =
                        row.balanceCents != null
                          ? formatPrice(row.balanceCents)
                          : "—";
                      const isPartiallyPaid =
                        row.balanceCents != null &&
                        row.balanceCents > 0 &&
                        row.balanceCents < row.amountCents;
                      const dueLabel = row.dueDate
                        ? DUE_DATE_FORMAT.format(row.dueDate)
                        : "—";
                      const createdLabel = formatCreated(
                        row.createdAt,
                        timeZone,
                      );
                      const lead = row.quoteSubmission;
                      const actions = buildRowActions(row);

                      return (
                        <TableRow key={row.id}>
                          <TableCell className={cn("whitespace-normal", TD)}>
                            <div className="min-w-0">
                              <p className="font-medium">{row.customerName}</p>
                              <p className="text-muted-foreground line-clamp-1 text-sm">
                                {row.customerEmail}
                              </p>
                              {/* The QuickBooks document number is one of the
                                  four fields search matches (see the predicate
                                  in page.tsx), so it has to be readable in the
                                  row: a value an owner can filter by but never
                                  see is the dead end §7 warns about. It only
                                  exists once the invoice reaches QBO. */}
                              {row.qboDocNumber && (
                                <p className="text-muted-foreground text-sm">
                                  QuickBooks #{row.qboDocNumber}
                                </p>
                              )}
                              {/* Below md every secondary column is hidden —
                                  reflow them here rather than lose them. Each
                                  value carries its own noun because the column
                                  headers that supplied that meaning are
                                  `display:none` at this width (Orders
                                  precedent). */}
                              <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                                <span>{kindText}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-foreground font-medium tabular-nums">
                                  {amountLabel}
                                </span>
                                <span aria-hidden="true">·</span>
                                <InvoiceStatusBadge status={row.status} />
                                {isPartiallyPaid && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{PARTIALLY_PAID_NOTE}</span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">
                                  Due {dueLabel}
                                </span>
                                <span aria-hidden="true">·</span>
                                <span className="tabular-nums">
                                  Created {createdLabel}
                                </span>
                                {lead && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>
                                      Lead{" "}
                                      <Link
                                        href={`/admin/quotes/${lead.id}`}
                                        className="hover:underline"
                                      >
                                        {lead.contactName}
                                      </Link>
                                    </span>
                                  </>
                                )}
                              </div>
                              {/* The Status column is hidden below md, and a
                                  failure message is the one thing on this row
                                  that must never be the value that disappears. */}
                              {row.lastError && (
                                <p
                                  className={cn(
                                    DANGER_TEXT,
                                    "mt-1 text-xs md:hidden",
                                  )}
                                >
                                  {row.lastError}
                                </p>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className={cn("hidden md:table-cell", TD)}>
                            {kindText}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {amountLabel}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {balanceLabel}
                            {isPartiallyPaid && (
                              <p className="text-muted-foreground text-xs">
                                {PARTIALLY_PAID_NOTE}
                              </p>
                            )}
                          </TableCell>

                          {/* `whitespace-normal`: TableCell is nowrap by
                              default, and `lastError` is a full sentence from
                              Intuit that has to wrap inside its own width
                              rather than stretch the column. */}
                          <TableCell
                            className={cn(
                              "hidden whitespace-normal md:table-cell",
                              TD,
                            )}
                          >
                            <InvoiceStatusBadge status={row.status} />
                            {row.lastError && (
                              <p
                                className={cn(
                                  DANGER_TEXT,
                                  "mt-1 max-w-[16rem] text-xs",
                                )}
                              >
                                {row.lastError}
                              </p>
                            )}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {dueLabel}
                          </TableCell>

                          <TableCell className={cn("hidden md:table-cell", TD)}>
                            {/* The link is the NAME, not the whole cell — an
                                anchor wrapping the em dash fallback too would
                                give assistive tech a link named "—". */}
                            {lead ? (
                              <Link
                                href={`/admin/quotes/${lead.id}`}
                                className="hover:underline"
                              >
                                {lead.contactName}
                              </Link>
                            ) : (
                              "—"
                            )}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {createdLabel}
                          </TableCell>

                          <TableCell className={cn("text-right", TD)}>
                            {actions.length > 0 && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                    <span className="sr-only">
                                      Actions for {row.customerName}
                                    </span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {actions.map((action) => {
                                    const Icon = action.icon;
                                    if (action.href !== undefined) {
                                      return (
                                        <DropdownMenuItem
                                          key={action.label}
                                          asChild
                                        >
                                          <a
                                            href={action.href}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={`${action.label} (opens in new tab)`}
                                          >
                                            <Icon className="mr-2 h-4 w-4" />
                                            {action.label}
                                          </a>
                                        </DropdownMenuItem>
                                      );
                                    }
                                    return (
                                      <DropdownMenuItem
                                        key={action.label}
                                        disabled={action.disabled}
                                        onClick={action.onSelect}
                                      >
                                        <Icon className="mr-2 h-4 w-4" />
                                        {action.label}
                                      </DropdownMenuItem>
                                    );
                                  })}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              <AdminPagination
                page={page}
                totalPages={totalPages}
                totalCount={totalCount}
                pageSize={pageSize}
                basePath={BASE_PATH}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}

          <p className="text-muted-foreground mt-4 text-xs">
            Void or edit invoices in QuickBooks — status syncs back within about
            30 minutes, or use Sync now.
          </p>
        </>
      )}

      <InvoiceFormDialog
        open={newOpen}
        onOpenChange={handleNewOpenChange}
        defaults={NEW_INVOICE_DEFAULTS}
        defaultDueDays={defaultDueDays}
        timeZone={timeZone}
      />
    </div>
  );
}
