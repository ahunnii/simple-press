import { redirect } from "next/navigation";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";

import { getSession } from "~/server/better-auth/server";

type Props = {
  children: React.ReactNode;
};
export default async function AdminLayout({ children }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/not-permitted");
  }

  return (
    <>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <>{children}</>
        </SidebarInset>
      </SidebarProvider>
    </>
  );
}
