"use client";

import { changePassword } from "@/actions/user/profile";
import { Button } from "@/components/ui/button";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

export default function PasswordForm() {
   const { executeAsync, status } = useAction(changePassword);
   const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirmPassword: "" });
   const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

   const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      const res = await executeAsync(form);

      if (res?.data?.ok) {
         setMsg({ type: "success", text: "Password changed successfully." });
         setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
      } else {
         setMsg({ type: "error", text: res?.data?.message || res?.serverError || "Failed to change password" });
      }
   };

   return (
      <form onSubmit={onSubmit} className="space-y-4 max-w-md border p-6 rounded-lg bg-card">
         <h2 className="text-xl font-semibold">Change Password</h2>

         <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <input
               type="password"
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.oldPassword}
               onChange={(e) => setForm({ ...form, oldPassword: e.target.value })}
               required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <input
               type="password"
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.newPassword}
               onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
               required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <input
               type="password"
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.confirmPassword}
               onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
               required
            />
         </div>

         {msg && (
            <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>
               {msg.text}
            </p>
         )}

         <Button type="submit" disabled={status === "executing"}>
            {status === "executing" ? "Changing..." : "Change Password"}
         </Button>
      </form>
   );
}
