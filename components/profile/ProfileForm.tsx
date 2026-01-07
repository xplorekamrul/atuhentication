"use client";

import { updateProfile } from "@/actions/user/profile";
import { Button } from "@/components/ui/button";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type Props = {
   user: {
      name: string;
      email: string;
      username: string;
   };
};

export default function ProfileForm({ user }: Props) {
   const { executeAsync, status } = useAction(updateProfile);
   const [form, setForm] = useState(user);
   const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

   const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      const res = await executeAsync(form);

      if (res?.data?.ok) {
         setMsg({ type: "success", text: "Profile updated successfully." });
      } else {
         setMsg({ type: "error", text: res?.data?.message || res?.serverError || "Failed to update" });
      }
   };

   return (
      <form onSubmit={onSubmit} className="space-y-4 max-w-md border p-6 rounded-lg bg-card">
         <h2 className="text-xl font-semibold">Profile Settings</h2>

         <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <input
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.name}
               onChange={(e) => setForm({ ...form, name: e.target.value })}
               required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <input
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.username}
               onChange={(e) => setForm({ ...form, username: e.target.value })}
               required
            />
         </div>

         <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <input
               type="email"
               className="w-full rounded-md border bg-background px-3 py-2 text-sm"
               value={form.email}
               onChange={(e) => setForm({ ...form, email: e.target.value })}
               required
            />
         </div>

         {msg && (
            <p className={`text-sm ${msg.type === "success" ? "text-green-600" : "text-red-600"}`}>
               {msg.text}
            </p>
         )}

         <Button type="submit" disabled={status === "executing"}>
            {status === "executing" ? "Saving..." : "Update Profile"}
         </Button>
      </form>
   );
}
