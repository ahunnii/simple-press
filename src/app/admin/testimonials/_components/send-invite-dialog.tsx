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

export function SendInviteDialog() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [maxPhotos, setMaxPhotos] = useState(3);

  // Get customers for dropdown
  const { data: customers } = api.customer.list.useQuery({}, {
    enabled: open,
  });

  const sendInviteMutation = api.testimonial.sendInvite.useMutation({
    onSuccess: () => {
      toast.success("Testimonial invite sent!");
      setOpen(false);
      setEmail("");
      setCustomerId(undefined);
      setMaxPhotos(3);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to send invite");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter an email address");
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
                Email Address <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="mt-2"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                If this email isn&apos;t a customer, we&apos;ll create one
                automatically
              </p>
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
              <p className="mt-1 text-xs text-gray-500">
                How many photos this customer can add to their testimonial
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
