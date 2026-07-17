import type { FieldValues, UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TrpcFormError } from "./apply-trpc-error";

import { applyTrpcErrorToForm } from "./apply-trpc-error";

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

function makeForm(values: Record<string, unknown>) {
  return {
    getValues: vi.fn(() => values),
    setError: vi.fn(),
    setFocus: vi.fn(),
  } as unknown as UseFormReturn<FieldValues> & {
    getValues: ReturnType<typeof vi.fn>;
    setError: ReturnType<typeof vi.fn>;
    setFocus: ReturnType<typeof vi.fn>;
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("applyTrpcErrorToForm", () => {
  describe("tier 1: zod field errors", () => {
    it("sets an error only on fields that exist in the form's current values", () => {
      const form = makeForm({ slug: "", name: "" });
      const error: TrpcFormError = {
        message: "Validation failed",
        data: {
          zodError: {
            fieldErrors: {
              slug: ["Slug is required"],
              unknownField: ["Should be ignored"],
            },
          },
        },
      };

      applyTrpcErrorToForm(form, error);

      expect(form.setError).toHaveBeenCalledTimes(1);
      expect(form.setError).toHaveBeenCalledWith(
        "slug",
        { type: "server", message: "Slug is required" },
        { shouldFocus: true },
      );
    });

    it("focuses only the first matched field", () => {
      const form = makeForm({ slug: "", name: "" });
      const error: TrpcFormError = {
        message: "Validation failed",
        data: {
          zodError: {
            fieldErrors: {
              slug: ["Slug is required"],
              name: ["Name is required"],
            },
          },
        },
      };

      applyTrpcErrorToForm(form, error);

      expect(form.setError).toHaveBeenCalledTimes(2);
      expect(form.setError).toHaveBeenNthCalledWith(
        1,
        "slug",
        { type: "server", message: "Slug is required" },
        { shouldFocus: true },
      );
      expect(form.setError).toHaveBeenNthCalledWith(
        2,
        "name",
        { type: "server", message: "Name is required" },
        { shouldFocus: false },
      );
    });

    it("returns early without toasting when tier 1 matched", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = {
        message: "Validation failed",
        data: {
          zodError: { fieldErrors: { slug: ["Slug is required"] } },
        },
      };

      applyTrpcErrorToForm(form, error);

      expect(toast.error).not.toHaveBeenCalled();
    });

    it("uses the top-level segment of a dotted field path to check form values", () => {
      const form = makeForm({ address: {} });
      const error: TrpcFormError = {
        message: "Validation failed",
        data: {
          zodError: {
            fieldErrors: { "address.line1": ["Line 1 is required"] },
          },
        },
      };

      applyTrpcErrorToForm(form, error);

      expect(form.setError).toHaveBeenCalledWith(
        "address.line1",
        { type: "server", message: "Line 1 is required" },
        { shouldFocus: true },
      );
    });

    it("falls through to later tiers when no zod field matches a form field", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = {
        message: "slug is taken",
        data: {
          zodError: { fieldErrors: { unknownField: ["Nope"] } },
        },
      };

      applyTrpcErrorToForm(form, error, { fieldMap: { taken: "slug" } });

      expect(form.setError).toHaveBeenCalledWith(
        "slug",
        { type: "server", message: "slug is taken" },
        { shouldFocus: true },
      );
    });
  });

  describe("tier 2: fieldMap substring match", () => {
    it("matches case-insensitively against error.message", () => {
      const form = makeForm({ email: "" });
      const error: TrpcFormError = { message: "This EMAIL is already in use" };

      applyTrpcErrorToForm(form, error, {
        fieldMap: { email: "email" },
      });

      expect(form.setError).toHaveBeenCalledWith(
        "email",
        { type: "server", message: "This EMAIL is already in use" },
        { shouldFocus: true },
      );
      expect(toast.error).not.toHaveBeenCalled();
    });

    it("uses the first matching fieldMap entry", () => {
      const form = makeForm({ slug: "", email: "" });
      const error: TrpcFormError = { message: "slug and email both taken" };

      applyTrpcErrorToForm(form, error, {
        fieldMap: { slug: "slug", email: "email" },
      });

      expect(form.setError).toHaveBeenCalledTimes(1);
      expect(form.setError).toHaveBeenCalledWith(
        "slug",
        { type: "server", message: "slug and email both taken" },
        { shouldFocus: true },
      );
    });
  });

  describe("tier 3: toast fallback", () => {
    it("shows a toast when nothing matched", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = { message: "Something exploded" };

      applyTrpcErrorToForm(form, error);

      expect(form.setError).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith("Something exploded");
    });

    it("uses the fallback message when error.message is empty", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = { message: "" };

      applyTrpcErrorToForm(form, error, {
        fallbackMessage: "Custom fallback",
      });

      expect(toast.error).toHaveBeenCalledWith("Custom fallback");
    });

    it("uses the default fallback message when none is provided and message is empty", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = { message: "" };

      applyTrpcErrorToForm(form, error);

      expect(toast.error).toHaveBeenCalledWith("Something went wrong.");
    });

    it("suppresses the toast when fallbackToast is false", () => {
      const form = makeForm({ slug: "" });
      const error: TrpcFormError = { message: "Something exploded" };

      applyTrpcErrorToForm(form, error, { fallbackToast: false });

      expect(toast.error).not.toHaveBeenCalled();
    });
  });
});
