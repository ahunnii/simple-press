"use client";

import type { Path, UseFormReturn } from "react-hook-form";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import type {
  InvoicePaymentMethod,
  InvoicePaymentMethodType,
} from "~/lib/validators/invoice";
import {
  normalizeCashAppHandle,
  normalizeVenmoHandle,
} from "~/lib/donation-handles";
import {
  bankTransferPaymentMethodSchema,
  cashAppPaymentMethodSchema,
  cashCheckPaymentMethodSchema,
  INVOICE_BANK_ACCOUNT_TYPE_VALUES,
  INVOICE_PAYMENT_METHOD_TYPE_LABELS,
  INVOICE_PAYMENT_METHOD_TYPE_VALUES,
  otherPaymentMethodSchema,
  payPalPaymentMethodSchema,
  venmoPaymentMethodSchema,
  zellePaymentMethodSchema,
} from "~/lib/validators/invoice";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { InputFormField } from "~/components/inputs/input-form-field";
import { SelectFormField } from "~/components/inputs/select-form-field";
import { TextareaFormField } from "~/components/inputs/textarea-form-field";

/**
 * Add/edit dialog for one saved payment method. Each type gets its OWN
 * `useForm`, keyed by `type` at the call site below, so every field name is a
 * concrete (non-union) path — `paymentMethodSchema` itself is a
 * discriminated union, and RHF's `Path<T>` over a union type only sees keys
 * common to every member, which would break `InputFormField`/`SelectFormField`
 * for anything type-specific (`accountName`, `handle`, …).
 *
 * `id`/`type` are carried as hidden registered fields rather than left out of
 * the form entirely, so `handleSubmit` always returns them regardless of RHF
 * version behavior around unregistered `defaultValues`.
 */

type SubFormProps<Method extends InvoicePaymentMethod> = {
  id: string;
  initial?: Method;
  onSave: (method: InvoicePaymentMethod) => void;
  onCancel: () => void;
};

function HiddenFields<T extends { id: string; type: string }>({
  form,
}: {
  form: UseFormReturn<T>;
}) {
  return (
    <>
      <input type="hidden" {...form.register("id" as Path<T>)} />
      <input type="hidden" {...form.register("type" as Path<T>)} />
    </>
  );
}

function DialogActions({ onCancel }: { onCancel: () => void }) {
  return (
    <DialogFooter>
      <Button type="button" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit">Save</Button>
    </DialogFooter>
  );
}

