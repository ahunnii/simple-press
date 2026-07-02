"use client";

import { IconSearch } from "@tabler/icons-react";

import { Button } from "~/components/ui/button";
import { Kbd } from "~/components/ui/kbd";

function openCommandPalette() {
  window.dispatchEvent(new CustomEvent("admin:open-command-palette"));
}

export function CommandPaletteTrigger() {
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={openCommandPalette}
        className="text-muted-foreground hover:text-foreground w-48 justify-start gap-2 font-normal max-sm:hidden"
      >
        <IconSearch className="size-4" />
        <span className="flex-1 text-left">Search…</span>
        <Kbd>⌘K</Kbd>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={openCommandPalette}
        className="text-muted-foreground hover:text-foreground size-9 sm:hidden"
        aria-label="Search"
      >
        <IconSearch className="size-4" />
        <span className="sr-only">Search</span>
      </Button>
    </>
  );
}
