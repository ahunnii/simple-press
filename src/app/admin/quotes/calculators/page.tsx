import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Calculator, Plus } from "lucide-react";

import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
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
import {
  TABLE_CARD,
  TABLE_CELL,
  TABLE_HEAD,
} from "../../_components/admin-table-style";
import { TrailHeader } from "../../_components/trail-header";

const BASE_PATH = "/admin/quotes/calculators";

/**
 * No filters, no sort, no pagination — a deliberate deviation from
 * docs/admin-table-migration.md §2's 25-row pipeline.
 *
 * A calculator is a price model, not a record: an owner authors one, maybe five
 * if they quote several trades, and then edits them for years. There is nothing
 * to page through and nothing a search box would narrow. Adding the pipeline
 * here would put three empty controls above four rows. `getAll` already returns
 * the set newest-updated first, which is the order this page wants.
 *
 * If a business ever passes ~25 calculators, adopt §3a wholesale rather than
 * bolting a search box onto this.
 */
export default async function QuoteCalculatorsPage() {
  const calculators = await api.quoteCalculator
    .getAll()
    .catch(rethrowTrpcForErrorBoundary);

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Quotes", href: "/admin/quotes" },
          { label: "Calculators" },
        ]}
      />

      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Calculators</h1>
            <p>
              Build the multi-step forms visitors fill out to request an
              estimate. Add one to a page from the page editor.
            </p>
          </div>
          <Button asChild>
            <Link href={`${BASE_PATH}/new`}>
              <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
              New calculator
            </Link>
          </Button>
        </div>

        {calculators.length === 0 ? (
          <AdminEmpty
            icon={Calculator}
            title="No calculators yet"
            description="Create one to start collecting quote requests."
            action={
              <Button asChild>
                <Link href={`${BASE_PATH}/new`}>New calculator</Link>
              </Button>
            }
          />
        ) : (
          <Card className={TABLE_CARD}>
            <Table>
              <TableCaption className="sr-only">Quote calculators</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col" className={TABLE_HEAD}>
                    Calculator
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Status
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Leads
                  </TableHead>
                  <TableHead
                    scope="col"
                    className={`hidden md:table-cell ${TABLE_HEAD}`}
                  >
                    Updated
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {calculators.map((calculator) => {
                  const leads = calculator._count.submissions;

                  return (
                    <TableRow key={calculator.id}>
                      <TableCell className={TABLE_CELL}>
                        {/* The link wraps the NAME only — wrapping the whole
                            cell would give assistive tech a link named after
                            the name and the mobile summary run together. */}
                        <Link
                          href={`${BASE_PATH}/${calculator.id}`}
                          className="font-medium hover:underline"
                        >
                          {calculator.name}
                        </Link>

                        <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm md:hidden">
                          <span>
                            {calculator.published ? "Published" : "Draft"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">
                            {leads} {leads === 1 ? "lead" : "leads"}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            Updated{" "}
                            {formatDistanceToNow(
                              new Date(calculator.updatedAt),
                              { addSuffix: true },
                            )}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell
                        className={`hidden md:table-cell ${TABLE_CELL}`}
                      >
                        <Badge
                          variant={
                            calculator.published ? "success" : "secondary"
                          }
                        >
                          {calculator.published ? "Published" : "Draft"}
                        </Badge>
                      </TableCell>

                      <TableCell
                        className={`hidden tabular-nums md:table-cell ${TABLE_CELL}`}
                      >
                        {leads}
                      </TableCell>

                      <TableCell
                        className={`text-muted-foreground hidden md:table-cell ${TABLE_CELL}`}
                      >
                        {formatDistanceToNow(new Date(calculator.updatedAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </>
  );
}

export const metadata = {
  title: "Quote Calculators",
};
