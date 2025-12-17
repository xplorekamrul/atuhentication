"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAction } from "next-safe-action/hooks";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/actions/auth/login";
import type { LoginValues } from "@/lib/validations/auth";

type Role = "DEVELOPER" | "SUPER_ADMIN" | "ADMIN" | "USER";

// map roles to landing routes
const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/super-admin",
  DEVELOPER: "/developer",
  ADMIN: "/admin",
  USER: "/", // fallback for regular users; tweak if you have a /user home
};

export default function LoginForm({ callbackUrl = "/" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<LoginValues>({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const { executeAsync, status, result } = useAction(login);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return {
      email: errs?.email?.[0],
      password: errs?.password?.[0],
    };
  }, [result]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1) Server-side validation + password check first
    const precheck = await executeAsync(form);
    if (!precheck?.data?.ok) {
      setFormError(precheck?.data?.message ?? precheck?.serverError ?? "Unable to sign in.");
      return;
    }

    // 2) Compute target route by role
    const role = (precheck.data.user.role || "USER") as Role;
    const target = ROLE_HOME[role] ?? callbackUrl ?? "/";

    // 3) Create session via NextAuth (no auto-redirect)
    const res = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
      // pass target along so NextAuth knows intended URL (useful if you later enable redirect)
      callbackUrl: target,
    });

    if (res?.error) {
      setFormError(res.error || "Sign-in failed.");
      return;
    }

    // 4) Client-side redirect to role home
    router.push(target);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          className="
            w-full rounded-lg border border-border bg-background px-3 py-2
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-sidebar-ring
          "
          placeholder="you@example.com"
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email ? (
          <p id="email-error" className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <div>
            <Link
              href="/forgot"
              className="text-sm text-linkcolor hover:text-hcolor underline decoration-dotted"
            >
              Forgot password?
            </Link>
          </div>
        </div>

        <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            className="
              w-full rounded-lg border border-border bg-background pl-3 pr-11 py-2
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-sidebar-ring
            "
            placeholder="••••••••"
            aria-invalid={!!fieldErrors.password}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="
              absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center
              rounded-md text-muted-foreground hover:text-hcolor
              focus:outline-none focus:ring-2 focus:ring-sidebar-ring
            "
            aria-label={showPw ? "Hide password" : "Show password"}
            title={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {fieldErrors.password ? (
          <p id="password-error" className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <button
        type="submit"
        disabled={status === "executing"}
        className="
          w-full inline-flex items-center justify-center gap-2
          rounded-lg bg-pcolor text-white py-2.5
          hover:bg-scolor transition-colors
          disabled:opacity-60
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sidebar-ring
        "
      >
        {status === "executing" ? (
          <span className="inline-flex items-center gap-2">
            <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a 8 8 0 0 1 8-8v4A4 4 0 0 0 8 12H4z" />
            </svg>
            Signing in…
          </span>
        ) : (
          "Sign in"
        )}
      </button>

      <p className="text-sm text-center text-muted-foreground">
        No account?{" "}
        <a href="/register" className="underline decoration-dotted text-linkcolor hover:text-hcolor">
          Register
        </a>
      </p>
    </form>
  );
}
