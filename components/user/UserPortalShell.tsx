"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { CreditCard, Home, LayoutDashboard, ShoppingBag, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const userNavLinks = [
  { label: "Home", href: "/", icon: Home },
  { label: "Workspace", href: "/workspace", icon: LayoutDashboard },
  { label: "Orders", href: "/orders", icon: ShoppingBag },
  { label: "Billing", href: "/billing", icon: CreditCard },
  { label: "Profile", href: "/profile", icon: User },
];

export function UserPortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg tracking-tight text-foreground hover:text-primary transition-colors"
            >
              <span className="size-8 rounded-lg bg-primary text-primary-foreground grid place-items-center text-sm font-bold shadow-sm">
                R
              </span>
              <span>rareviewit</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {userNavLinks.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Button
                    key={item.href}
                    asChild
                    variant={active ? "secondary" : "ghost"}
                    size="sm"
                    className={
                      active
                        ? "bg-primary/10 text-primary hover:bg-primary/15"
                        : "text-muted-foreground hover:text-foreground"
                    }
                  >
                    <Link href={item.href}>
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </Link>
                  </Button>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ModeToggle />
            <SignOutButton redirectTo="/login" />
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="md:hidden border-t border-border/60 px-4 py-2 flex items-center gap-1 overflow-x-auto">
          {userNavLinks.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Button
                key={item.href}
                asChild
                variant={active ? "secondary" : "ghost"}
                size="sm"
                className={
                  active
                    ? "bg-primary/10 text-primary shrink-0"
                    : "text-muted-foreground shrink-0"
                }
              >
                <Link href={item.href}>
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </Link>
              </Button>
            );
          })}
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        {children}
      </main>
    </div>
  );
}

