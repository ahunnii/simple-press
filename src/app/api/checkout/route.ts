import { NextResponse } from "next/server";
// import Stripe from "stripe";

// import { env } from "~/env";

// const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export async function POST(req: Request) {
  // const { amount } = (await req.json()) as { amount: number }; // Amount in dollars

  return NextResponse.json(
    { error: "This feature is not available yet" },
    { status: 500 },
  );

  // try {
  //   const session = await stripe.checkout.sessions.create({
  //     payment_method_types: ["card"],
  //     line_items: [
  //       {
  //         price_data: {
  //           currency: "usd",
  //           product_data: {
  //             name: "Donation to Artisanal Futures",
  //             description:
  //               "Support for Artisanal Futures and artisan communities.",
  //           },
  //           unit_amount: amount * 100, // Stripe uses cents
  //         },
  //         quantity: 1,
  //       },
  //     ],
  //     mode: "payment",
  //     submit_type: "donate",
  //     success_url: `${req.headers.get("origin")}/donate/success`,
  //     cancel_url: `${req.headers.get("origin")}/donate/cancel`,
  //   });

  //   return NextResponse.json({ url: session.url });
  // } catch (err: unknown) {
  //   if (err instanceof Error) {
  //     return NextResponse.json({ error: err.message }, { status: 500 });
  //   }
  //   return NextResponse.json(
  //     { error: "An unknown error occurred" },
  //     { status: 500 },
  //   );
  // }
}
