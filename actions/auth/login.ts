"use server";

import { actionClient } from "@/lib/safe-action/clients";
import { loginSchema } from "@/lib/validations/auth";

/**
 * Direct RPC login via server action is disabled for security reasons.
 * All credentials authentication is handled securely through NextAuth (/api/auth/[...nextauth])
 * which enforces rate-limiting, brute-force exponential lockouts, and session versioning.
 */
export const login = actionClient
  .schema(loginSchema)
  .action(async () => {
    return {
      ok: false as const,
      message: "Direct login action is disabled for security. Please use the login page.",
    };
  });
