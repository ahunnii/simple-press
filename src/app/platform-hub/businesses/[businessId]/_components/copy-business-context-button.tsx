"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";

type Props = {
  businessId: string;
};

export function CopyBusinessContextButton({ businessId }: Props) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utils = api.useUtils();

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleCopy = async () => {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      toast.error("Copying isn't supported in this browser.");
      return;
    }

    setLoading(true);
    try {
      const { markdown } = await utils.platform.getBusinessBrief.fetch({
        businessId,
      });
      await navigator.clipboard.writeText(markdown);
      toast.success("Copied for LLM");
      setCopied(true);
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, 2000);
    } catch {
      toast.error("Failed to copy business context.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleCopy()}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : copied ? (
        <Check className="mr-2 h-4 w-4" />
      ) : (
        <Copy className="mr-2 h-4 w-4" />
      )}
      Copy for LLM
    </Button>
  );
}
