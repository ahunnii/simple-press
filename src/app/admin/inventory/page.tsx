import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { PoolsTable } from "./_components/pools-table";

export default async function InventoryPage() {
  const pools = await api.baseInventoryUnit.list();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Inventory" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Base Units</h1>
            <p>
              Manage shared inventory pools. Products can draw from a base unit
              — for example, a &ldquo;4-pack Roll&rdquo; pool powers your
              24-pack (6 rolls) and 48-pack (12 rolls) listings.
            </p>
          </div>
        </div>

        <PoolsTable pools={pools} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Inventory",
};
