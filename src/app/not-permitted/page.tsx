import Link from "next/link";
import { Home, ShieldX } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Footer } from "~/components/layout/footer";
import { Header } from "~/components/layout/header";

export const metadata = {
  title: "Not permitted",
  description: "You don't have permission to access this page.",
};

export default function NotPermittedPage() {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="bg-primary/5 flex min-h-[calc(100vh-7rem)] items-center justify-center pt-28">
        <main className="flex flex-1 flex-col items-center justify-center">
          <section className="w-full py-16 md:py-24">
            <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
              <div className="bg-primary/10 text-primary mb-6 flex size-20 items-center justify-center rounded-full">
                <ShieldX className="size-10" aria-hidden />
              </div>
              <p className="text-primary mb-2 text-sm font-medium">Error 403</p>
              <h1 className="text-foreground mb-4 text-4xl font-bold text-balance md:text-5xl">
                You are not permitted
              </h1>
              <p className="text-muted-foreground mb-8 max-w-lg text-lg leading-relaxed">
                You don&apos;t have permission to access this page. If you
                believe this is an error, try signing in with a different
                account or contact support.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/">
                    <Home className="size-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/auth/sign-in">Sign in</Link>
                </Button>
              </div>
            </div>
          </section>
        </main>
      </div>
      <Footer />
    </div>
  );
}
