import { useEffect } from "react";

import { useNavigationGuard } from "~/providers/navigation-guard-context";

/**
 * Warns before the tab/window is closed while `isDirty`, AND — when mounted
 * under a `NavigationGuardProvider` (currently only the admin shell) —
 * blocks in-app link clicks with a confirmation dialog. Outside the admin
 * shell (e.g. storefront contact forms) `useNavigationGuard` no-ops, so
 * behavior there is unchanged.
 */
export function useDirtyForm(isDirty: boolean, message?: string) {
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useNavigationGuard(isDirty, message);
}
