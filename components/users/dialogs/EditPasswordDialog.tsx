"use client";

import { useMemo, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { updateUserPassword } from "@/actions/users/update-user-password";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  onSaved: () => void;
};

export default function EditPasswordDialog({ open, onOpenChange, userId, onSaved }: Props) {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);

  const { executeAsync, status, result } = useAction(updateUserPassword);
  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { password: errs?.password?.[0], confirm: errs?.confirm?.[0] };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await executeAsync({ id: userId, password: pw, confirm });
    if (res?.data?.ok) {
      onSaved();
      onOpenChange(false);
      setPw(""); setConfirm("");
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Edit Password</h3>

        <div className="space-y-3">
          <div className="relative">
            <label className="text-sm">New password</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background pl-3 pr-10 py-2"
              type={show1 ? "text" : "password"}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              aria-invalid={!!fieldErrors.password}
            />
            <button type="button" onClick={() => setShow1(v => !v)} className="absolute right-2 top-8 p-1">
              {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
          </div>

          <div className="relative">
            <label className="text-sm">Confirm password</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background pl-3 pr-10 py-2"
              type={show2 ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              aria-invalid={!!fieldErrors.confirm}
            />
            <button type="button" onClick={() => setShow2(v => !v)} className="absolute right-2 top-8 p-1">
              {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {fieldErrors.confirm ? <p className="text-xs text-destructive">{fieldErrors.confirm}</p> : null}
          </div>
        </div>

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
