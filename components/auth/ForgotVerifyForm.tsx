"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { verifyResetOtp } from "@/actions/auth/forgot/verify-otp";

export default function ForgotVerifyForm({ defaultEmail = "" }: { defaultEmail?: string }) {
  const { executeAsync, status, result } = useAction(verifyResetOtp);
  const [email, setEmail] = useState(defaultEmail);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { email: errs?.email?.[0], code: errs?.code?.[0] };
  }, [result]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const res = await executeAsync({ email, code });
    if (res?.data?.ok) {
      // go to reset page 
      window.location.href = "/forgot/reset";
    } else {
      setErr(res?.data?.message ?? res?.serverError ?? "Verification failed.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
        <input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
          placeholder="you@example.com"
          aria-invalid={!!fieldErrors.email}
          aria-describedby={fieldErrors.email ? "email-error" : undefined}
        />
        {fieldErrors.email ? <p id="email-error" className="text-xs text-destructive">{fieldErrors.email}</p> : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="code" className="text-sm font-medium text-foreground">6-digit code</label>
        <input
          id="code"
          inputMode="numeric"
          pattern="[0-9]*"
          minLength={6}
          maxLength={6}
          required
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 tracking-widest text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-sidebar-ring"
          placeholder="••••••"
          aria-invalid={!!fieldErrors.code}
          aria-describedby={fieldErrors.code ? "code-error" : undefined}
        />
        {fieldErrors.code ? <p id="code-error" className="text-xs text-destructive">{fieldErrors.code}</p> : null}
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}

      <button
        type="submit"
        disabled={status === "executing"}
        className="w-full rounded-lg bg-pcolor text-white py-2.5 hover:bg-scolor transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sidebar-ring"
      >
        {status === "executing" ? "Verifying…" : "Verify"}
      </button>
    </form>
  );
}
