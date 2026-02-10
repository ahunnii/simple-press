"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { UserButton } from "@daveyplate/better-auth-ui";
import { Heart, LayoutDashboardIcon, Menu, X } from "lucide-react";

import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/join">Join Us</Link>
      </Button>
    </>
  );

  const userMenu = user && (
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
        ...(user.role === "ADMIN"
          ? [
              {
                icon: <LayoutDashboardIcon className="h-4 w-4" />,
                label: "Admin",
                href: "/admin",
              },
            ]
          : []),
      ]}
    />
  );

  return (
    <header className="bg-background/80 border-border s fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-28 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/logo-transparent.png"
              alt="Crossroads Community Association"
              width={100}
              height={100}
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/about"
              className="group text-muted-foreground hover:text-foreground relative text-sm transition-colors"
            >
              <span className="relative z-10">About</span>
              <span
                className="bg-foreground absolute -bottom-0.5 left-0 h-0.5 w-full scale-x-0 rounded transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/events"
              className="group text-muted-foreground hover:text-foreground relative text-sm transition-colors"
            >
              <span className="relative z-10">Events</span>
              <span
                className="bg-foreground absolute -bottom-0.5 left-0 h-0.5 w-full scale-x-0 rounded transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/community"
              className="group text-muted-foreground hover:text-foreground relative text-sm transition-colors"
            >
              <span className="relative z-10">Community</span>
              <span
                className="bg-foreground absolute -bottom-0.5 left-0 h-0.5 w-full scale-x-0 rounded transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/gallery"
              className="group text-muted-foreground hover:text-foreground relative text-sm transition-colors"
            >
              <span className="relative z-10">Gallery</span>
              <span
                className="bg-foreground absolute -bottom-0.5 left-0 h-0.5 w-full scale-x-0 rounded transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </Link>
            <Link
              href="/contact"
              className="group text-muted-foreground hover:text-foreground relative text-sm transition-colors"
            >
              <span className="relative z-10">Contact</span>
              <span
                className="bg-foreground absolute -bottom-0.5 left-0 h-0.5 w-full scale-x-0 rounded transition-transform duration-300 group-hover:scale-x-100"
                aria-hidden="true"
              />
            </Link>
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <Button
              size="sm"
              asChild
              className="border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
              variant="outline"
            >
              <Link href="/donate">
                <Heart className="mr-1.5 h-4 w-4" />
                Donate
              </Link>
            </Button>

            {isPending ? (
              <div className="bg-muted h-8 w-8 animate-pulse rounded-full" />
            ) : user ? (
              userMenu
            ) : (
              authActions
            )}
          </div>

          <button
            className="p-2 md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="border-border border-t py-4 md:hidden">
            <nav className="flex flex-col gap-0.5">
              <Link
                href="/about"
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary-foreground/40 -mx-2 flex items-center rounded-lg border-l-4 border-transparent px-3 py-2.5 text-base font-medium transition-colors"
              >
                About
              </Link>
              <Link
                href="/events"
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary-foreground/40 -mx-2 flex items-center rounded-lg border-l-4 border-transparent px-3 py-2.5 text-base font-medium transition-colors"
              >
                Events
              </Link>
              <Link
                href="/community"
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary-foreground/40 -mx-2 flex items-center rounded-lg border-l-4 border-transparent px-3 py-2.5 text-base font-medium transition-colors"
              >
                Community
              </Link>
              <Link
                href="/gallery"
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary-foreground/40 -mx-2 flex items-center rounded-lg border-l-4 border-transparent px-3 py-2.5 text-base font-medium transition-colors"
              >
                Gallery
              </Link>
              <Link
                href="/contact"
                className="text-muted-foreground hover:bg-primary hover:text-primary-foreground hover:border-primary-foreground/40 -mx-2 flex items-center rounded-lg border-l-4 border-transparent px-3 py-2.5 text-base font-medium transition-colors"
              >
                Contact
              </Link>
              <div className="flex flex-col gap-2 pt-4">
                <Button
                  size="sm"
                  asChild
                  className="border-rose-500/30 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 hover:text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                  variant="outline"
                >
                  <Link href="/donate">
                    <Heart className="mr-1.5 h-4 w-4" />
                    Donate
                  </Link>
                </Button>
                {isPending ? (
                  <div className="bg-muted h-9 w-16 animate-pulse rounded" />
                ) : user ? (
                  <UserButton />
                ) : (
                  authActions
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
