"use client";

import * as React from "react";

import type { InsertDialogKind } from "./insert-items";

/**
 * Lets something other than a dialog's own toolbar button open it — the "/"
 * menu picks "Image" and the toolbar's image dialog opens, the very same
 * instance, inserting at the caret. Provided by `MainMinimalTiptapEditor`;
 * one insert dialog is open at a time.
 */
interface InsertDialogContextValue {
  openKind: InsertDialogKind | null;
  setOpenKind: React.Dispatch<React.SetStateAction<InsertDialogKind | null>>;
}

const InsertDialogContext =
  React.createContext<InsertDialogContextValue | null>(null);

export function InsertDialogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [openKind, setOpenKind] = React.useState<InsertDialogKind | null>(null);
  const value = React.useMemo(() => ({ openKind, setOpenKind }), [openKind]);
  return (
    <InsertDialogContext.Provider value={value}>
      {children}
    </InsertDialogContext.Provider>
  );
}

/**
 * `[open, setOpen]` for one insert dialog: shared through the provider when
 * there is one, local state otherwise.
 */
export function useInsertDialogState(
  kind: InsertDialogKind,
): [boolean, (open: boolean) => void] {
  const context = React.useContext(InsertDialogContext);
  const [localOpen, setLocalOpen] = React.useState(false);
  const setOpenKind = context?.setOpenKind;

  const setOpen = React.useCallback(
    (open: boolean) => {
      if (!setOpenKind) {
        setLocalOpen(open);
        return;
      }
      // Closing only clears our own kind, never a dialog opened since.
      setOpenKind((current) =>
        open ? kind : current === kind ? null : current,
      );
    },
    [kind, setOpenKind],
  );

  return [context ? context.openKind === kind : localOpen, setOpen];
}

/** Opens an insert dialog by kind; `null` outside the provider. */
export function useOpenInsertDialog():
  | ((kind: InsertDialogKind) => void)
  | null {
  const context = React.useContext(InsertDialogContext);
  const setOpenKind = context?.setOpenKind;
  return React.useMemo(
    () => (setOpenKind ? (kind: InsertDialogKind) => setOpenKind(kind) : null),
    [setOpenKind],
  );
}
