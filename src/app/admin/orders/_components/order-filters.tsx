"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

type OrderFiltersProps = {
  orderCount?: number;
};

export function OrderFilters({ orderCount }: OrderFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const status = searchParams.get("status") ?? "all";
  const fulfillment = searchParams.get("fulfillment") ?? "all";
  const paymentStatus = searchParams.get("paymentStatus") ?? "all";

  const handleStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("status");
    } else {
      params.set("status", value);
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleFulfillmentChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("fulfillment");
    } else {
      params.set("fulfillment", value);
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handlePaymentStatusChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("paymentStatus");
    } else {
      params.set("paymentStatus", value);
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (search) {
      params.set("search", search);
    } else {
      params.delete("search");
    }
    router.push(`/admin/orders?${params.toString()}`);
  };

  const handleClear = () => {
    setSearch("");
    router.push("/admin/orders");
  };

  const hasFilters =
    search || status !== "all" || fulfillment !== "all" || paymentStatus !== "all";

  return (
    <div className="bg-card mb-6 rounded-lg border p-4">
      <div className="flex flex-col gap-4 md:flex-row">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search by customer, email, or order number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              aria-label="Search orders"
            />
          </div>
          <Button type="submit">Search</Button>
        </form>

        {/* Status Filter */}
        <div className="w-full md:w-40">
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger aria-label="Filter by status">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Fulfillment Filter */}
        <div className="w-full md:w-44">
          <Select value={fulfillment} onValueChange={handleFulfillmentChange}>
            <SelectTrigger aria-label="Filter by fulfillment">
              <SelectValue placeholder="All fulfillment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fulfillment</SelectItem>
              <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
              <SelectItem value="partially_fulfilled">
                Partially Fulfilled
              </SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status Filter */}
        <div className="w-full md:w-44">
          <Select
            value={paymentStatus}
            onValueChange={handlePaymentStatusChange}
          >
            <SelectTrigger aria-label="Filter by payment status">
              <SelectValue placeholder="All payments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Payments</SelectItem>
              <SelectItem value="pending">Awaiting Payment</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="refunded">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Count + Clear */}
        <div className="flex items-center gap-2">
          {hasFilters && (
            <span className="text-muted-foreground text-xs whitespace-nowrap">
              {typeof orderCount !== "undefined" ? `${orderCount} found` : null}
            </span>
          )}
          {hasFilters && (
            <Button variant="outline" onClick={handleClear}>
              <X className="mr-2 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
