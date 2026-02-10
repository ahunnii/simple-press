import Link from "next/link";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "~/components/ui/alert";
import { Button } from "~/components/ui/button";

export default function WelcomeNotification() {
  return (
    <Alert variant="default" className="mx-auto my-6 w-full max-w-3xl">
      <AlertTitle>Welcome to your store!</AlertTitle>
      <AlertDescription>
        <p>
          You are almost finished! Complete the setup to get started selling.
        </p>{" "}
      </AlertDescription>
      <AlertAction>
        <Button variant="outline" asChild>
          <Link href="/admin/welcome">Finish setup</Link>
        </Button>
      </AlertAction>
    </Alert>
  );
}
