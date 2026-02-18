"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@daveyplate/better-auth-ui";
import { LayoutDashboardIcon, MessageSquare, X } from "lucide-react";
import { motion } from "motion/react";

import type { DefaultHeaderTemplateProps } from "../types";
import { authClient } from "~/server/better-auth/client";
import { Button } from "~/components/ui/button";
import { HamburgerIcon } from "~/components/layout/hamburger-icon";

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
];

export function PollenHeader({ business }: DefaultHeaderTemplateProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user;

  const links =
    (business?.siteContent?.navigationItems as {
      label: string;
      href: string;
    }[]) ?? NAV_LINKS;

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  const authActions = (
    <>
      <Button variant="ghost" size="sm" asChild>
        <Link href="/auth/sign-in">Log in</Link>
      </Button>
      <Button size="sm" asChild>
        <Link href="/auth/sign-up">Sign Up</Link>
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
        ...(user.role === "ADMIN" || user.role === "OWNER"
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
    <>
      <header className="bg-background border-border fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-28 items-center justify-between">
            <Link
              href="/"
              className="flex items-center gap-2"
              onClick={closeMenu}
            >
              {business?.siteContent?.logoUrl ? (
                <Image
                  src={business.siteContent.logoUrl}
                  alt={business.name}
                  width={100}
                  height={100}
                />
              ) : (
                <span className="text-xl font-bold">{business.name}</span>
              )}
            </Link>

            <nav className="hidden items-center justify-center gap-12 md:flex">
              {links.map(({ href, label }) => {
                const isActive =
                  href === "/" ? pathname === "/" : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group relative px-1 text-sm font-semibold tracking-wide uppercase transition-colors ${
                      isActive
                        ? "text-[#5e7747]"
                        : "text-[#4c566a] hover:text-[#5e7747]"
                    }`}
                  >
                    {label}
                    {isActive ? (
                      <span
                        className="absolute right-[-2px] -bottom-1 left-[-2px] h-0.5 bg-[#5e7747]"
                        aria-hidden="true"
                      />
                    ) : (
                      <span
                        className="absolute right-[-2px] -bottom-1 left-[-2px] h-0.5 scale-x-0 bg-[#5e7747] transition-transform duration-300 group-hover:scale-x-100"
                        aria-hidden="true"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3">
              <div className="hidden items-center gap-3 md:flex">
                <Button
                  size="sm"
                  asChild
                  className="border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700 dark:border-green-400/30 dark:bg-green-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 dark:hover:text-rose-300"
                  variant="outline"
                >
                  <Link href="/contact">
                    <MessageSquare className="mr-1.5 h-4 w-4" />
                    Get in Touch
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
                type="button"
                aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
                className="flex touch-manipulation items-center justify-center p-2 md:hidden"
                onClick={() => setMobileMenuOpen((o) => !o)}
              >
                <HamburgerIcon open={mobileMenuOpen} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay - covers navbar (z-[60] > header z-50) */}
      <motion.div
        className="fixed inset-0 z-60 flex flex-col bg-[#1A1E1A] md:hidden"
        initial={false}
        animate={{
          opacity: mobileMenuOpen ? 1 : 0,
          pointerEvents: mobileMenuOpen ? "auto" : "none",
        }}
        transition={{ duration: 0.2 }}
      >
        {/* Close button - top right */}
        <button
          type="button"
          onClick={closeMenu}
          aria-label="Close menu"
          className="text-primary-foreground absolute top-4 right-4 z-10 rounded-full p-2 transition-colors hover:bg-white/10"
        >
          <X className="h-6 w-6" />
        </button>

        {/* Logo + nav links centered */}
        <div className="flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-8">
          {/* Logo above links */}
          <Link
            href="/"
            onClick={closeMenu}
            className="mb-12 flex shrink-0 items-center justify-center"
          >
            <Image
              src="/dpc-logo.png"
              alt="Detroit Pollinator Company"
              width={140}
              height={140}
              className="h-28 w-28 object-contain invert md:h-32 md:w-32"
            />
          </Link>

          <nav className="flex flex-col items-center gap-8">
            {links.map(({ href, label }, i) => {
              const isActive =
                href === "/" ? pathname === "/" : pathname.startsWith(href);
              return (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 20 }}
                  animate={
                    mobileMenuOpen
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: 20 }
                  }
                  transition={{
                    delay: mobileMenuOpen ? 0.05 + i * 0.05 : 0,
                    duration: 0.25,
                  }}
                >
                  <Link
                    href={href}
                    onClick={closeMenu}
                    className={`block rounded-lg px-4 py-2 text-2xl font-light tracking-wide uppercase transition-colors active:bg-white/10 ${
                      isActive
                        ? "text-[#5e7747]"
                        : "text-white hover:text-[#5e7747] active:text-[#5e7747]"
                    }`}
                  >
                    {label}
                  </Link>
                </motion.div>
              );
            })}
          </nav>

          {/* Mobile Auth/Actions - below links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={
              mobileMenuOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }
            }
            transition={{
              delay: mobileMenuOpen ? 0.05 + links.length * 0.05 : 0,
              duration: 0.25,
            }}
            className="mt-12 flex flex-col items-center gap-4"
          >
            <Button
              size="sm"
              asChild
              className="border-green-500/30 bg-green-500/10 text-green-600 hover:bg-green-500/20 hover:text-green-700"
              variant="outline"
            >
              <Link href="/get-quote" onClick={closeMenu}>
                <MessageSquare className="mr-1.5 h-4 w-4" />
                Get in Touch
              </Link>
            </Button>

            {isPending ? (
              <div className="bg-muted h-9 w-24 animate-pulse rounded" />
            ) : user ? (
              <div className="flex items-center gap-2">
                <UserButton />
              </div>
            ) : (
              <div className="flex items-center gap-2">{authActions}</div>
            )}
          </motion.div>
        </div>
      </motion.div>
    </>
  );
}
