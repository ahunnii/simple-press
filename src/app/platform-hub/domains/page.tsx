import { api } from "~/trpc/server";

import { PlatformTrailHeader } from "../_components/platform-trail-header";
import { DomainQueueTable } from "./_components/domain-queue-table";

export default async function PlatformDomainsPage() {
  const entries = await api.platform.listDomainQueue();

  return (
    <>
      <PlatformTrailHeader breadcrumbs={[{ label: "Domains" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Custom Domain Requests</h1>
            <p>
              Pending domains that need to be added to Coolify. After adding a
              domain, click <strong>Mark Active</strong> to update the
              business&apos;s domain status.
            </p>
          </div>
        </div>

        <DomainQueueTable entries={entries} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Platform Domains",
};
