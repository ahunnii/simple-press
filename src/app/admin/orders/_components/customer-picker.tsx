"use client";

import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";

import { formatPrice } from "~/lib/prices";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export type PickedCustomer = {
  name: string;
  email: string;
};

/**
 * Optional accelerator for the manual order form's customer fields.
 *
 * Deliberately NOT a required selection: manual orders exist precisely to
 * capture phone and in-person sales from people who may have never bought
 * before, so the name and email inputs stay free text and this only fills them
 * in. Picking an existing customer also sidesteps `createManual`'s name
 * splitting, which cuts on the first space and mangles compound first names.
 */
export function CustomerPicker({
  onSelect,
  disabled,
}: {
  onSelect: (customer: PickedCustomer) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // 250ms, matching the admin command palette.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  const enabled = open && debouncedQuery.length >= 2;
  const { data, isFetching } = api.customer.list.useQuery(
    { search: debouncedQuery },
    { enabled, staleTime: 30_000 },
  );

  const customers = data?.customers ?? [];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) setQuery("");
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          className="gap-2"
        >
          <Search className="h-3.5 w-3.5" />
          Find existing customer
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-[360px] p-0" align="start">
        {/* Results are already filtered server-side; cmdk's own fuzzy pass on
            top of them would hide valid matches. */}
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search by name or email…"
          />
          <CommandList>
            <CommandEmpty>
              {debouncedQuery.length < 2
                ? "Type at least 2 characters."
                : isFetching
                  ? "Searching…"
                  : "No customers found."}
            </CommandEmpty>

            {customers.length > 0 && (
              <CommandGroup>
                {customers.map((customer) => {
                  const name =
                    [customer.firstName, customer.lastName]
                      .filter(Boolean)
                      .join(" ")
                      .trim() || customer.email;

                  return (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      className="gap-3"
                      onSelect={() => {
                        onSelect({ name, email: customer.email });
                        setOpen(false);
                      }}
                    >
                      <div className="bg-muted flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
                        <UserRound
                          aria-hidden="true"
                          className="text-muted-foreground h-4 w-4"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{name}</p>
                        <p className="text-muted-foreground truncate text-xs">
                          {customer.email}
                        </p>
                      </div>
                      <span className="text-muted-foreground shrink-0 text-xs">
                        {customer.orderCount}{" "}
                        {customer.orderCount === 1 ? "order" : "orders"}
                        {customer.totalSpent > 0
                          ? ` · ${formatPrice(customer.totalSpent)}`
                          : ""}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
