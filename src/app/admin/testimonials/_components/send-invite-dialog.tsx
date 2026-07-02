"use client";

import { useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";

import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

const EMAIL_REGEX = /^\S+@\S+\.\S+$/;

export function SendInviteDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [maxPhotos, setMaxPhotos] = useState(3);
  const [emailError, setEmailError] = useState<string | null>(null);

  const validateEmail = (value: string): string | null => {
    if (!value.trim()) return "Enter a valid email address";
    if (!EMAIL_REGEX.test(value.trim())) {
      return "Enter a valid email address";
    }
    return null;
  };

  // Get customers for dropdown (first page of results)
  const { data: customerList } = api.customer.list.useQuery(
    {},
    {
      enabled: open,
    },
  );
  const customers = customerList?.customers;

  const sendInviteMutation = api.testimonial.sendInvite.useMutation({
    onSuccess: () => {
      toast.success("Testimonial invite sent!");
      setOpen(false);
      setEmail("");
      setCustomerId(undefined);
      setMaxPhotos(3);
      setEmailError(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invite");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateEmail(email);
    if (validationError) {
      setEmailError(validationError);
      return;
    }

    sendInviteMutation.mutate({
      email: email.trim(),
      customerId,
      maxPhotos,
    });
  };

  const handleCustomerSelect = (customerId: string) => {
    setCustomerId(customerId);
    const customer = customers?.find((c) => c.id === customerId);
    if (customer) {
      setEmail(customer.email);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      setEmailError(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Mail className="mr-2 h-4 w-4" />
          Send Invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Send Testimonial Invite</DialogTitle>
            <DialogDescription>
              Invite a customer to submit a testimonial. They&apos;ll receive an
              email with a unique link.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Customer Selector */}
            <div>
              <Label htmlFor="customer">Select Customer (Optional)</Label>
              <Select value={customerId} onValueChange={handleCustomerSelect}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  {customers?.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.firstName} {customer.lastName} ({customer.email}
                      )
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Email Input */}
            <div>
              <Label htmlFor="email">
                Email Address <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError(null);
                }}
                onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                placeholder="customer@example.com"
                className="mt-2"
                aria-invalid={!!emailError}
                required
              />
              {emailError ? (
                <p className="text-destructive text-sm" role="alert">
                  {emailError}
                </p>
              ) : (
                <p className="text-muted-foreground mt-1 text-xs">
                  If this email isn&apos;t a customer, we&apos;ll create one
                  automatically
                </p>
              )}
            </div>

            {/* Max Photos */}
            <div>
              <Label htmlFor="maxPhotos">Max photos (0–5)</Label>
              <Select
                value={String(maxPhotos)}
                onValueChange={(v) => setMaxPhotos(Number(v))}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[0, 1, 2, 3, 4, 5].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n} {n === 1 ? "photo" : "photos"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-muted-foreground mt-1 text-xs">
                How many photos this customer can add to their testimonial
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={sendInviteMutation.isPending}>
              {sendInviteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invite
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
