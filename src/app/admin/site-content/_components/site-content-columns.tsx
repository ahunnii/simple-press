/* eslint-disable @typescript-eslint/no-base-to-string */
/* eslint-disable @typescript-eslint/no-unsafe-call */
"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { SiteContent } from "generated/prisma";
import { ArrowUpDown } from "lucide-react";
import * as React from "react";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { SiteContentRowActions } from "./site-content-row-actions";

const TRUNCATE_LENGTH = 80;

export const siteContentColumns: ColumnDef<SiteContent>[] = [
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
    accessorKey: "key",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Key
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="font-mono text-sm">{row.getValue("key")}</div>
    ),
  },
  {
    accessorKey: "value",
    header: "Value",
    cell: ({ row }) => {
      const rawValue = row.getValue("value");
      const value =
        typeof rawValue === "string" ? rawValue : String(rawValue ?? "");
      const truncated =
        value.length > TRUNCATE_LENGTH
          ? `${value.slice(0, TRUNCATE_LENGTH)}…`
          : value;
      return (
        <div className="text-muted-foreground max-w-[320px] truncate text-sm">
          {truncated ?? "—"}
        </div>
      );
    },
  },
  {
    accessorKey: "updatedAt",
    header: ({ column }) => (
      <Button
        variant="ghost"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        Updated
        <ArrowUpDown />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("updatedAt");
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
    cell: ({ row }) => <SiteContentRowActions siteContent={row.original} />,
  },
];
