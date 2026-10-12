"use client";

import { useRouter, useSearchParams } from "next/navigation";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const RANGES = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "ytd", label: "Year to date" },
  // Labels filled in per render with the year so they match the server's page
  // label ("Calendar year 2026"; "lastYear" is the year before).
  { value: "year", label: "Calendar year" },
  { value: "lastYear", label: "Calendar year" },
] as const;

type Range = (typeof RANGES)[number]["value"];

export function RangeSelector({
  current,
  basePath,
}: {
  current: Range;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const year = new Date().getFullYear();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", value);
    router.push(`${basePath}?${params.toString()}`);
  };

  return (
    <Select value={current} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.value === "year"
              ? `${r.label} ${year}`
              : r.value === "lastYear"
                ? `${r.label} ${year - 1}`
                : r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type { Range };
