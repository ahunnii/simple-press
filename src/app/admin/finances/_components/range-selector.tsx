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
  // Label filled in per render with the current year so it matches the
  // server's page label ("Calendar year 2026").
  { value: "year", label: "Calendar year" },
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
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Select range" />
      </SelectTrigger>
      <SelectContent>
        {RANGES.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.value === "year" ? `${r.label} ${year}` : r.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export type { Range };
