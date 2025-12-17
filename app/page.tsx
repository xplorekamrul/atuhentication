import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold mb-2">Hi !</h1>
        <p className="text-sm text-muted-foreground mb-6">Welcome — choose an option</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button asChild className="w-40">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild variant="outline" className="w-40">
            <Link href="/register">Create account</Link>
          </Button>
        </div>

      </div>
    </main>
  );
}
