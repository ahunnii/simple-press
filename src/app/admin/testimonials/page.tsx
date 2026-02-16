import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Plus } from "lucide-react";

import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { Button } from "~/components/ui/button";

import { SiteHeader } from "../_components/site-header";
import { SendInviteDialog } from "./_components/send-invite-dialog";
import { TestimonialsList } from "./_components/testimonials-list";

export default async function TestimonialsPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      business: { select: { id: true, name: true } },
    },
  });

  if (!user?.business) {
    redirect("/admin/welcome");
  }

  return (
    <>
      <SiteHeader title="Testimonials" />
      <div className="admin-container">
        <div className="admin-header">
          <div>
            <h1>Testimonials</h1>
            <p>Manage customer testimonials and reviews</p>
          </div>
          <div className="flex gap-3">
            <SendInviteDialog businessId={user.business.id} />
          </div>
        </div>

        <TestimonialsList businessId={user.business.id} />
      </div>
    </>
  );
}
