"use client";

import { Button } from "@/components/ui/button";
import { ModeToggle } from "@/components/ui/mode-toggle";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import clsx from "clsx";
import {
  ChevronLeft,
  Gauge,
  HelpCircle,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  Wrench,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

type Role = "DEVELOPER" | "SUPER_ADMIN" | "ADMIN";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

const commonNav: Item[] = [{ label: "Home", href: "/", icon: Home }];

const roleNav: Record<Role, Item[]> = {
  DEVELOPER: [{ label: "Dev Tools", href: "/dev/tools", icon: Wrench }],
  SUPER_ADMIN: [
    { label: "Super Dashboard", href: "/super-admin/overview", icon: Gauge },
    { label: "Users", href: "/super-admin/users", icon: Users },
  ],
  ADMIN: [
    { label: "Admin Panel", href: "/admin", icon: LayoutDashboard },
    { label: "Settings", href: "/settings", icon: Settings },
  ],
};

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: (next: boolean) => void;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const role = (user?.role as Role | undefined) ?? undefined;
  const pathname = usePathname();

  const items = [...commonNav, ...(role ? roleNav[role] ?? [] : [])];

  // Persist collapsed state
  useEffect(() => {
    localStorage.setItem("_sidebar_collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  const maybeWrapWithTooltip = (child: React.ReactNode, text: string) => {
    if (!collapsed) return child;
    return (
      <Tooltip>
        <TooltipTrigger asChild>{child}</TooltipTrigger>
        <TooltipContent
          side="right"
          className="bg-primary/80 text-white backdrop-blur-sm border border-white/20"
        >
          <span>{text}</span>
        </TooltipContent>
      </Tooltip>
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: "/login" });
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={clsx(
          "sticky top-0 h-dvh shrink-0 border-r border-border bg-primary/80 backdrop-blur",
          "transition-[width] duration-300 ease-in-out",
          "w-(--sb-w)"
        )}
        aria-label="Sidebar"
      >
        {/* Header */}
        <div className="flex h-14 items-center justify-between px-2">
          <div
            className={clsx(
              "flex items-center gap-2 overflow-hidden transition-opacity",
              collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <span className="ml-2 font-semibold text-white">Hr Plus</span>
          </div>

          <div className="flex items-center gap-1">
            {!collapsed && <ModeToggle className="text-white hover:bg-white/20 h-8 w-8" />}
            <Button
              variant="ghost"
              size="icon"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => onToggle(!collapsed)}
              className="h-8 w-8 text-white"
            >
              {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* User */}
        {user && (
          <div className={clsx("flex items-center gap-2 p-2", collapsed ? "justify-center" : "")}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs text-primary font-semibold">
              {initials(user.name, user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.name ?? user.email}</p>
                <p className="truncate text-[11px] text-gray-200/80">{user.email}</p>
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <nav className="mt-2 flex flex-col gap-1 px-2 mb-2">
          {items.map((it) => {
            const Icon = it.icon;
            const isActive = pathname === it.href;
            const link = (
              <Link
                key={it.href}
                href={it.href}
                className={clsx(
                  "group inline-flex items-center gap-3 rounded-md px-2 py-2 text-sm w-full font-medium transition-colors ",
                  "hover:bg-white/20 text-white/90",
                  isActive && "bg-white/20 border border-white/20",
                  collapsed ? "justify-center" : "justify-start"
                )}
                aria-label={it.label}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">{it.label}</span>}
              </Link>
            );

            return <div key={it.href}>{maybeWrapWithTooltip(link, it.label)}</div>;
          })}
        </nav>

        {/* Footer */}
        <div className="mt-auto border-t border-border p-2 flex flex-col gap-2">
          {user &&
            maybeWrapWithTooltip(
              <button
                onClick={handleSignOut}
                className={clsx(
                  "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white hover:bg-white/20 transition w-full",
                  collapsed ? "justify-center" : "justify-start"
                )}
                aria-label="Sign out"
              >
                <LogOut className="h-4 w-4" />
                {!collapsed && <span>Sign out</span>}
              </button>,
              "Sign out"
            )}

          {maybeWrapWithTooltip(
            <Link
              href="/help"
              className={clsx(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white hover:bg-white/20 transition",
                collapsed ? "justify-center" : "justify-start"
              )}
              aria-label="Help / Docs"
            >
              <HelpCircle className="h-4 w-4" />
              {!collapsed && <span>Help / Docs</span>}
            </Link>,
            "Help "
          )}
        </div>
      </aside>
    </TooltipProvider >
  );
}
