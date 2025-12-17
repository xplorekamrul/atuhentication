"use client";

import { useMemo, useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { resetPassword } from "@/actions/auth/forgot/reset-password";
import { Eye, EyeOff } from "lucide-react";

export default function ForgotResetForm() {
  const { executeAsync, status, result } = useAction(resetPassword);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // local  field errors
  const [localErrors, setLocalErrors] = useState<{ password?: string; confirm?: string }>({});

  // server-side errors (next-safe-action)
  const zodFieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { password: errs?.password?.[0], confirm: errs?.confirm?.[0] };
  }, [result]);

  // merge local error  over zod error for display
  const fieldErrors = {
    password: localErrors.password ?? zodFieldErrors.password,
    confirm: localErrors.confirm ?? zodFieldErrors.confirm,
  };

  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  function validate(): boolean {
    const next: typeof localErrors = {};
    if (!password || password.length < 6) {
      next.password = "At least 6 characters";
    }
    if (confirm !== password) {
      next.confirm = "Passwords do not match";
    }
    setLocalErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);

    if (!validate()) {
      setErr("Please perfectly match the passwords and try again.");
      return;
    }

    const res = await executeAsync({ password, confirm });
    if (res?.data?.ok) {
      setMsg("Password updated. You can now sign in.");
      setTimeout(() => {
        window.location.href = "/login";
      }, 800);
    } else {
      setErr(res?.data?.message ?? res?.serverError ?? "Unable to reset password.");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          New password
        </label>
        <div className="relative">
          <input
            id="password"
            type={showPw ? "text" : "password"}
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              // live-clear the local error while typing
              if (localErrors.password) {
                setLocalErrors((s) => ({ ...s, password: undefined }));
              }
            }}
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
          <p id="password-error" className="text-xs text-destructive">
            {fieldErrors.password}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <label htmlFor="confirm" className="text-sm font-medium text-foreground">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="confirm"
            type={showConfirm ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (localErrors.confirm) {
                setLocalErrors((s) => ({ ...s, confirm: undefined }));
              }
            }}
            className="
              w-full rounded-lg border border-border bg-background pl-3 pr-11 py-2
              text-foreground placeholder:text-muted-foreground
              focus:outline-none focus:ring-2 focus:ring-sidebar-ring
            "
            placeholder="Repeat the password"
            aria-invalid={!!fieldErrors.confirm}
            aria-describedby={fieldErrors.confirm ? "confirm-error" : undefined}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="
              absolute inset-y-0 right-2 my-auto inline-flex h-8 w-8 items-center justify-center
              rounded-md text-muted-foreground hover:text-hcolor
              focus:outline-none focus:ring-2 focus:ring-sidebar-ring
            "
            aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
            title={showConfirm ? "Hide confirm password" : "Show confirm password"}
          >
            {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {fieldErrors.confirm ? (
          <p id="confirm-error" className="text-xs text-destructive">
            {fieldErrors.confirm}
          </p>
        ) : null}
      </div>

      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {msg ? <p className="text-sm text-green-600">{msg}</p> : null}

      <button
        type="submit"
        disabled={status === "executing"}
        className="w-full rounded-lg bg-pcolor text-white py-2.5 hover:bg-scolor transition-colors disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sidebar-ring"
      >
        {status === "executing" ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
