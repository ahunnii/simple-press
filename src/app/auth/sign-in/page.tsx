import Image from "next/image";
import Link from "next/link";
import { AuthView } from "@daveyplate/better-auth-ui";
import { ArrowLeft, Leaf } from "lucide-react";

export const metadata = {
  title: "Sign In",
  description: "Sign in to your Crossroads Community Association account",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo: string }>;
}) {
  const { redirectTo } = await searchParams;

  console.log(redirectTo);

  return (
    <div className="bg-background flex min-h-screen">
      <div className="bg-primary relative hidden overflow-hidden lg:flex lg:w-1/2">
        <div className="absolute inset-0 bg-[url('/image-bench.png')] bg-cover bg-center opacity-20" />
        <div className="text-primary-foreground relative z-10 flex flex-col justify-between p-12">
          <Link
            href="/"
            className="text-primary-foreground flex w-fit items-center gap-2 transition-opacity hover:opacity-80"
          >
            {/* <div className="bg-primary flex h-8 w-8 items-center justify-center rounded-full">
              <span className="text-primary-foreground text-sm font-bold">
                CCA
              </span>
            </div>
            <span className="text-xl font-bold">
              Crossroads Community Association
            </span> */}
            <Image
              src="/logo-transparent.png"
              alt="Crossroads Community Association"
              width={100}
              height={100}
            />
          </Link>

          <div className="max-w-md">
            <h1 className="mb-4 text-4xl font-bold text-balance">
              Welcome Back to Your Community {redirectTo}
            </h1>
            <p className="text-primary-foreground/80 mb-8 text-lg">
              Sign in to access your dashboard, manage your membership, and stay
              connected with your neighbors.
            </p>
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

      <div className="flex flex-1 flex-col">
        <div className="border-b p-4 lg:hidden">
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
                <Leaf className="text-primary-foreground h-6 w-6" />
              </div>
              <span className="text-foreground text-xl font-bold">
                Crossroads Community Association
              </span>
            </div>

            <AuthView view="SIGN_IN" redirectTo={redirectTo} />

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

        <div className="text-muted-foreground border-t p-4 text-center text-xs">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:underline">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </div>
  );
}
