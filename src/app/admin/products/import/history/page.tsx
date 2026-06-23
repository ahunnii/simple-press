import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { rethrowTrpcForErrorBoundary } from "~/lib/trpc/rethrow-trpc-error";
import { api } from "~/trpc/server";
import { Badge } from "~/components/ui/badge";
import { Card } from "~/components/ui/card";
import { TrailHeader } from "~/app/admin/_components/trail-header";

export default async function ImportHistoryPage() {
  const business = await checkBusiness();
  if (!business) {
    notFound();
  }

  const imports = await api.product
    .getProductImportHistory()
    .catch(rethrowTrpcForErrorBoundary);
  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "Import Products", href: "/admin/products/import" },
          { label: "Import History" },
        ]}
      />
      <div className="admin-container">
        <div className="mb-8">
          <h1 className="text-foreground text-3xl font-bold">Import History</h1>
          <p className="text-muted-foreground mt-2">View your import history</p>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Product import history</caption>
              <thead className="border-b">
                <tr>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    Date
                  </th>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    Filename
                  </th>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    Status
                  </th>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    Imported
                  </th>
                  <th
                    scope="col"
                    className="text-muted-foreground px-4 py-3 text-left text-xs font-medium tracking-wider uppercase"
                  >
                    Errors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/50">
                    <td className="text-foreground px-4 py-3 whitespace-nowrap">
                      {new Date(imp.createdAt).toLocaleDateString()}
                    </td>
                    <td className="text-foreground px-4 py-3">
                      {imp.filename}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={
                          imp.status === "completed" ? "default" : "outline"
                        }
                      >
                        {imp.status}
                      </Badge>
                    </td>
                    <td className="text-foreground px-4 py-3">
                      {imp.importedCount}
                    </td>
                    <td className="text-foreground px-4 py-3">
                      {imp.errorCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </>
  );
}

export const metadata = {
  title: "Product Import History",
};
