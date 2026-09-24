"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Info, Plug, Receipt, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

import type { AdminFilterDef } from "../../_components/admin-filters";
import type { InvoiceFormDefaults } from "./invoice-form-dialog";
import type { UnifiedInvoiceRow } from "~/lib/invoices/unified-list";
import type { QboEnvironment } from "~/lib/quickbooks/constants";
import type { DepositRule } from "~/lib/quickbooks/types";
import type { InvoiceListStatusFilter } from "~/lib/validators/invoice";
import type { QboInvoiceKind } from "~/lib/validators/quickbooks";
import type { RouterOutputs } from "~/trpc/react";
import { formatPrice } from "~/lib/prices";
import { cn } from "~/lib/utils";
import {
  INVOICE_LIST_STATUS_FILTER_LABELS,
  INVOICE_LIST_STATUS_FILTER_VALUES,
} from "~/lib/validators/invoice";
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
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
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
import { InvoiceSummaryCards } from "./invoice-summary-cards";
import { NativeInvoiceRowActions } from "./native-invoice-row-actions";
import { NativeInvoiceStatusBadge } from "./native-invoice-status-badge";
import { NewInvoiceButton } from "./new-invoice-button";
import { QboInvoiceRowActions } from "./qbo-invoice-row-actions";

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
 * `dueDate` is a CALENDAR date for both sources, stored as UTC midnight of
 * that date (native: `ymdToUtcMidnight`; QuickBooks: `${dueDate}T00:00:00Z`
 * in `quickbooks.createInvoice` and the sync path). Rendering that instant in
 * any zone west of UTC yields the PREVIOUS day — an off-by-one on the single
 * date the customer is held to — so it is formatted in UTC, matching how it
 * was stored. An explicit zone also keeps the server render and the hydrated
 * client render identical.
 */
const DUE_DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
  year: "numeric",
});

type ConnectionData =
  RouterOutputs["quickbooks"]["getConnection"]["connection"];

type Props = {
  rows: UnifiedInvoiceRow[];
  /** Set when the QuickBooks 1000-row cap (`QBO_INVOICE_LIST_MAX_ROWS`) trimmed older QuickBooks invoices. */
  qboListCap: { shown: number; total: number } | null;
  totalCount: number;
  page: number;
  pageCount: number;
  pageSize: number;
  status: InvoiceListStatusFilter;
  /** Any invoice at all, ignoring filters — separates "none yet" from "no matches". */
  hasAnyInvoices: boolean;
  /** A search/status/source narrows the result (sort and page don't). */
  filtersNarrow: boolean;
  filters: AdminFilterDef[];
  hasQboRows: boolean;
  /** `invoices` flag — native create/edit/send. Reads never depend on it. */
  invoicesEnabled: boolean;
  /** `quickbooks` flag — QuickBooks create/send/sync. */
  qboEnabled: boolean;
  summary: RouterOutputs["invoice"]["summary"];
  /** `Business.timeZone`. */
  timeZone: string;
  connection: ConnectionData;
  environment: QboEnvironment;
  /** The deployment has QuickBooks app credentials (`QBO_CLIENT_ID`/`SECRET`). */
  platformConfigured: boolean;
  openNew: boolean;
  defaultDueDays: number;
  depositRule: DepositRule;
};

const BASE_PATH = "/admin/invoices";
const ITEM_NOUN = { one: "invoice", many: "invoices" } as const;

// Aliased to the short names this file reads with, matching every migrated
// table (Orders, Inventory, Events).
const TH = TABLE_HEAD;
const TD = TABLE_CELL;

const TAB_CLASS =
  "focus-visible:outline-ring inline-flex shrink-0 items-center border-b-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";
const TAB_ACTIVE = "border-primary text-primary";
const TAB_INACTIVE =
  "text-muted-foreground hover:border-border hover:text-foreground border-transparent";

/**
 * Deliberately NO checkbox column and NO AdminBulkBar — the Inventory/Orders
 * selective-adoption precedent (docs/admin-table-migration.md §7). QuickBooks
 * row actions email real customers or call Intuit, native lifecycle actions
 * live on the detail page, and none of them has a safe bulk counterpart.
 */

const NEW_QBO_INVOICE_DEFAULTS: InvoiceFormDefaults = {
  kind: "custom",
  amountCents: null,
  customerName: "",
  customerEmail: "",
  customerPhone: "",
};

/** Rendered in both the desktop Balance cell and the md:hidden reflow line —
 *  one constant so the two can't drift into reading like different facts. */
