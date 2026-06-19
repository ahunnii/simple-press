import { headers } from "next/headers";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { IconTerminal } from "@tabler/icons-react";
import { Building2, Globe, LayoutDashboard, Users, Wrench } from "lucide-react";

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
import { NavUser } from "~/app/admin/_components/nav-user";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Users", url: "/users", icon: Users },
  { title: "Businesses", url: "/businesses", icon: Building2 },
  { title: "Domains", url: "/domains", icon: Globe },
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

  if (session.user.platformRole !== "PLATFORM_ADMIN") {
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
                  <Link href="/dashboard" className="flex flex-col items-start">
                    <span className="flex flex-row items-center gap-1 font-mono text-2xl font-bold">
                      <IconTerminal className="size-8" />
                      simple_press
                    </span>
                    <span className="text-sm text-gray-500">
                      Platform Admin
                    </span>
                  </Link>
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
