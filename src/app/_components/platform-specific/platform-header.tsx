import Link from "next/link";
import { UserButton } from "@daveyplate/better-auth-ui";
import { IconLayoutDashboard, IconTerminal } from "@tabler/icons-react";
import { Store } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";

export function PlatformHeader() {
  const { data: session, isPending } = authClient.useSession();

  const authActions = (
    <>
      <Button asChild>
        <Link href="/platform/signup">Get Started</Link>
      </Button>
    </>
  );

  const userMenu = session?.user && (
    <UserButton
      size="icon"
      classNames={{
        trigger: {
          base: "border-primary border",
          avatar: {
            base: "size-10",
          },
        },
      }}
      additionalLinks={[
        ...(session?.user?.role === "ADMIN" || session?.user?.role === "OWNER"
          ? [
              {
                icon: <IconLayoutDashboard className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
      ]}
    />
  );

  return (
    <header className="sticky top-0 z-50 border-b bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="flex flex-row items-center gap-1 font-mono text-2xl font-bold">
              <IconTerminal className="size-8" />
              simple_press
            </span>
          </Link>

          {/* Navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Features
            </Link>
            <Link
              href="#templates"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Templates
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-gray-900"
            >
              Pricing
            </Link>
          </nav>

          {/* Auth Buttons */}
          <div className="flex items-center gap-3">
            {isPending ? (
              <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
            ) : session?.user ? (
              userMenu
            ) : (
              authActions
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
