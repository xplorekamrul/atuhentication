"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Database, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type CacheMode = "redis" | "memory-fallback";

interface ClearButtonProps {
  onCleared?: (nextMode: CacheMode) => void;
}

export default function ClearRedisCacheButton({ onCleared }: ClearButtonProps) {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClearCache() {
    if (isClearing) return;
    setIsClearing(true);

    try {
      const res = await fetch("/api/admin/cache/invalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeRateLimits: true }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        mode?: CacheMode;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to clear Redis cache.");
        return;
      }

      try {
        for (let i = sessionStorage.length - 1; i >= 0; i--) {
          const key = sessionStorage.key(i);
          if (key?.startsWith("_cached_sidebar_routes_")) {
            sessionStorage.removeItem(key);
          }
        }
        window.dispatchEvent(new Event("rbac-permissions-updated"));
      } catch {
        // Ignore storage/event errors
      }

      onCleared?.(data.mode ?? "redis");
      toast.success(data.message || "Redis cache cleared successfully.");
      router.refresh();
    } catch {
      toast.error("Network error while clearing Redis cache.");
    } finally {
      setIsClearing(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={handleClearCache}
      disabled={isClearing}
      className="gap-2 cursor-pointer shrink-0 border-destructive/40 bg-destructive/5 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-all active:scale-95 shadow-xs"
    >
      {isClearing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Clearing...</span>
        </>
      ) : (
        <>
          <Trash2 className="h-4 w-4" />
          <span>Clear Redis Cache</span>
        </>
      )}
    </Button>
  );
}

export function RedisCacheControlCard({
  initialConnected,
  initialMode,
  initialKeyCount,
}: {
  initialConnected: boolean;
  initialMode: CacheMode;
  initialKeyCount: number;
}) {
  const [connected, setConnected] = useState(initialConnected);
  const [mode, setMode] = useState<CacheMode>(initialMode);
  const [keyCount, setKeyCount] = useState(initialKeyCount);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function refreshStats() {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/admin/cache/invalidate", {
        method: "GET",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        connected?: boolean;
        mode?: CacheMode;
        cacheKeyCount?: number;
      };
      if (res.ok && data.ok) {
        setConnected(Boolean(data.connected));
        if (data.mode) setMode(data.mode);
        if (typeof data.cacheKeyCount === "number") setKeyCount(data.cacheKeyCount);
      }
    } catch {
      // Ignore transient refresh failure
    } finally {
      setIsRefreshing(false);
    }
  }

  const isLive = connected && mode === "redis";

  return (
    <Card className="p-5 sm:p-6 bg-card border-border shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary border border-primary/20">
            <Database className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-card-foreground">
                Redis Cache &amp; Rate-Limit Store
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border ${
                  isLive
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-muted text-muted-foreground border-border"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isLive ? "bg-primary" : "bg-muted-foreground"
                  }`}
                />
                {isLive ? "Redis Live" : "Fallback Mode"} &middot; {keyCount}{" "}
                {keyCount === 1 ? "key" : "keys"}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Flush all cached RBAC permissions, themes, and active rate-limit keys after
              deploying new production updates.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={refreshStats}
            disabled={isRefreshing}
            aria-label="Refresh Redis key count"
            className="text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
          <ClearRedisCacheButton
            onCleared={(nextMode) => {
              setMode(nextMode);
              setConnected(nextMode === "redis");
              setKeyCount(0);
            }}
          />
        </div>
      </div>
    </Card>
  );
}
