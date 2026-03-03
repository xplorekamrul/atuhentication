"use client";

import { getFilteredSidebarRoutes } from "@/actions/sidebar/get-filtered-routes";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import clsx from "clsx";
import {
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  HelpCircle,
  Home,
  LogOut,
  Menu,
  ShieldAlert,
  Users
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Item = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type Group = {
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: Item[];
};

type LocalNavNode = Item | Group;

function isGroup(n: LocalNavNode): n is Group {
  return (n as Group).children !== undefined;
}

function initials(name?: string | null, email?: string | null) {
  const base = (name || email || "U").trim();
  const parts = base.split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "U";
}

// Hardcoded navigation structure with icons
const hardcodedNav: LocalNavNode[] = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "RBAC", href: "/admin/rbac", icon: ShieldAlert },
];

/**
 * Reconstruct navigation with icons from hardcoded data
 */
function reconstructWithIcons(filteredData: any[]): LocalNavNode[] {
  return filteredData
    .map((node) => {
      if ("children" in node) {
        // Find matching group in hardcoded nav
        const hardcodedGroup = hardcodedNav.find(
          (n) => isGroup(n) && n.label === node.label
        ) as Group | undefined;
        if (!hardcodedGroup) return null;

        return {
          label: node.label,
          icon: hardcodedGroup.icon,
          children: node.children.map((child: any) => {
            const hardcodedChild = hardcodedGroup.children.find(
              (c) => c.href === child.href
            );
            return {
              label: child.label,
              href: child.href,
              icon: hardcodedChild?.icon || Home,
            };
          }),
        };
      }

      // Find matching item in hardcoded nav
      const hardcodedItem = hardcodedNav.find(
        (n) => !isGroup(n) && n.href === node.href
      ) as Item | undefined;
      return {
        label: node.label,
        href: node.href,
        icon: hardcodedItem?.icon || Home,
      };
    })
    .filter((n): n is LocalNavNode => n !== null);
}

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
  const pathname = usePathname();
  const [items, setItems] = useState<LocalNavNode[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [noRoutesInDatabase, setNoRoutesInDatabase] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Fetch and filter routes based on permissions
  useEffect(() => {
    async function loadFilteredRoutes() {
      try {
        setIsLoading(true);
        // Pass only the data (without icons) to server action
        const hardcodedNavData = hardcodedNav.map((node) => {
          if (isGroup(node)) {
            return {
              label: node.label,
              children: node.children.map((child) => ({
                label: child.label,
                href: child.href,
              })),
            };
          }
          return {
            label: node.label,
            href: node.href,
          };
        });

        const result = await getFilteredSidebarRoutes(hardcodedNavData);
        console.log('[Sidebar] Filtered routes result:', result);

        setNoRoutesInDatabase(result.noRoutesInDatabase);

        // Reconstruct with icons on client side
        const reconstructed = reconstructWithIcons(result.routes);
        console.log('[Sidebar] Reconstructed routes:', reconstructed);

        // Use exactly what the server returned - no fallback
        setItems(reconstructed);
      } catch (error) {
        console.error("[Sidebar] Failed to load filtered routes:", error);
        // On error, show empty sidebar
        setItems([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (user) {
      loadFilteredRoutes();
    }
  }, [user]);

  // Update open groups based on pathname
  useEffect(() => {
    const next: Record<string, boolean> = {};
    items.forEach((n) => {
      if (isGroup(n)) {
        next[n.label] = n.children.some((c) => pathname.startsWith(c.href));
      }
    });
    setOpenGroups((prev) => ({ ...prev, ...next }));
  }, [pathname, items]);

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
          "flex flex-col"
        )}
        aria-label="Sidebar"
      >
        {/* Header - Fixed */}
        <div className="flex h-14 items-center justify-between px-2 flex-shrink-0">
          <div
            className={clsx(
              "flex items-center gap-2 overflow-hidden transition-opacity",
              collapsed ? "opacity-0 pointer-events-none" : "opacity-100"
            )}
          >
            <div className="w-28 mx-auto">
              <img src="/whiteLogo.png" alt="Logo" />
            </div>
          </div>
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

        {/* User - Fixed */}
        {user && (
          <Link
            href="/profile"
            className={clsx(
              "flex items-center gap-2 p-2 flex-shrink-0 rounded-md hover:bg-white/10 transition-colors",
              collapsed ? "justify-center" : ""
            )}
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs text-primary font-semibold">
              {initials(user.name, user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.name ?? user.email}</p>
                <p className="truncate text-[11px] text-gray-200/80">{user.email}</p>
              </div>
            )}
          </Link>
        )}

        {/* Nav - Scrollable */}
        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 min-h-0"
          ref={navRef}
        >
          <style>{`nav::-webkit-scrollbar {
            width: 6px;
          }
          nav::-webkit-scrollbar-track {
            background: transparent;
          }
          nav::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.3);
            border-radius: 3px;
          }
          nav::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.5);
          }`}</style>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-8 bg-white/10 rounded animate-pulse" />
              ))}
            </div>
          ) : noRoutesInDatabase ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <ShieldAlert className="h-8 w-8 text-white/40 mb-3" />
              <p className="text-sm text-white/60">No routes available in database</p>
              <p className="text-xs text-white/40 mt-1">Contact administrator to configure routes</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
              <ShieldAlert className="h-8 w-8 text-white/40 mb-3" />
              <p className="text-sm text-white/60">No access to any routes</p>
              <p className="text-xs text-white/40 mt-1">Contact administrator to assign permissions</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              {/* Home Button */}
              <Link
                href="/admin"
                className={clsx(
                  "group inline-flex items-center gap-3 rounded-md px-2 py-2 text-sm w-full font-medium transition-colors",
                  "hover:bg-white/20 text-white/90",
                  pathname === "/admin" && "bg-white/20 border border-white/20",
                  collapsed ? "justify-center" : "justify-start"
                )}
                aria-label="Home"
              >
                <Home className="h-5 w-5 shrink-0" />
                {!collapsed && <span className="truncate">Home</span>}
              </Link>

              {/* Navigation Items */}
              {items.map((node) => {
                if (!isGroup(node)) {
                  const Icon = node.icon;
                  const isActive = pathname === node.href;
                  const link = (
                    <Link
                      key={node.href}
                      href={node.href}
                      className={clsx(
                        "group inline-flex items-center gap-3 rounded-md px-2 py-2 text-sm w-full font-medium transition-colors",
                        "hover:bg-white/20 text-white/90",
                        isActive && "bg-white/20 border border-white/20",
                        collapsed ? "justify-center" : "justify-start"
                      )}
                      aria-label={node.label}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{node.label}</span>}
                    </Link>
                  );
                  return (
                    <div key={`item-${node.href}-${node.label}`}>
                      {maybeWrapWithTooltip(link, node.label)}
                    </div>
                  );
                }

                // Group rendering
                const GIcon = node.icon;
                const open = !!openGroups[node.label];
                const toggle = () => {
                  setOpenGroups((prev) => ({ ...prev, [node.label]: !prev[node.label] }));
                  // Auto-scroll to show children when opening
                  if (!open && !collapsed) {
                    setTimeout(() => {
                      const groupElement = document.getElementById(`group-${node.label}`);
                      if (groupElement && navRef.current) {
                        groupElement.scrollIntoView({ behavior: "smooth", block: "nearest" });
                      }
                    }, 0);
                  }
                };

                const groupIsActive = node.children.some((c) => pathname.startsWith(c.href));
                const groupButton = (
                  <button
                    key={node.label}
                    onClick={toggle}
                    className={clsx(
                      "group inline-flex items-center gap-3 rounded-md px-2 py-2 text-sm w-full font-medium transition-colors",
                      "hover:bg-white/20 text-white/90 cursor-pointer",
                      groupIsActive && "bg-white/20 border border-white/20",
                      collapsed ? "justify-center" : "justify-between"
                    )}
                    aria-expanded={open}
                    aria-controls={`group-${node.label}`}
                  >
                    <div className={clsx("flex items-center", collapsed ? "" : "gap-3")}>
                      <GIcon className="h-5 w-5 shrink-0" />
                      {!collapsed && <span className="truncate">{node.label}</span>}
                    </div>
                    {!collapsed && (open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />)}
                  </button>
                );

                return (
                  <div key={`group-${node.label}`} className="w-full">
                    {maybeWrapWithTooltip(groupButton, node.label)}
                    {/* Children */}
                    {!collapsed && open && (
                      <div id={`group-${node.label}`} className="mt-1 ml-6 flex flex-col gap-1">
                        {node.children.map((child) => {
                          const CIcon = child.icon;
                          const isActive = pathname === child.href;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              className={clsx(
                                "inline-flex items-center gap-3 rounded-md px-2 py-2 text-sm w-full font-medium transition-colors",
                                "hover:bg-white/20 text-white/90",
                                isActive && "bg-white/20 border border-white/20"
                              )}
                              aria-label={`${node.label} → ${child.label}`}
                            >
                              <CIcon className="h-4 w-4 shrink-0" />
                              <span className="truncate">{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </nav>

        {/* Footer - Fixed */}
        <div className="border-t border-border p-2 flex flex-col gap-2 flex-shrink-0">
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
              href="/admin/help"
              className={clsx(
                "flex items-center gap-2 rounded-md px-2 py-2 text-sm text-white hover:bg-white/20 transition",
                collapsed ? "justify-center" : "justify-start"
              )}
              aria-label="Help / Docs"
            >
              <HelpCircle className="h-4 w-4" />
              {!collapsed && <span>Help / Docs</span>}
            </Link>,
            "Help"
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
