import Link from "next/link";
import { Button } from "~/components/ui/button";

export function PlatformLanding() {
  return (
    <div>
      <h1>Build Your Online Store</h1>
      <p>The easiest way for small businesses to sell online</p>
      <Button asChild>
        <Link href="/signup">Get Started</Link>
      </Button>
      <Button asChild>
        <Link href="/login">Login</Link>
      </Button>
    </div>
  );
}
