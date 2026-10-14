"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import type { ShippingAddress } from "~/lib/orders/shipping-address";
import { formatAddressForCopy } from "~/lib/orders/shipping-address";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";

type Props = {
  address: ShippingAddress;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  label?: string;
};

export function CopyAddressButton({
  address,
  variant = "ghost",
  size = "sm",
  className,
  label = "Copy",
}: Props) {
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
    void navigator.clipboard.writeText(formatAddressForCopy(address));
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
      // Rendered inside the fulfillment <form>; without this it submits it.
      type="button"
      variant={variant}
      size={size}
      className={cn("h-7 px-2", className)}
      aria-label="Copy shipping address"
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      <span className="ml-1 text-xs">{label}</span>
    </Button>
  );
}
