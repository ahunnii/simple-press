import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "~/components/ui/button";

export function CTASection() {
  return (
    <section className="bg-blue-600 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-white md:text-4xl">
            Ready to start selling?
          </h2>
          <p className="mb-8 text-xl text-blue-100">
            Join hundreds of small businesses already using our platform. Get
            started today - no credit card required.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="w-full sm:w-auto"
            >
              <Link href="/signup" className="gap-2">
                Create Your Store
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <p className="mt-6 text-sm text-blue-200">
            Set up in under 5 minutes • No technical skills needed
          </p>
        </div>
      </div>
    </section>
  );
}
