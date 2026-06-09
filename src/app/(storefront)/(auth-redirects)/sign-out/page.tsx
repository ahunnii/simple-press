import { redirect } from "next/navigation";

export default async function SignOutPage() {
  redirect("/auth/sign-out");
}
