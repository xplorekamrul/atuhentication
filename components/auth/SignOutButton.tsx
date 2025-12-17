"use client";

import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { Button } from "../ui/button";

export default function SignOutButton() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false, callbackUrl: "/login" });
      router.push("/login"); 
    } catch (e) {
      router.push("/login");
    }
  };

  return (
    <Button
      type="button"
      onClick={handleSignOut}
      className="block w-full rounded-md px-2 py-2 text-left text-destructive hover:bg-destructive/10"
    >
      Sign out
    </Button>
  );
}
