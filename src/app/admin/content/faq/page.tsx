import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";

import { TrailHeader } from "../../_components/trail-header";
import { FaqManager } from "./_components/faq-manager";

export default async function FaqAdminPage() {
  const items = await api.faq.adminList();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Content", href: "/admin/content" },
          { label: "FAQ" },
        ]}
      />
      <HubSubNav hub="content" />
      <FaqManager initialItems={items} />
    </>
  );
}

export const metadata = {
  title: "FAQ",
};
