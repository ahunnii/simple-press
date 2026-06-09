"use client";

import { useEffect, useState } from "react";

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

  // Reset discount when cart subtotal changes
  useEffect(() => {
    setDiscountCodeId(null);
    setDiscountAmount(0);
    setDiscountCodeLabel(null);
    setDiscountFieldError(null);
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
