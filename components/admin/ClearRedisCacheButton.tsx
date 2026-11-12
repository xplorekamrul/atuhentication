"use client";

import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

export default function ClearRedisCacheButton() {
  const router = useRouter();
  const [isClearing, setIsClearing] = useState(false);

  async function handleClearCache() {
    if (isClearing) return;
    setIsClearing(true);

    try {
      const res = await fetch("/api/admin/cache/invalidate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeRateLimits: false }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };

      if (!res.ok || !data.ok) {
        toast.error(data.error || "Failed to clear Redis cache.");
        return;
      }

      // Clear any client-side sidebar route cache and trigger immediate UI sync
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
      variant="destructive"
      size="sm"
      onClick={handleClearCache}
      disabled={isClearing}
      className="gap-2 cursor-pointer shrink-0"
    >
      {isClearing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Clearing Cache...</span>
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

