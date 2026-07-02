import { api } from "~/trpc/server";

import { TrailHeader } from "../_components/trail-header";
import { BroadcastComposer } from "./_components/broadcast-composer";

export default async function MarketingPage() {
  const { count } = await api.marketing.listRecipients();

  return (
    <>
      <TrailHeader breadcrumbs={[{ label: "Email Marketing" }]} />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Email Marketing</h1>
            <p>Send a one-off announcement or newsletter to your opted-in customers.</p>
          </div>
        </div>

        <BroadcastComposer recipientCount={count} />
      </div>
    </>
  );
}

export const metadata = {
  title: "Email Marketing",
};
