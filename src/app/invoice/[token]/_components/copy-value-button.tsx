"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";

type Props = {
  value: string;
  /** Used only for the toast/aria label, e.g. "Account number copied". */
  label: string;
};

/**
 * A small copy-to-clipboard button for one payment-instruction line (account
 * number, routing number, handle, the invoice reference). Same shape as
 * `admin/orders/_components/copy-address-button.tsx`, generalized to a single
 * string value instead of a formatted address block.
 */
export function CopyValueButton({ value, label }: Props) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);

    setCopied(true);
    if (timeoutRef.current !== null) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setCopied(false);
      timeoutRef.current = null;
    }, 2000);
  };

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="shrink-0 print:hidden"
      aria-label={`Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <Copy className="h-3.5 w-3.5" aria-hidden="true" />
      )}
    </Button>
  );
}