const PARTIALLY_PAID_NOTE = "Partially paid";

const QBO_NOT_CONNECTED_HELP =
  "Connect QuickBooks in Settings → Integrations first.";
const QBO_FEATURE_DISABLED_HELP =
  "QuickBooks invoicing is turned off. Turn it back on in Settings → Features first.";
const QBO_UNAVAILABLE_HELP = "QuickBooks isn't available on this platform.";

/** Disabled reason for the QuickBooks create/sync actions — feature-off first, since re-enabling it is the first step either way. */
function qboDisabledReason(
  qboEnabled: boolean,
  platformConfigured: boolean,
  isActive: boolean,
): string | undefined {
  if (!qboEnabled) return QBO_FEATURE_DISABLED_HELP;
  if (!isActive) {
    return platformConfigured ? QBO_NOT_CONNECTED_HELP : QBO_UNAVAILABLE_HELP;
  }
  return undefined;
}

/** "Deposits default to 25% of the quote total; new invoices are due in 7 days." */
function describeQboDefaults(
  rule: DepositRule,
  defaultDueDays: number,
): string {
  const depositPart =
    rule.depositMode === "percent"
      ? `${rule.depositPercent}% of the quote total`
      : formatPrice(rule.depositFixedCents);
  const duePart =
    defaultDueDays === 0
      ? "due on receipt"
      : `due in ${defaultDueDays} day${defaultDueDays === 1 ? "" : "s"}`;
  return `QuickBooks deposits default to ${depositPart}; new QuickBooks invoices are ${duePart}.`;
}

function isPartiallyPaid(row: UnifiedInvoiceRow): boolean {
  return (
    row.status !== "cancelled" &&
    row.status !== "draft" &&
    row.balanceCents > 0 &&
    row.balanceCents < row.totalCents
  );
}

function RowStatusBadge({ row }: { row: UnifiedInvoiceRow }) {
  if (row.source === "native") {
    return (
      <NativeInvoiceStatusBadge status={row.status} isOverdue={row.isOverdue} />
    );
  }
  // The list's overdue rule is computed from the due date, not trusted from
  // the last sync, so a still-"sent" QuickBooks invoice that is past due reads
  // "Overdue" here — matching the Overdue tab it appears under.
  return (
    <InvoiceStatusBadge status={row.isOverdue ? "overdue" : row.rawStatus} />
  );
}

