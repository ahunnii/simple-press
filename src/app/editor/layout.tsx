import { requireAdminAccess } from "~/lib/require-admin-access";

/**
 * Full-screen shell for the visual site editor.
 *
 * Access is restricted to OWNER / MANAGER (PLATFORM_ADMIN bypasses inside the
 * helper). STAFF members are disallowed here: `requireAdminAccess` redirects any
 * role not in `allowedRoles` to `/not-permitted`, which is a sane destination,
 * so no additional STAFF handling is needed.
 *
 * The shell is intentionally minimal — no admin sidebar, no TrailHeader. All
 * real chrome lives inside the client `<VisualEditor />`.
 */
export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdminAccess({ allowedRoles: ["OWNER", "MANAGER"] });

  return <div className="bg-background h-dvh overflow-hidden">{children}</div>;
}