function BankTransferForm({
  id,
  initial,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "bank_transfer" }>>) {
  const form = useForm<z.infer<typeof bankTransferPaymentMethodSchema>>({
    resolver: zodResolver(bankTransferPaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "bank_transfer",
      label: initial?.label ?? "",
      accountName: initial?.accountName ?? "",
      bankName: initial?.bankName ?? "",
      routingNumber: initial?.routingNumber ?? "",
      accountNumber: initial?.accountNumber ?? "",
      accountType: initial?.accountType,
      swift: initial?.swift ?? "",
      instructions: initial?.instructions ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Business checking"
          description="Shown to you in this list and, in emails, as the method name. Never a detail."
        />
        <InputFormField
          form={form}
          name="accountName"
          label="Account holder name"
          required
        />
        <InputFormField
          form={form}
          name="bankName"
          label="Bank name"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <InputFormField
            form={form}
            name="routingNumber"
            label="Routing number"
            required
            inputClassName="font-mono"
          />
          <FormField
            control={form.control}
            name="accountNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Account number <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} autoComplete="off" className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <SelectFormField
          form={form}
          name="accountType"
          label="Account type"
          placeholder="Not specified"
          values={INVOICE_BANK_ACCOUNT_TYPE_VALUES.map((value) => ({
            value,
            label: value === "checking" ? "Checking" : "Savings",
          }))}
        />
        <InputFormField
          form={form}
          name="swift"
          label="SWIFT / BIC"
          placeholder="Optional — for international transfers"
        />
        <TextareaFormField
          form={form}
          name="instructions"
          label="Additional instructions"
          placeholder="Optional"
          rows={3}
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

const payPalFormSchema = payPalPaymentMethodSchema.superRefine(
  (method, ctx) => {
    if (!method.handle && !method.email) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["handle"],
        message: "Enter a PayPal.Me username or a PayPal email",
      });
    }
  },
);

function PayPalForm({
  id,
  initial,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "paypal" }>>) {
  const form = useForm<z.infer<typeof payPalPaymentMethodSchema>>({
    resolver: zodResolver(payPalFormSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "paypal",
      label: initial?.label ?? "",
      handle: initial?.handle ?? "",
      email: initial?.email ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="PayPal"
        />
        <InputFormField
          form={form}
          name="handle"
          label="PayPal.Me username or link"
          placeholder="jane or paypal.me/jane"
        />
        <InputFormField
          form={form}
          name="email"
          label="PayPal email"
          type="email"
          placeholder="Optional if a username is set above"
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function VenmoForm({
  id,
  initial,
  venmoHandle,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "venmo" }>> & {
  venmoHandle?: string | null;
}) {
  const form = useForm<z.infer<typeof venmoPaymentMethodSchema>>({
    resolver: zodResolver(venmoPaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "venmo",
      label: initial?.label ?? "",
      handle:
        initial?.handle ?? normalizeVenmoHandle(venmoHandle ?? null) ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Venmo"
        />
        <InputFormField
          form={form}
          name="handle"
          label="Venmo username"
          required
          placeholder="janedoe"
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function CashAppForm({
  id,
  initial,
  cashAppHandle,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "cash_app" }>> & {
  cashAppHandle?: string | null;
}) {
  const form = useForm<z.infer<typeof cashAppPaymentMethodSchema>>({
    resolver: zodResolver(cashAppPaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "cash_app",
      label: initial?.label ?? "",
      cashtag:
        initial?.cashtag ?? normalizeCashAppHandle(cashAppHandle ?? null) ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Cash App"
        />
        <InputFormField
          form={form}
          name="cashtag"
          label="$Cashtag"
          required
          placeholder="janedoe"
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function ZelleForm({
  id,
  initial,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "zelle" }>>) {
  const form = useForm<z.infer<typeof zellePaymentMethodSchema>>({
    resolver: zodResolver(zellePaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "zelle",
      label: initial?.label ?? "",
      emailOrPhone: initial?.emailOrPhone ?? "",
      name: initial?.name ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Zelle"
        />
        <InputFormField
          form={form}
          name="emailOrPhone"
          label="Zelle email or phone"
          required
        />
        <InputFormField
          form={form}
          name="name"
          label="Recipient name"
          required
          description="The name the customer will see in their banking app."
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function CashCheckForm({
  id,
  initial,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "cash_check" }>>) {
  const form = useForm<z.infer<typeof cashCheckPaymentMethodSchema>>({
    resolver: zodResolver(cashCheckPaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "cash_check",
      label: initial?.label ?? "",
      payableTo: initial?.payableTo ?? "",
      mailingAddress: initial?.mailingAddress ?? "",
      instructions: initial?.instructions ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Cash or check"
        />
        <InputFormField
          form={form}
          name="payableTo"
          label="Payable to"
          required
        />
        <TextareaFormField
          form={form}
          name="mailingAddress"
          label="Mailing address"
          placeholder="Optional"
          rows={2}
        />
        <TextareaFormField
          form={form}
          name="instructions"
          label="Additional instructions"
          placeholder="Optional"
          rows={3}
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function OtherForm({
  id,
  initial,
  onSave,
  onCancel,
}: SubFormProps<Extract<InvoicePaymentMethod, { type: "other" }>>) {
  const form = useForm<z.infer<typeof otherPaymentMethodSchema>>({
    resolver: zodResolver(otherPaymentMethodSchema),
    mode: "onTouched",
    reValidateMode: "onChange",
    defaultValues: {
      id,
      type: "other",
      label: initial?.label ?? "",
      title: initial?.title ?? "",
      instructions: initial?.instructions ?? "",
    },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={(e) => {
          // This dialog is portaled (via Radix `Dialog`), but React re-fires
          // "submit" up the *React* tree, portals included — without this,
          // saving a method also submits the outer invoice-settings `<form>`
          // before `onSave` has appended/updated the field array, wiping out
          // the new method with a stale save.
          e.stopPropagation();
          void form.handleSubmit((data) => onSave(data))(e);
        }}
        className="space-y-4"
      >
        <HiddenFields form={form} />
        <InputFormField
          form={form}
          name="label"
          label="Label"
          placeholder="Optional"
        />
        <InputFormField
          form={form}
          name="title"
          label="Title"
          required
          placeholder="e.g. Wire transfer"
        />
        <TextareaFormField
          form={form}
          name="instructions"
          label="Instructions"
          required
          rows={4}
        />
        <DialogActions onCancel={onCancel} />
      </form>
    </Form>
  );
}

function MethodForm({
  type,
  id,
  initial,
  venmoHandle,
  cashAppHandle,
  onSave,
  onCancel,
}: {
  type: InvoicePaymentMethodType;
  id: string;
  initial?: InvoicePaymentMethod;
  venmoHandle?: string | null;
  cashAppHandle?: string | null;
  onSave: (method: InvoicePaymentMethod) => void;
  onCancel: () => void;
}) {
  switch (type) {
    case "bank_transfer":
      return (
        <BankTransferForm
          id={id}
          initial={initial?.type === "bank_transfer" ? initial : undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "paypal":
      return (
        <PayPalForm
          id={id}
          initial={initial?.type === "paypal" ? initial : undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "venmo":
      return (
        <VenmoForm
          id={id}
          initial={initial?.type === "venmo" ? initial : undefined}
          venmoHandle={venmoHandle}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "cash_app":
      return (
        <CashAppForm
          id={id}
          initial={initial?.type === "cash_app" ? initial : undefined}
          cashAppHandle={cashAppHandle}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "zelle":
      return (
        <ZelleForm
          id={id}
          initial={initial?.type === "zelle" ? initial : undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "cash_check":
      return (
        <CashCheckForm
          id={id}
          initial={initial?.type === "cash_check" ? initial : undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
    case "other":
      return (
        <OtherForm
          id={id}
          initial={initial?.type === "other" ? initial : undefined}
          onSave={onSave}
          onCancel={onCancel}
        />
      );
  }
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Present when editing; absent when adding a new method. */
  initial?: InvoicePaymentMethod;
  onSave: (method: InvoicePaymentMethod) => void;
  /** Prefills a fresh Venmo/Cash App method from the business's donation handles. */
  venmoHandle?: string | null;
  cashAppHandle?: string | null;
};

export function PaymentMethodDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  venmoHandle,
  cashAppHandle,
}: Props) {
  const [type, setType] = useState<InvoicePaymentMethodType>(
    initial?.type ?? "bank_transfer",
  );
  const [id, setId] = useState<string>(
    () => initial?.id ?? crypto.randomUUID(),
  );

  // Re-seed the type/id whenever the dialog is (re)opened — for a fresh "add"
  // this mints a new id; for "edit" it snaps back to the method being edited.
  // `initial` is a stable reference from the caller's own state (only
  // replaced when a different method is opened), so this doesn't reset
  // mid-edit on unrelated re-renders.
  useEffect(() => {
    if (!open) return;
    setType(initial?.type ?? "bank_transfer");
    setId(initial?.id ?? crypto.randomUUID());
  }, [open, initial]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {initial ? "Edit payment method" : "Add payment method"}
          </DialogTitle>
          <DialogDescription>
            Stored encrypted. Full details only appear on the secure invoice
            page, never in emails.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="payment-method-type">Type</Label>
          <Select
            value={type}
            onValueChange={(value) =>
              setType(value as InvoicePaymentMethodType)
            }
          >
            <SelectTrigger id="payment-method-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVOICE_PAYMENT_METHOD_TYPE_VALUES.map((value) => (
                <SelectItem key={value} value={value}>
                  {INVOICE_PAYMENT_METHOD_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <MethodForm
          key={type}
          type={type}
          id={id}
          initial={initial}
          venmoHandle={venmoHandle}
          cashAppHandle={cashAppHandle}
          onSave={onSave}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
