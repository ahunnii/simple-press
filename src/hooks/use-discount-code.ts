"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { useCart } from "~/providers/cart-context";

type UseDiscountCodeReturn = {
  discountCodeInput: string;
  setDiscountCodeInput: (val: string) => void;
  discountCodeId: string | null;
  discountAmount: number;
  discountCodeLabel: string | null;
  discountFieldError: string | null;
  setDiscountFieldError: (val: string | null) => void;
  handleApplyDiscount: () => void;
  isValidating: boolean;
  clearDiscount: () => void;
};

export function useDiscountCode(): UseDiscountCodeReturn {
  const { subtotal } = useCart();

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [discountCodeId, setDiscountCodeId] = useState<string | null>(null);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountCodeLabel, setDiscountCodeLabel] = useState<string | null>(
    null,
  );
  const [discountFieldError, setDiscountFieldError] = useState<string | null>(
    null,
  );

  const validateDiscountMutation = api.discount.validate.useMutation({
    onSuccess: (data) => {
      setDiscountCodeId(data.discount.id);
      setDiscountAmount(data.discount.discountAmount);
      setDiscountCodeLabel(data.discount.code);
      setDiscountFieldError(null);
    },
    onError: (err) => {
      setDiscountCodeId(null);
      setDiscountAmount(0);
      setDiscountCodeLabel(null);
      setDiscountFieldError(err.message ?? "Invalid code");
    },
  });

  // Reset discount when cart subtotal changes. Skip the very first run (on
  // mount) so we don't fire a spurious toast before the shopper has ever
  // applied anything.
  const isFirstSubtotalRenderRef = useRef(true);
  useEffect(() => {
    if (isFirstSubtotalRenderRef.current) {
      isFirstSubtotalRenderRef.current = false;
      return;
    }
    // Only notify + clear the code text if a discount was actually applied —
    // otherwise this just silently no-ops on ordinary cart changes.
    if (discountCodeId) {
      toast.info("Discount removed because your cart changed", {
        description: "Please re-apply your code if it still qualifies.",
      });
    }
    setDiscountCodeInput("");
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
    // Deliberately keyed only on `subtotal` — `discountCodeId` is read from
    // the latest render's closure (not listed as a dep) so applying a
    // discount doesn't itself re-trigger this "cart changed" effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  function handleApplyDiscount() {
    const code = discountCodeInput.trim();
    if (!code) {
      setDiscountFieldError("Enter a discount code");
      return;
    }
    if (subtotal <= 0) {
      setDiscountFieldError("Your cart is empty");
      return;
    }
    setDiscountFieldError(null);
    validateDiscountMutation.mutate({ code, cartTotal: subtotal });
  }

  function clearDiscount() {
    setDiscountCodeInput("");
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
  }

  return {
    discountCodeInput,
    setDiscountCodeInput,
    discountCodeId,
    discountAmount,
    discountCodeLabel,
    discountFieldError,
    setDiscountFieldError,
    handleApplyDiscount,
    isValidating: validateDiscountMutation.isPending,
    clearDiscount,
  };
}
