import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "Sign Up",
  description: "Sign up to join the Crossroads Community Association",
};
export default async function SignUpPage() {
  return (
    <div className="bg-background flex min-h-screen">
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[url('/image-father-daughter.png')] bg-cover bg-center opacity-20" />
        <div className="text-primary-foreground relative z-10 flex flex-col justify-between p-12">
          <Link
            href="/"
            className="text-primary-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Image
              src="/logo-transparent.png"
              alt="Crossroads Community Association"
              width={100}
              height={100}
            />
          </Link>

          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold text-balance">
              Join Our Growing Community
            </h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Create your account to connect with neighbors, join clubs, and
              make a difference in District 3.
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-primary-foreground/20 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-primary-foreground/90 text-sm">
                  Access to 13+ active block clubs and community groups
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary-foreground/20 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-primary-foreground/90 text-sm">
                  Member events and volunteer opportunities
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="bg-primary-foreground/20 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <p className="text-primary-foreground/90 text-sm">
                  Resources and support for neighborhood improvement
                </p>
              </div>
            </div>
          </div>

          <div className="text-primary-foreground/60 text-sm">
            © 2026 Crossroads Community Association. All rights reserved.
            <span className="text-muted-foreground mx-2">|</span>
            Site by{" "}
            <a
              href="https://artisanalfutures.org"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline"
            >
              Artisanal Futures
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        <div className="bg-background sticky top-0 z-10 border-b p-4 lg:hidden">
          <Link
            href="/"
            className="text-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back to Home</span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
              <div className="bg-primary flex h-10 w-10 items-center justify-center rounded-lg">
                <span className="text-primary-foreground text-sm font-bold">
                  {" "}
                  CCA{" "}
                </span>
              </div>
              <span className="text-foreground text-xl font-bold">
                Crossroads Community Association
              </span>
            </div>

            <AuthView view="SIGN_UP" />

            <div className="mt-8 hidden text-left lg:block">
              <Link
                href="/"
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
