import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  Building2,
  Globe,
  LayoutDashboard,
  MessageSquare,
  Users,
  Wrench,
} from "lucide-react";

import { isPlatformAdmin } from "~/lib/auth/is-platform-admin";
import { env } from "~/env";
import { getSession } from "~/server/better-auth/server";
import { HydrateClient } from "~/trpc/server";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "~/components/ui/sidebar";
import { SimplePressWordmark } from "~/components/shared/simplepress-wordmark";
import { NavUser } from "~/app/admin/_components/nav-user";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Businesses", url: "/businesses", icon: Building2 },
  { title: "Domains", url: "/domains", icon: Globe },
  { title: "Notes", url: "/notes", icon: MessageSquare },
  { title: "Maintenance", url: "/maintenance", icon: Wrench },
];

export default async function PlatformHubLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const hostname = (headersList.get("host") ?? "").split(":")[0]!;
  const isPlatformSubdomain =
    process.env.NODE_ENV === "development"
      ? hostname === "platform.localhost"
      : hostname === `platform.${env.NEXT_PUBLIC_PLATFORM_DOMAIN}`;

  if (!isPlatformSubdomain) {
    notFound();
  }

  const session = await getSession();

  if (!session) {
    redirect("/auth/sign-in?redirectTo=/dashboard");
  }

  if (!(await isPlatformAdmin(session.user.id))) {
    notFound();
  }

  return (
    <HydrateClient>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <Sidebar collapsible="offcanvas" variant="inset">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="h-20 w-full data-[slot=sidebar-menu-button]:p-1.5!"
                >
                  <SimplePressWordmark
                    href="/dashboard"
                    subline="Platform Admin"
                    sublineClassName="text-gray-500"
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>
          <SidebarContent>
            <SidebarMenu className="px-2 py-2">
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="size-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter>
            <NavUser />
          </SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <div className="min-h-screen bg-gray-50">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </HydrateClient>
  );
}
