"use client";

import type { LoginValues } from "@/lib/validations/auth";
import { Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm({ callbackUrl = "/dashboard" }: { callbackUrl?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<LoginValues>({ email: "", password: "" });
  const [showPw, setShowPw] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setLoading(true);

    try {
      // 1) Create session via NextAuth
      // We use redirect: false to handle errors in UI, but success leads to manual redirect
      const res = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
        callbackUrl,
      });

      if (res?.error) {
        setFormError("Invalid email or password.");
        setLoading(false);
        return;
      }

      // 2) Client-side redirect to the Dispatcher / Dashboard
      // The dispatcher will handle role-based routing server-side
      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      setFormError("Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email or Username
        </label>
        <input
          id="email"
          type="text"
          autoComplete="username"
          required
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          className="
            w-full rounded-lg border border-border bg-background px-3 py-2
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-sidebar-ring
          "
          placeholder="user@example.com or username"
        />
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
      </div>

      {formError ? <p className="text-sm text-destructive">{formError}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="
          w-full inline-flex items-center justify-center gap-2
          rounded-lg bg-pcolor text-white py-2.5
          hover:bg-scolor transition-colors
          disabled:opacity-60
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sidebar-ring
        "
      >
        {loading ? (
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
