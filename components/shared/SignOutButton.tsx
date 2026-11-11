"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface SignOutButtonProps {
  redirectTo?: string;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function SignOutButton({
  redirectTo = "/login",
  variant = "outline",
  size = "sm",
  className = "",
}: SignOutButtonProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [pending, setPending] = useState(false);

  async function handleSignOut() {
    setPending(true);
    try {
      const userId = session?.user?.id;
      if (userId && typeof window !== "undefined") {
        sessionStorage.removeItem(`_cached_sidebar_routes_${userId}`);
      }
      await signOut({ redirect: false, callbackUrl: redirectTo });
      router.push(redirectTo);
      router.refresh();
    } catch {
      router.push(redirectTo);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      disabled={pending}
      onClick={handleSignOut}
      className={className}
    >
      <LogOut className="h-4 w-4" />
      <span>{pending ? "Signing out..." : "Sign out"}</span>
    </Button>
  );
}

