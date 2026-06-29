import { headers } from "next/headers";

import { auth } from "~/server/better-auth";
import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";
import { TrailHeader } from "../../_components/trail-header";
import { TeamMembers } from "./_components/team-members";

export default async function TeamSettingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserRole =
    (session?.session?.membershipRole as "OWNER" | "MANAGER" | null) ?? null;
  const currentUserId = session?.user?.id ?? null;

  const data = await api.team.list();

  return (
    <>
      <TrailHeader
        breadcrumbs={[
          { label: "Settings", href: "/admin/settings" },
          { label: "Team" },
        ]}
      />
      <HubSubNav hub="settings" />

      <TeamMembers
        memberships={data.memberships}
        pendingInvites={data.pendingInvites}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
      />
    </>
  );
}

export const metadata = {
  title: "Team Settings",
};
