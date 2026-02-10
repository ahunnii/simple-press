import Link from "next/link";
import { Home, SearchX } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Footer } from "~/components/layout/footer";
import { Header } from "~/components/layout/header";

export default function NotFound() {
  return (
    <div className="bg-background min-h-screen">
      <Header />
      <div className="bg-primary/5 flex min-h-[calc(100vh-7rem)] items-center justify-center pt-28">
        <main className="flex flex-1 items-center justify-center">
          <section className="w-full py-16 md:py-24">
            <div className="mx-auto flex max-w-2xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
              <div className="bg-primary/10 text-primary mb-6 flex size-20 items-center justify-center rounded-full">
                <SearchX className="size-10" aria-hidden />
              </div>
              <p className="text-primary mb-2 text-sm font-medium">Error 404</p>
              <h1 className="text-foreground mb-4 text-4xl font-bold text-balance md:text-5xl">
                Page not found
              </h1>
              <p className="text-muted-foreground mb-8 max-w-lg text-lg leading-relaxed">
                The page you&apos;re looking for doesn&apos;t exist or may have
                been moved. Head back to the homepage or explore our community
                and events.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                <Button size="lg" asChild>
                  <Link href="/">
                    <Home className="size-4" />
                    Back to Home
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/community">Community</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/events">Events</Link>
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
