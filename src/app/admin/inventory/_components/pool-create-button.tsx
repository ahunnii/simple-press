"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { Button } from "~/components/ui/button";

import { PoolDialog } from "./pool-dialog";

type Props = {
  /** "New Base Unit" in the page header, "Create Base Unit" in the empty state. */
  label: string;
};

/**
 * The create action plus the dialog it opens, as one unit.
 *
 * Collections can put its create button straight into the server page because
 * it's a `<Link>` to /new. Inventory creates in a modal, so the trigger and the
 * `open` state have to live in the same client component — this is the smallest
 * thing that can be dropped into `admin-header` without dragging the whole
 * table's state up with it.
 *
 * Each instance owns its own dialog. Both are mounted at once in the empty state
 * — the header instance is unconditional and the empty-state one renders whenever
 * there are no pools. That's safe only because `DialogContent` wraps a portal with
 * no `forceMount`, so a closed `PoolDialog` renders nothing at all: no duplicate
 * DOM, no competing focus trap, no `aria-hidden` fight. Only one can be open,
 * since each owns its own `open` state. Don't add `forceMount` without collapsing
 * these to a single shared dialog first.
 */
export function PoolCreateButton({ label }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* `shrink-0`: `admin-header` is a gapless flex row and Inventory's
          description is three lines long, so an unprotected button gets
          squeezed by the text beside it. */}
      <Button className="shrink-0" onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        {label}
      </Button>
      <PoolDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
