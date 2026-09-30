"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "~/components/ui/sidebar";

/**
 * Closes the mobile sidebar when the pathname changes.
 * This prevents the sidebar from staying open after clicking a nav link on mobile.
 */
export function CloseMobileSidebarOnNavigate() {
  const pathname = usePathname();
  const { setOpenMobile } = useSidebar();

  useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  return null;
}
