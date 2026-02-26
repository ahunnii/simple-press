"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
import { useCart } from "~/providers/cart-context";

const checkoutSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  address2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  zip: z.string().min(5, "Please enter a valid ZIP code"),
  cardNumber: z.string().min(16, "Please enter a valid card number"),
  expiry: z.string().min(5, "Please enter a valid expiry date"),
  cvc: z.string().min(3, "Please enter a valid CVC"),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

export function CheckoutForm() {
  const { clearCart } = useCart();
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      state: "",
    },
  });

  const onSubmit = async (_data: CheckoutFormData) => {
    setSubmitting(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setSubmitting(false);
    setSuccessOpen(true);
  };

  const handleSuccessClose = () => {
    clearCart();
    setSuccessOpen(false);
    router.push("/");
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8">
        {/* Contact Information */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-foreground font-serif text-lg font-semibold">
            Contact Information
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-destructive text-xs">
                  {errors.email.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(555) 555-5555"
                {...register("phone")}
              />
              {errors.phone && (
                <p className="text-destructive text-xs">
                  {errors.phone.message}
                </p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Shipping Address */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-foreground font-serif text-lg font-semibold">
            Shipping Address
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-destructive text-xs">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-destructive text-xs">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              placeholder="123 Main St"
              {...register("address")}
            />
            {errors.address && (
              <p className="text-destructive text-xs">
                {errors.address.message}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address2">
              Apartment, suite, etc.{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="address2" {...register("address2")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
              {errors.city && (
                <p className="text-destructive text-xs">
                  {errors.city.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="state">State</Label>
              <Select onValueChange={(val) => setValue("state", val)}>
                <SelectTrigger id="state">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <p className="text-destructive text-xs">
                  {errors.state.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="zip">ZIP Code</Label>
              <Input id="zip" placeholder="48201" {...register("zip")} />
              {errors.zip && (
                <p className="text-destructive text-xs">{errors.zip.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        {/* Payment (Mock) */}
        <fieldset className="flex flex-col gap-4">
          <legend className="text-foreground font-serif text-lg font-semibold">
            Payment
          </legend>
          <p className="text-muted-foreground text-xs">
            This is a demo checkout. No real payment will be processed.
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cardNumber">Card Number</Label>
            <Input
              id="cardNumber"
              placeholder="4242 4242 4242 4242"
              {...register("cardNumber")}
            />
            {errors.cardNumber && (
              <p className="text-destructive text-xs">
                {errors.cardNumber.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="expiry">Expiry Date</Label>
              <Input id="expiry" placeholder="MM/YY" {...register("expiry")} />
              {errors.expiry && (
                <p className="text-destructive text-xs">
                  {errors.expiry.message}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="cvc">CVC</Label>
              <Input id="cvc" placeholder="123" {...register("cvc")} />
              {errors.cvc && (
                <p className="text-destructive text-xs">{errors.cvc.message}</p>
              )}
            </div>
          </div>
        </fieldset>

        <Button
          type="submit"
          size="lg"
          disabled={submitting}
          className="w-full"
        >
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Processing...
            </>
          ) : (
            "Place Order"
          )}
        </Button>
      </form>

      {/* Success Dialog */}
      <Dialog open={successOpen} onOpenChange={handleSuccessClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="items-center text-center">
            <div className="bg-primary/10 mx-auto flex size-16 items-center justify-center rounded-full">
              <CheckCircle2 className="text-primary size-8" />
            </div>
            <DialogTitle className="font-serif text-xl">
              Order Placed!
            </DialogTitle>
            <DialogDescription className="text-center">
              Thank you for your purchase. Your premium bamboo products are on
              their way from Detroit to your door.
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleSuccessClose} className="mt-4 w-full">
            Return Home
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
