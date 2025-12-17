"use client";

import { useState, useMemo, useEffect } from "react";
import { useAction } from "next-safe-action/hooks";
import { updateUserInfo } from "@/actions/users/update-user-info";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: { id: string; name: string | null; email: string };
  onSaved: () => void;
};

export default function EditInfoDialog({ open, onOpenChange, user, onSaved }: Props) {
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  useEffect(() => { setName(user.name ?? ""); setEmail(user.email); }, [user]);

  const { executeAsync, result, status } = useAction(updateUserInfo);
  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { name: errs?.name?.[0], email: errs?.email?.[0] };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await executeAsync({ id: user.id, name, email });
    if (res?.data?.ok) {
      onSaved();
      onOpenChange(false);
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Edit Info</h3>
        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!fieldErrors.name}
            />
            {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!fieldErrors.email}
            />
            {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
          </div>
        </div>

        {result?.data && !result.data.ok ? (
          <p className="mt-2 text-sm text-destructive">{result.data.message ?? "Update failed"}</p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={() => onOpenChange(false)} className="px-3 py-2 rounded-md border">
            Cancel
          </button>
          <button disabled={status === "executing"} className="px-3 py-2 rounded-md bg-pcolor text-white">
            Save
          </button>
        </div>
      </form>
    </div>
  );
}
