"use client";

import type { Page } from "generated/prisma";
import * as React from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

import { PageRowActions } from "./page-row-actions";

type PageWithClub = Page & {
  club: { id: string; name: string };
};

export const pageColumns: ColumnDef<PageWithClub>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "title",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Title
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="max-w-[200px] truncate">{row.getValue("title")}</div>
    ),
  },
  {
    accessorKey: "slug",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Slug
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="text-muted-foreground max-w-[140px] truncate font-mono text-sm">
        {row.getValue("slug")}
      </div>
    ),
  },
  {
    id: "club",
    accessorFn: (row) => row.club?.name ?? "",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Club
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="lowercase">{row.original.club?.name ?? "—"}</div>
    ),
  },
  {
    accessorKey: "createdAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Created
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("createdAt");
      return (
        <div className="text-muted-foreground text-sm">
          {value ? new Date(value as Date).toLocaleDateString() : "—"}
        </div>
      );
    },
  },

  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <PageRowActions page={row.original} />,
  },
];
