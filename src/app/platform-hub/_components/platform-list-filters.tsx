"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";

type Props = {
  total?: number;
  placeholder?: string;
};

export function PlatformListFilters({ total, placeholder = "Search..." }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const activeSearch = searchParams.get("search");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleClear = () => {
    setSearch("");
    router.push(pathname);
  };

  return (
    <div className="mb-6 rounded-lg border bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder={placeholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {activeSearch && (
          <>
            {typeof total !== "undefined" && (
              <span className="text-muted-foreground flex items-center text-xs">
                {total} found
              </span>
            )}
            <Button variant="outline" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
