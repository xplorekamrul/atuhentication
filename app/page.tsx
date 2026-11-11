import { SignOutButton } from "@/components/shared/SignOutButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { auth } from "@/lib/auth";
import {
  ArrowRight,
  CheckCircle2,
  CreditCard,
  KeyRound,
  LayoutDashboard,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

const platformHighlights = [
  {
    title: "Multi-Device Session Security",
    description:
      "Real-time sessionVersion tracking revokes compromised tokens immediately when passwords or statuses change.",
    icon: KeyRound,
  },
  {
    title: "Progressive Brute-Force Defense",
    description:
      "Sliding-window IP throttling and exponential backoff lockouts stop automated credential stuffing cleanly.",
    icon: Lock,
  },
  {
    title: "Sub-Millisecond Access Checks",
    description:
      "Dual-layer caching pairs in-memory guards with Next.js Cache Components for instant route verification.",
    icon: Zap,
  },
];

const userPagesPreview = [
  {
    title: "Customer Workspace",
    href: "/workspace",
    description:
      "Inspect live session status, account classification, and isolated customer workspace cards.",
    icon: LayoutDashboard,
    badge: "Protected Route",
  },
  {
    title: "My Orders",
    href: "/orders",
    description:
      "Sample order tracking module behind session authentication with automatic login redirects.",
    icon: ShoppingBag,
    badge: "Auth Required",
  },
  {
    title: "Billing & Plan",
    href: "/billing",
    description:
      "Subscription tier overview and invoice history stub inside the customer portal layout.",
    icon: CreditCard,
    badge: "Auth Required",
  },
  {
    title: "Profile & Login History",
    href: "/profile",
    description:
      "Manage account details, update password, and inspect recent sign-in activity logs.",
    icon: User,
    badge: "Account Settings",
  },
];

async function HeaderSessionNav() {
  const session = await auth();
  const user = session?.user as any;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/login">Sign in</Link>
        </Button>
        <Button asChild size="sm" className="shadow-sm">
          <Link href="/register">Get Started</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {user.userType === "ADMIN" ? (
        <Button asChild size="sm" className="shadow-sm">
          <Link href="/admin">
            <LayoutDashboard className="h-4 w-4" />
            <span>Admin Dashboard</span>
          </Link>
        </Button>
      ) : (
        <Button asChild size="sm" className="shadow-sm">
          <Link href="/workspace">
            <LayoutDashboard className="h-4 w-4" />
            <span>Workspace</span>
          </Link>
        </Button>
      )}
      <Button asChild variant="outline" size="sm">
        <Link href="/profile">Profile</Link>
      </Button>
      <SignOutButton redirectTo="/" />
    </div>
  );
}

async function HeroActionArea() {
  const session = await auth();
  const user = session?.user as any;

  if (!user) {
    return (
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
        <Button asChild size="lg" className="w-full sm:w-auto px-7 shadow-sm transition-all active:scale-95">
          <Link href="/login">
            <span>Sign in to Account</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="w-full sm:w-auto px-7 transition-all active:scale-95"
        >
          <Link href="/register">Create Free Account</Link>
        </Button>
      </div>
    );
  }

  const primaryHref = user.userType === "ADMIN" ? "/admin" : "/workspace";
  const primaryLabel = user.userType === "ADMIN" ? "Open Admin Portal" : "Open My Workspace";

  return (
    <div className="space-y-4 pt-2">
      <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium text-primary">
        <CheckCircle2 className="h-4 w-4" />
        <span>
          Signed in as <strong className="font-semibold">{user.name || user.email}</strong> ({user.userType})
        </span>
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button asChild size="lg" className="w-full sm:w-auto px-7 shadow-sm">
          <Link href={primaryHref}>
            <span>{primaryLabel}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto px-7">
          <Link href="/profile">Account & Security Settings</Link>
        </Button>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold text-lg tracking-tight text-foreground hover:text-primary transition-colors"
          >
            <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
              R
            </span>
            <span>rareviewit</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ModeToggle />
            <Suspense
              fallback={<div className="h-9 w-40 rounded-md bg-muted animate-pulse" />}
            >
              <HeaderSessionNav />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden border-b border-border/60">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1 text-xs font-medium text-muted-foreground shadow-xs">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span>Enterprise Authentication &bull; Live Theme Engine &bull; Next.js 16</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground leading-tight max-w-3xl mx-auto">
              Modern Identity, Secure Sessions &amp; Personalized Workspace
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Experience seamless authentication with Google One Tap, progressive brute-force
              protection, real-time session control, and instant dynamic theming.
            </p>

            <Suspense
              fallback={
                <div className="flex justify-center gap-3 pt-2">
                  <div className="h-10 w-44 rounded-md bg-muted animate-pulse" />
                  <div className="h-10 w-44 rounded-md bg-muted animate-pulse" />
                </div>
              }
            >
              <HeroActionArea />
            </Suspense>
          </div>
        </section>

        {/* Architecture Highlights */}
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-8">
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Built for Security &amp; Speed
            </h2>
            <p className="text-sm text-muted-foreground">
              Every authentication flow and protected boundary is engineered with strict session isolation and cached validation.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {platformHighlights.map((item) => {
              const Icon = item.icon;
              return (
                <Card
                  key={item.title}
                  className="transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                >
                  <CardHeader>
                    <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center mb-2">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription className="leading-relaxed">
                      {item.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Customer / User Pages Explorer */}
        <section className="border-t border-border bg-muted/20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-14 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
                  <ShieldCheck className="h-4 w-4" />
                  Customer Portal Routes
                </span>
                <h2 className="text-2xl font-bold tracking-tight text-foreground">
                  Explore Protected User Pages
                </h2>
                <p className="text-sm text-muted-foreground max-w-xl">
                  Test authentication redirects and customer isolation directly. Guests visiting these pages are redirected cleanly to sign in with callback support.
                </p>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link href="/workspace">
                  <span>Open Workspace</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {userPagesPreview.map((page) => {
                const Icon = page.icon;
                return (
                  <Card
                    key={page.href}
                    className="flex flex-col justify-between transition-all duration-300 hover:-translate-y-1 hover:shadow-lg dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="size-9 rounded-lg bg-primary/10 text-primary grid place-items-center">
                          <Icon className="h-4 w-4" />
                        </div>
                        <span className="inline-flex items-center rounded-full border border-border bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {page.badge}
                        </span>
                      </div>
                      <CardTitle className="text-base">{page.title}</CardTitle>
                      <CardDescription className="text-xs leading-relaxed">
                        {page.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button asChild variant="outline" size="sm" className="w-full justify-between">
                        <Link href={page.href}>
                          <span className="font-mono text-xs">{page.href}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-card/50 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>&copy; 2026 rareviewit. Built with Next.js App Router &amp; Prisma.</p>
          <p>Use the palette button in the bottom-right corner to switch themes live.</p>
        </div>
      </footer>
    </div>
  );
}
