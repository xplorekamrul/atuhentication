import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  Shield,
  ShoppingBag,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Workspace | rareviewit",
};

async function WorkspaceContent() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-6">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-3 py-1 text-xs font-semibold border border-primary/20">
            <UserCheck className="h-3.5 w-3.5" />
            Authenticated Workspace
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-1">
            Welcome, {user.name || user.email}
          </h1>
          <p className="text-sm text-muted-foreground">
            Protected customer workspace verified by <span className="font-mono">proxy.ts</span> and active session tracking.
          </p>
        </div>

        <Button asChild>
          <Link href="/profile">
            <span>Manage Profile</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Active Session Overview */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Account Type</CardDescription>
            <CardTitle className="text-xl font-bold">{user.userType || "USER"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Session identity classification</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Account Status</CardDescription>
            <CardTitle className="text-xl font-bold text-primary">{user.status || "ACTIVE"}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Validated live on every request</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Session Version</CardDescription>
            <CardTitle className="text-xl font-bold">v{user.sessionVersion ?? 1}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Auto-revokes on password reset</p>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase tracking-wider">Account ID</CardDescription>
            <CardTitle className="text-lg font-mono truncate">{String(user.id)}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Primary identifier in session</p>
          </CardContent>
        </Card>
      </div>

      {/* Dummy Modules */}
      <div className="grid gap-5 md:grid-cols-3">
        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader>
            <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">My Orders</CardTitle>
            <CardDescription>
              View sample customer purchases and fulfillment tracking inside a protected route.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/orders">
                <span>Open Orders</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader>
            <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
              <CreditCard className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Billing & Invoices</CardTitle>
            <CardDescription>
              Test customer plan details and downloadable invoice stubs behind authentication.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/billing">
                <span>Open Billing</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <CardHeader>
            <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
              <Shield className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg">Security & Login History</CardTitle>
            <CardDescription>
              Inspect recent sign-ins, update your password, and manage personal profile fields.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full justify-between">
              <Link href="/profile">
                <span>Open Profile</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Boundary Confirmation */}
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="p-5 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1 text-sm">
            <p className="font-semibold text-foreground">Customer Boundary Isolation Active</p>
            <p className="text-muted-foreground text-xs leading-relaxed">
              This route group is accessible strictly to authenticated users via <span className="font-mono">proxy.ts</span>.
              Guests are automatically redirected to <span className="font-mono">/login</span>, and standard user accounts remain isolated from administrative dashboards.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <div className="h-12 w-72 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted/60 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <WorkspaceContent />
    </Suspense>
  );
}

