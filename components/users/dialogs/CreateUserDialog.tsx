"use client";

import { createUser } from "@/actions/users/create-user";
import { Role } from "@prisma/client";
import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

export default function CreateUserDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(Role.ADMIN);
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);

  const { executeAsync, status, result } = useAction(createUser);
  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return {
      name: errs?.name?.[0],
      username: errs?.username?.[0],
      email: errs?.email?.[0],
      role: errs?.role?.[0],
      password: errs?.password?.[0],
    };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await executeAsync({ name, username, email, role, password: pw });
    if (res?.data?.ok) {
      onCreated();
      onOpenChange(false);
      setName(""); setUsername(""); setEmail(""); setRole(Role.ADMIN); setPw("");
    }
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-30 grid place-items-center bg-black/40 p-4">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-background p-4 shadow-xl">
        <h3 className="text-lg font-semibold mb-3">Add User</h3>

        <div className="space-y-3">
          <div>
            <label className="text-sm">Name</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={name} onChange={(e) => setName(e.target.value)} />
            {fieldErrors.name ? <p className="text-xs text-destructive">{fieldErrors.name}</p> : null}
          </div>
          <div>
            <label className="text-sm">Username</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={username} onChange={(e) => setUsername(e.target.value)} />
            {fieldErrors.username ? <p className="text-xs text-destructive">{fieldErrors.username}</p> : null}
          </div>
          <div>
            <label className="text-sm">Email</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {fieldErrors.email ? <p className="text-xs text-destructive">{fieldErrors.email}</p> : null}
          </div>
          <div>
            <label className="text-sm">Role</label>
            <select
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
              value={role} onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ADMIN">ADMIN</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="DEVELOPER">DEVELOPER</option>
            </select>
          </div>
          <div className="relative">
            <label className="text-sm">Password</label>
            <input
              className="mt-1 w-full rounded-md border border-border bg-background pl-3 pr-10 py-2"
              type={show ? "text" : "password"}
              value={pw} onChange={(e) => setPw(e.target.value)}
            />
            <button type="button" onClick={() => setShow(v => !v)} className="absolute right-2 top-8 p-1">
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            {fieldErrors.password ? <p className="text-xs text-destructive">{fieldErrors.password}</p> : null}
          </div>
        </div>

        {result?.data && !result.data.ok ? (
          <p className="mt-2 text-sm text-destructive">{result.data.message ?? "Create failed"}</p>
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
