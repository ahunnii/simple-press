import { api } from "~/trpc/server";
import { HubSubNav } from "~/app/admin/_components/hub-sub-nav";
import { requireAdminAccess } from "~/lib/require-admin-access";
import { TrailHeader } from "../../_components/trail-header";
import { TeamMembers } from "./_components/team-members";

export default async function TeamSettingsPage() {
  const { session, membershipRole } = await requireAdminAccess();
  // `membershipRole` is null for PLATFORM_ADMIN — they have no
  // BusinessMembership row, so `requireAdminAccess` bypasses the membership
  // check entirely for them (see require-admin-access.ts). Treat that null
  // as full access rather than "not an owner" — mirrors the
  // `roleForFiltering` pattern in app-sidebar.tsx / admin-command-palette.tsx.
  const isPlatformAdmin = session.user.platformRole === "PLATFORM_ADMIN";
  const canManage = isPlatformAdmin || membershipRole === "OWNER";

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
        currentUserId={session.user.id}
        currentUserRole={membershipRole}
        canManage={canManage}
        isPlatformAdmin={isPlatformAdmin}
      />
    </>
  );
}

export const metadata = {
  title: "Team Settings",
};
