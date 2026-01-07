"use client";

import { updateProfile } from "@/actions/user/profile";
import { Button } from "@/components/ui/button";
import { Pencil, User as UserIcon, X } from "lucide-react";
import { useSession } from "next-auth/react";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";

type Props = {
   user: {
      name: string;
      email: string;
      username: string;
      image: string | null;
   };
};

export default function ProfileForm({ user }: Props) {
   const { executeAsync, status } = useAction(updateProfile);
   const { update } = useSession();
   const [form, setForm] = useState(user);
   const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
   const [isEditingImage, setIsEditingImage] = useState(!user.image);

   const onSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setMsg(null);
      const res = await executeAsync(form);

      if (res?.data?.ok) {
         await update(); // Refresh session to update sidebar image
         setMsg({ type: "success", text: "Profile updated successfully." });
         setIsEditingImage(false); // Close edit mode on success
      } else {
         setMsg({ type: "error", text: res?.data?.message || res?.serverError || "Failed to update" });
      }
   };

   return (
      <form onSubmit={onSubmit} className="space-y-4 max-w-md border p-6 rounded-lg bg-card h-fit">

         <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative group">
               {form.image ? (
                  <img
                     src={form.image}
                     alt="Profile"
                     className="h-24 w-24 rounded-full object-cover border-2 border-border shadow-sm"
                     onError={(e) => e.currentTarget.style.display = 'none'}
                  />
               ) : (
                  <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center border-2 border-border shadow-sm">
                     <UserIcon className="h-10 w-10 text-muted-foreground" />
                  </div>
               )}

               {!isEditingImage && (
                  <button
                     type="button"
                     onClick={() => setIsEditingImage(true)}
                     className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-md hover:bg-primary/90 transition-colors"
                     title="Edit Image"
                  >
                     <Pencil className="h-3.5 w-3.5" />
                  </button>
               )}
            </div>

            {isEditingImage && (
               <div className="w-full space-y-2 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                     <input
                        className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
                        value={form.image ?? ""}
                        onChange={(e) => setForm({ ...form, image: e.target.value })}
                        placeholder="Paste image URL..."
                        autoFocus
                     />
                     {user.image && (
                        <Button
                           type="button"
                           variant="ghost"
                           size="icon"
                           onClick={() => {
                              setIsEditingImage(false);
                              setForm(prev => ({ ...prev, image: user.image }));
                           }}
                           className="shrink-0"
                           title="Cancel"
                        >
                           <X className="h-4 w-4" />
                        </Button>
                     )}
                  </div>
                  <p className="text-[10px] text-muted-foreground text-center">
                     Paste a direct link to an image (JPG, PNG, GIF)
                  </p>
               </div>
            )}
         </div>
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
