import { api } from "~/trpc/server";

import { PlatformTrailHeader } from "../_components/platform-trail-header";
import { PolicyUpdatesPanel } from "./_components/policy-updates-panel";

export default async function PlatformPoliciesPage() {
  const updates = await api.platform.listPolicyUpdates();

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Policies" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Policy updates</h1>
            <p>
              Material changes to the platform policies, and the notice email
              that tells store owners about them
            </p>
          </div>
        </div>

        <PolicyUpdatesPanel updates={updates} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Policy updates",
};
