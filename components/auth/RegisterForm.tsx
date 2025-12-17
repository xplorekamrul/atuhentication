"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { register } from "@/actions/auth/register";
import { signIn } from "next-auth/react";
import { Eye, EyeOff } from "lucide-react";
import type { RegisterValues } from "@/lib/validations/auth";

export default function RegisterForm() {
  const { executeAsync, status, result } = useAction(register);
  const [form, setForm] = useState<RegisterValues>({ name: "", email: "", password: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [showPw, setShowPw] = useState(false);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return {
      name: errs?.name?.[0],
      email: errs?.email?.[0],
      password: errs?.password?.[0],
    };
  }, [result]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const res = await executeAsync(form);

    if (res?.data?.ok) {
      const loginRes = await signIn("credentials", {
        redirect: false,
        email: form.email,
        password: form.password,
      });
      if (!loginRes?.error) {
        window.location.href = "/";
      } else {
        setFormError(loginRes.error || "Login failed after registration.");
      }
    } else {
      setFormError(res?.data?.message ?? res?.serverError ?? null);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium text-foreground">
          Full name
        </label>
        <input
          id="name"
          required
          value={form.name}
          onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
          className="
            w-full rounded-lg border border-border bg-background px-3 py-2
            text-foreground placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-sidebar-ring
          "
          placeholder="Jane Doe"
          aria-invalid={!!fieldErrors.name}
          aria-describedby={fieldErrors.name ? "name-error" : undefined}
        />
        {fieldErrors.name ? (
          <p id="name-error" className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

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
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            value={form.password}
            onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))}
            className="
              w-full rounded-lg border border-border bg-background pl-3 pr-11 py-2
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-sidebar-ring
            "
            placeholder="At least 6 characters"
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
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4A4 4 0 008 12H4z"/>
            </svg>
            Creating…
          </span>
        ) : (
          "Create account"
        )}
      </button>

      <p className="text-sm text-center text-muted-foreground">
        Already have an account?{" "}
        <a href="/login" className="underline decoration-dotted text-linkcolor hover:text-hcolor">
          Login
        </a>
      </p>
    </form>
  );
}