/** Tab strip over the table: one link per status, carrying every other param except `page`. */
function StatusTabs({ status }: { status: InvoiceListStatusFilter }) {
  const searchParams = useSearchParams();

  const hrefFor = (target: InvoiceListStatusFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    params.delete("new");
    if (target === "all") params.delete("status");
    else params.set("status", target);
    const qs = params.toString();
    return qs ? `${BASE_PATH}?${qs}` : BASE_PATH;
  };

  return (
    <nav aria-label="Invoice status" className="border-border mb-6 border-b">
      {/* Scrolls inside itself at phone widths rather than widening the page. */}
      <div className="no-scrollbar -mb-px flex overflow-x-auto">
        {INVOICE_LIST_STATUS_FILTER_VALUES.map((value) => (
          <Link
            key={value}
            href={hrefFor(value)}
            aria-current={status === value ? "page" : undefined}
            className={cn(
              TAB_CLASS,
              status === value ? TAB_ACTIVE : TAB_INACTIVE,
            )}
          >
            {INVOICE_LIST_STATUS_FILTER_LABELS[value]}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function InvoicesClient({
  rows,
  qboListCap,
  totalCount,
  page,
  pageCount,
  pageSize,
  status,
  hasAnyInvoices,
  filtersNarrow,
  filters,
  hasQboRows,
  invoicesEnabled,
  qboEnabled,
  summary,
  timeZone,
  connection,
  environment,
  platformConfigured,
  openNew,
  defaultDueDays,
  depositRule,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const utils = api.useUtils();

  // ─── QuickBooks state (unchanged from the QuickBooks-only page) ──────────

  const isActive = connection?.status === "active";
  const neverConnected = !connection || connection.status === "disconnected";
  // Every QuickBooks write (create/send/sync) requires BOTH an active
  // connection AND the `quickbooks` flag on.
  const qboCanAct = isActive && qboEnabled;
  // Show QuickBooks chrome (sync, alerts, the create path) when the flag is
  // on, or when QuickBooks rows exist — a store that switched QuickBooks off
  // still sees why its buttons are disabled. With only native invoicing and
  // no QuickBooks history, none of it renders.
  const showQuickBooks = qboEnabled || hasQboRows;
  const qboReason = qboDisabledReason(qboEnabled, platformConfigured, isActive);

  // Mirrors the `?new=1` → dialog-open contract other admin pages use for
  // deep-linking a create flow from the command palette (`new-quickbooks-
  // invoice`). Re-synced on a false→true transition of the prop, same "adjust
  // state during render" idiom `AdminFilters` uses to re-seed its search box.
  const [newOpen, setNewOpen] = useState(openNew && qboCanAct);
  const [lastOpenNewProp, setLastOpenNewProp] = useState(openNew);
  if (openNew !== lastOpenNewProp) {
    setLastOpenNewProp(openNew);
    if (openNew && qboCanAct) setNewOpen(true);
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

  const syncMutation = api.quickbooks.syncNow.useMutation({
    onMutate: loadingToast("Syncing…"),
    onSuccess: (data, _variables, context) => {
      dismissLoadingToast(context);
      toast.success(
        `Synced ${data.updated} ${data.updated === 1 ? ITEM_NOUN.one : ITEM_NOUN.many}`,
      );
      void utils.quickbooks.invalidate();
      void utils.invoice.invalidate();
      router.refresh();
    },
    onError: (error, _variables, context) => {
      dismissLoadingToast(context);
      toast.error(error.message || "Failed to sync invoices");
    },
  });

  const openQboDialog = () => setNewOpen(true);

  const newInvoiceButton = (
    <NewInvoiceButton
      invoicesEnabled={invoicesEnabled}
      showQuickBooks={showQuickBooks}
      qboCanAct={qboCanAct}
      qboDisabledReason={qboReason}
      onIssueViaQuickBooks={openQboDialog}
    />
  );

  const hasResults = rows.length > 0;
  const showSummary =
    hasAnyInvoices &&
    (invoicesEnabled ||
      summary.outstandingCount > 0 ||
      summary.overdueCount > 0 ||
      summary.paidLast30Cents > 0);
  const hasNativeRowsOnPage = rows.some((row) => row.source === "native");

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div>
          <h1>Invoices</h1>
          <p>
            {invoicesEnabled
              ? "Create, send and track invoices, and record payments as they come in"
              : "Send and track QuickBooks Online invoices for your leads"}
          </p>
          {qboEnabled && connection && (
            <p className="text-xs">
              {describeQboDefaults(depositRule, defaultDueDays)}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showQuickBooks && (
            <Button
              variant="outline"
              onClick={() => syncMutation.mutate()}
              disabled={!qboCanAct || syncMutation.isPending}
              title={qboReason}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync now
            </Button>
          )}
          {newInvoiceButton}
        </div>
      </div>

      {/* Invoicing itself is off and QuickBooks isn't carrying the page —
          reached by URL, or with native invoices on screen after the owner
          switched the feature off. Records stay readable and payments can
          still be recorded; only new invoicing is blocked. */}
      {!invoicesEnabled &&
        hasAnyInvoices &&
        (!qboEnabled || hasNativeRowsOnPage) && (
          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Invoices are turned off</AlertTitle>
            <AlertDescription>
              Existing invoices stay listed and you can still record payments or
              cancel them. Turn Invoices on in Settings → Features to create and
              send new ones.
            </AlertDescription>
            <AlertAction>
              <Button variant="outline" asChild size="xs">
                <Link href="/admin/settings/features">Settings → Features</Link>
              </Button>
            </AlertAction>
          </Alert>
        )}

      {!qboEnabled && hasQboRows && (
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>QuickBooks invoicing is turned off</AlertTitle>
          <AlertDescription>
            Your QuickBooks invoices are kept but no longer sync — turn the
            feature back on in Settings → Features to send new QuickBooks
            invoices or refresh their status.
          </AlertDescription>
          <AlertAction>
            <Button variant="outline" asChild size="xs">
              <Link href="/admin/settings/features">Settings → Features</Link>
            </Button>
          </AlertAction>
        </Alert>
      )}

      {/* The deployment has no Intuit app registered, so there's nothing to
          connect — say so instead of offering a Connect link that dead-ends.
          Only where QuickBooks matters to this page. */}
      {qboEnabled &&
        !platformConfigured &&
        !isActive &&
        (!invoicesEnabled || hasQboRows) && (
          <Alert className="mb-6">
            <Plug className="h-4 w-4" />
            <AlertTitle>QuickBooks isn&apos;t available</AlertTitle>
            <AlertDescription>
              QuickBooks invoicing isn&apos;t set up on this platform, so
              QuickBooks invoices can&apos;t be created or synced right now.
            </AlertDescription>
          </Alert>
        )}

      {/* The connection state is an Alert, not an AdminEmpty — it says "the
          integration isn't ready" with the one link that fixes it, and must
          not be conflated with the DATA-empty states below. */}
      {qboEnabled && platformConfigured && !isActive && (
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
          invoices it has none. */}
      {!hasAnyInvoices ? (
        invoicesEnabled ? (
          <AdminEmpty
            icon={Receipt}
            title="No invoices yet"
            description={
              showQuickBooks
                ? "Build an itemized invoice, email it to your customer, and track payments here. QuickBooks invoices show up here too."
                : "Build an itemized invoice, email it to your customer, and track payments here."
            }
            action={newInvoiceButton}
          />
        ) : showQuickBooks ? (
          <AdminEmpty
            icon={Receipt}
            title="No invoices yet"
            description="Invoices you raise against a quote lead, or create by hand, show up here."
            action={newInvoiceButton}
          />
        ) : (
          <AdminEmpty
            icon={Receipt}
            title="No invoices"
            description="Turn on Invoices in Settings → Features to build and send invoices."
            action={
              <Button variant="outline" asChild>
                <Link href="/admin/settings/features">Settings → Features</Link>
              </Button>
            }
          />
        )
      ) : (
        <>
          {showSummary && (
            <InvoiceSummaryCards
              summary={summary}
              basePath={BASE_PATH}
              activeStatus={
                searchParams.get("search") ||
                (searchParams.get("source") ?? "all") !== "all"
                  ? null
                  : status
              }
            />
          )}

          <StatusTabs status={status} />

          <AdminFilters
            basePath={BASE_PATH}
            searchPlaceholder="Search invoices…"
            // Names every field `listUnified` actually matches — the
            // placeholder has no room for it.
            searchAriaLabel="Search invoices by invoice number, customer name, or customer email"
            filters={filters}
            resultCount={totalCount}
            itemNoun={ITEM_NOUN}
          />

          {qboListCap && (
            <p className="text-muted-foreground mb-4 text-xs">
              Showing the {qboListCap.shown} most recent of {qboListCap.total}{" "}
              QuickBooks invoices — older QuickBooks invoices are not listed.
            </p>
          )}

          {!hasResults ? (
            <AdminEmpty
              icon={Search}
              title={
                filtersNarrow
                  ? "No invoices match your filters"
                  : "No invoices on this page"
              }
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
                          cell can carry all of them (Orders/Inventory shape). */}
                      <TableHead scope="col" className={TH}>
                        Invoice
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Customer
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
                        Total
                      </TableHead>
                      <TableHead
                        scope="col"
                        className={cn("hidden md:table-cell", TH)}
                      >
                        Balance
                      </TableHead>
                      <TableHead scope="col" className={cn("text-right", TH)}>
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row) => {
                      // Computed once per row: each is rendered in BOTH the
                      // desktop column and the md:hidden reflow line.
                      const totalLabel = formatPrice(row.totalCents);
                      const balanceLabel = formatPrice(row.balanceCents);
                      const partiallyPaid = isPartiallyPaid(row);
                      const dueLabel = row.dueDate
                        ? DUE_DATE_FORMAT.format(row.dueDate)
                        : "—";
                      const kindText = row.qbo ? kindLabel(row.qbo.kind) : null;
                      const lead = row.qbo?.lead ?? null;
                      const lastError = row.qbo?.lastError ?? null;

                      return (
                        <TableRow key={`${row.source}:${row.id}`}>
                          <TableCell className={cn("whitespace-normal", TD)}>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                {row.href ? (
                                  <Link
                                    href={row.href}
                                    className="font-medium whitespace-nowrap tabular-nums hover:underline"
                                  >
                                    {row.displayNumber}
                                  </Link>
                                ) : (
                                  <span className="font-medium whitespace-nowrap tabular-nums">
                                    {row.displayNumber === "—" ? (
                                      <span className="text-muted-foreground">
                                        No number yet
                                      </span>
                                    ) : (
                                      <>
                                        <span className="sr-only">
                                          QuickBooks document{" "}
                                        </span>
                                        #{row.displayNumber}
                                      </>
                                    )}
                                  </span>
                                )}
                                {row.source === "quickbooks" && (
                                  <Badge
                                    variant="outline"
                                    className="text-muted-foreground font-normal"
                                  >
                                    QuickBooks
                                  </Badge>
                                )}
                              </div>
                              {kindText && (
                                <p className="text-muted-foreground text-xs">
                                  {kindText}
                                </p>
                              )}

                              {/* Below md every secondary column is hidden —
                                  reflow them here rather than lose them. Each
                                  value carries its own noun because the
                                  headers that supplied that meaning are
                                  `display:none` at this width. */}
                              <div className="mt-1 md:hidden">
                                <p className="text-sm break-words">
                                  {row.customerName}
                                </p>
                                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm">
                                  <RowStatusBadge row={row} />
                                  <span aria-hidden="true">·</span>
                                  <span className="text-foreground font-medium tabular-nums">
                                    {totalLabel}
                                  </span>
                                  {partiallyPaid && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="tabular-nums">
                                        {balanceLabel} due
                                      </span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span className="tabular-nums">
                                    Due {dueLabel}
                                  </span>
                                </div>
                                {/* A failure message is the one thing on this
                                    row that must never be the value that
                                    disappears with the Status column. */}
                                {lastError && (
                                  <p
                                    className={cn(DANGER_TEXT, "mt-1 text-xs")}
                                  >
                                    {lastError}
                                  </p>
                                )}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden whitespace-normal md:table-cell",
                              TD,
                            )}
                          >
                            <div className="min-w-0">
                              <p className="font-medium">{row.customerName}</p>
                              <p className="text-muted-foreground line-clamp-1 text-sm break-all">
                                {row.customerEmail}
                              </p>
                              {/* The link is the NAME, not the whole line — an
                                  anchor wrapping the label too would give
                                  assistive tech a link named "Lead …". */}
                              {lead && (
                                <p className="text-muted-foreground text-xs">
                                  Lead{" "}
                                  <Link
                                    href={`/admin/quotes/${lead.id}`}
                                    className="hover:underline"
                                  >
                                    {lead.contactName}
                                  </Link>
                                </p>
                              )}
                            </div>
                          </TableCell>

                          {/* `whitespace-normal`: TableCell is nowrap by
                              default, and `lastError` is a full sentence from
                              Intuit that has to wrap inside its own width. */}
                          <TableCell
                            className={cn(
                              "hidden whitespace-normal md:table-cell",
                              TD,
                            )}
                          >
                            <RowStatusBadge row={row} />
                            {lastError && (
                              <p
                                className={cn(
                                  DANGER_TEXT,
                                  "mt-1 max-w-[16rem] text-xs",
                                )}
                              >
                                {lastError}
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

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {totalLabel}
                          </TableCell>

                          <TableCell
                            className={cn(
                              "hidden tabular-nums md:table-cell",
                              TD,
                            )}
                          >
                            {balanceLabel}
                            {partiallyPaid && (
                              <p className="text-muted-foreground text-xs">
                                {PARTIALLY_PAID_NOTE}
                              </p>
                            )}
                          </TableCell>

                          <TableCell className={cn("text-right", TD)}>
                            {row.source === "native" ? (
                              <NativeInvoiceRowActions
                                row={row}
                                invoicesEnabled={invoicesEnabled}
                              />
                            ) : row.qbo ? (
                              <QboInvoiceRowActions
                                row={row}
                                label={
                                  row.displayNumber === "—"
                                    ? row.customerName
                                    : `QuickBooks invoice ${row.displayNumber}`
                                }
                                environment={environment}
                                featureEnabled={qboEnabled}
                              />
                            ) : null}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Card>

              <AdminPagination
                page={page}
                totalPages={pageCount}
                totalCount={totalCount}
                // The router owns the page size and returns it.
                pageSize={pageSize}
                basePath={BASE_PATH}
                itemNoun={ITEM_NOUN}
              />
            </>
          )}

          {hasQboRows && (
            <p className="text-muted-foreground mt-4 text-xs">
              Void or edit QuickBooks invoices in QuickBooks — status syncs back
              within about 30 minutes, or use Sync now.
            </p>
          )}
        </>
      )}

      {showQuickBooks && (
        <InvoiceFormDialog
          open={newOpen}
          onOpenChange={handleNewOpenChange}
          defaults={NEW_QBO_INVOICE_DEFAULTS}
          defaultDueDays={defaultDueDays}
          timeZone={timeZone}
        />
      )}
    </div>
  );
}
