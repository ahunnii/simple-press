import { redirect } from "next/navigation";

export default async function SignUpPage() {
  redirect("/auth/sign-up");
}
