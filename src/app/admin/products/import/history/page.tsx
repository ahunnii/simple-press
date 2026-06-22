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
          <h1 className="text-3xl font-bold text-foreground">Import History</h1>
          <p className="mt-2 text-muted-foreground">View your import history</p>
        </div>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Product import history</caption>
              <thead className="border-b">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">Date</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">Filename</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">Status</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">Imported</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase">Errors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {imports.map((imp) => (
                  <tr key={imp.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{new Date(imp.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-foreground">{imp.filename}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Badge
                        variant={
                          imp.status === "completed" ? "default" : "outline"
                        }
                      >
                        {imp.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">{imp.importedCount}</td>
                    <td className="px-4 py-3 text-foreground">{imp.errorCount}</td>
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
