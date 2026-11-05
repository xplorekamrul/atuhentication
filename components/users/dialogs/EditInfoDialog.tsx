"use client";

import { updateUserInfo } from "@/actions/users/update-user-info";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; name: string | null; email: string; userType?: "ADMIN" | "USER" };
  onSaved: () => void;
};

export default function EditInfoDialog({ open, onOpenChange, user, onSaved }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    setName(user.name ?? "");
    setEmail(user.email);
    setServerError(null);
  }, [user, open]);

  const { executeAsync, result, status } = useAction(updateUserInfo);
  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { name: errs?.name?.[0], email: errs?.email?.[0] };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const res = await executeAsync({ id: user.id, userType: user.userType, name, email });
    if (res?.data?.ok) {
      toast.success("User info updated successfully");
      onSaved();
      onOpenChange(false);
    } else {
      const errorMsg = res?.data?.message ?? res?.serverError ?? "Failed to update user info";
      setServerError(errorMsg);
      toast.error(errorMsg);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4 text-left">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Edit Info</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (serverError) setServerError(null);
              }}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name ? <p className="text-xs text-destructive mt-1">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (serverError) setServerError(null);
              }}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email ? <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p> : null}
          </div>
          {serverError ? <p className="text-sm text-destructive">{serverError}</p> : null}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-md border border-border px-3 py-2 text-sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={status === "executing"}
            className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
          >
            {status === "executing" ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
