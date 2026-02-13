import { notFound } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { db } from "~/server/db";
import { Badge } from "~/components/ui/badge";

// app/admin/products/import/history/page.tsx
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
    <div>
      <h1>Import History</h1>

      <table>
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
                  variant={imp.status === "completed" ? "default" : "outline"}
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
  );
}
