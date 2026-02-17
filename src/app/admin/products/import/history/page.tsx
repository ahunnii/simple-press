import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { db } from "~/server/db";
import { Badge } from "~/components/ui/badge";
import { TrailHeader } from "~/app/admin/_components/trail-header";

export default async function ImportHistoryPage() {
  const business = await checkBusiness();
  if (!business) {
    notFound();
  }

  const imports = await db.productImport.findMany({
    where: { businessId: business?.id },
    orderBy: { createdAt: "desc" },
  });

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
          <h1 className="text-3xl font-bold text-gray-900">Import History</h1>
          <p className="mt-2 text-gray-600">View your import history</p>
        </div>
        <div>
          <table className="w-full">
            <thead>
              <tr>
                <th>Date</th>
                <th>Filename</th>
                <th>Status</th>
                <th>Imported</th>
                <th>Errors</th>
              </tr>
            </thead>
            <tbody>
              {imports.map((imp) => (
                <tr key={imp.id}>
                  <td>{new Date(imp.createdAt).toLocaleDateString()}</td>
                  <td>{imp.filename}</td>
                  <td>
                    <Badge
                      variant={
                        imp.status === "completed" ? "default" : "outline"
                      }
                    >
                      {imp.status}
                    </Badge>
                  </td>
                  <td>{imp.importedCount}</td>
                  <td>{imp.errorCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
