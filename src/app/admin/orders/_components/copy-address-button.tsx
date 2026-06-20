"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";

type ShippingAddress = {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  zip: string;
  country: string;
  phone?: string | null;
};

type Props = {
  address: ShippingAddress;
};

export function CopyAddressButton({ address }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = () => {
    const cityLine = [address.city, address.province, address.zip]
      .filter(Boolean)
      .join(" ")
      .replace(/\s{2,}/g, " ")
      .trim();

    // Build city line with proper comma separation: "City, Province ZIP"
    const cityProvinceZip = address.province
      ? `${address.city}, ${address.province} ${address.zip}`.trim()
      : `${address.city} ${address.zip}`.trim();

    const lines = [
      `${address.firstName} ${address.lastName}`.trim(),
      address.company ?? null,
      address.address1,
      address.address2 ?? null,
      cityProvinceZip || cityLine,
      address.country,
    ].filter((line): line is string => Boolean(line));

    void navigator.clipboard.writeText(lines.join("\n"));
    toast.success("Address copied");

    setCopied(true);
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2"
      aria-label="Copy shipping address"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="ml-1 text-xs">Copy</span>
    </Button>
  );
}
