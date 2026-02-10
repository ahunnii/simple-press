import { notFound, redirect } from "next/navigation";

import { checkBusiness } from "~/lib/check-business";
import { getSession } from "~/server/better-auth/server";
import { SidebarInset, SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "~/app/admin/_components/app-sidebar";

type Props = {
  children: React.ReactNode;
};
export default async function AdminLayout({ children }: Props) {
  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "OWNER") {
    redirect("/not-permitted");
  }

  const business = await checkBusiness();

  if (!business) {
    notFound();
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
