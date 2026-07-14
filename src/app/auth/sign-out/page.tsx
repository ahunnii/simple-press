import { AuthView } from "@daveyplate/better-auth-ui";

export default async function AuthPage() {
  return (
    <main className="container flex grow flex-col items-center justify-center self-center p-4 md:p-6">
      <AuthView view="SIGN_OUT" />
    </main>
  );
}

export const metadata = {
  title: "Sign Out",
};
