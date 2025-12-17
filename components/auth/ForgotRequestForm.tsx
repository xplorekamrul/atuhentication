"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { sendResetOtp } from "@/actions/auth/forgot/send-otp";

export default function ForgotRequestForm() {
  const { executeAsync, status, result } = useAction(sendResetOtp);
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const fieldError = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return errs?.email?.[0];
  }, [result]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const res = await executeAsync({ email });
    if (res?.data?.ok) {
      setMsg("If this email exists, we’ve sent a code. Check your inbox.");
      // route to verify page and pass email in query for convenience
      window.location.href = `/forgot/verify?email=${encodeURIComponent(email)}`;
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
          aria-invalid={!!fieldError}
          aria-describedby={fieldError ? "email-error" : undefined}
        />
        {fieldError ? <p id="email-error" className="text-xs text-destructive">{fieldError}</p> : null}
      </div>

      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <button
        type="submit"
        disabled={status === "executing"}
        className="w-full rounded-lg bg-pcolor text-white py-2.5 hover:bg-scolor transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sidebar-ring"
      >
        {status === "executing" ? "Sending…" : "Send code"}
      </button>
    </form>
  );
}
