"use client";

import { upsertUserInfo } from "@/actions/user/user-info";
import { Button } from "@/components/ui/button";
import { useAction } from "next-safe-action/hooks";
import { useState } from "react";
// Assuming standard input styles available or basic tailwind

type UserInfoData = {
   dateOfBirth: string | null; // ISO string or null
   phone: string | null;
   gender: string | null;
   address: string | null;
   profession: string | null;
   hobbys: string | null;
};

export default function UserInfoCard({ initialData }: { initialData: UserInfoData }) {
   const [isEditing, setIsEditing] = useState(false);
   const [form, setForm] = useState(initialData);
   const { executeAsync, status } = useAction(upsertUserInfo);
   const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

   const onSubmit = async () => {
      setMsg(null);
      const res = await executeAsync(form);
      if (res?.data?.ok) {
         setMsg({ type: "success", text: "Info saved." });
         setIsEditing(false);
      } else {
         setMsg({ type: "error", text: res?.data?.message || res?.serverError || "Failed to save." });
      }
   };

   const handleCancel = () => {
      setForm(initialData);
      setIsEditing(false);
      setMsg(null);
   };

   const handleChange = (field: keyof UserInfoData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
   };

   // Helper to safely format date for display
   const displayDate = (d: string | null) => {
      if (!d) return "N/A";
      try {
         return new Date(d).toLocaleDateString();
      } catch {
         return d;
      }
   };

   // Helper to format date for input type="date" (YYYY-MM-DD)
   const inputDate = (d: string | null) => {
      if (!d) return "";
      try {
         return new Date(d).toISOString().split('T')[0];
      } catch {
         return "";
      }
   };

   return (
      <div className="border rounded-lg bg-card shadow-sm p-6 relative">
         <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Additional Information</h2>
            {!isEditing && (
               <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                  Edit Info
               </Button>
            )}
         </div>

         {msg && (
            <div className={`mb-4 p-2 text-sm rounded ${msg.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
               {msg.text}
            </div>
         )}

         <div className="grid gap-6 md:grid-cols-2">
            {/* Date of Birth */}
            <div className="space-y-1">
               <label className="text-sm font-medium text-muted-foreground">Date of Birth</label>
               {isEditing ? (
                  <input
                     type="date"
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                     value={inputDate(form.dateOfBirth)}
                     onChange={(e) => handleChange("dateOfBirth", e.target.value)}
                  />
               ) : (
                  <p className="text-sm font-medium">{displayDate(initialData.dateOfBirth)}</p>
               )}
            </div>

            {/* Phone */}
            <div className="space-y-1">
               <label className="text-sm font-medium text-muted-foreground">Phone</label>
               {isEditing ? (
                  <input
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                     value={form.phone ?? ""}
                     onChange={(e) => handleChange("phone", e.target.value)}
                     placeholder="+1 234..."
                  />
               ) : (
                  <p className="text-sm font-medium">{initialData.phone || "N/A"}</p>
               )}
            </div>

            {/* Gender */}
            <div className="space-y-1">
               <label className="text-sm font-medium text-muted-foreground">Gender</label>
               {isEditing ? (
                  <select
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                     value={form.gender ?? ""}
                     onChange={(e) => handleChange("gender", e.target.value)}
                  >
                     <option value="">Select...</option>
                     <option value="Male">Male</option>
                     <option value="Female">Female</option>
                     <option value="Other">Other</option>
                  </select>
               ) : (
                  <p className="text-sm font-medium">{initialData.gender || "N/A"}</p>
               )}
            </div>

            {/* Profession */}
            <div className="space-y-1">
               <label className="text-sm font-medium text-muted-foreground">Profession</label>
               {isEditing ? (
                  <input
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                     value={form.profession ?? ""}
                     onChange={(e) => handleChange("profession", e.target.value)}
                     placeholder="Developer"
                  />
               ) : (
                  <p className="text-sm font-medium">{initialData.profession || "N/A"}</p>
               )}
            </div>

            {/* Hobbies */}
            <div className="space-y-1 md:col-span-2">
               <label className="text-sm font-medium text-muted-foreground">Hobbies</label>
               {isEditing ? (
                  <input
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                     value={form.hobbys ?? ""}
                     onChange={(e) => handleChange("hobbys", e.target.value)}
                     placeholder="Reading, Gaming..."
                  />
               ) : (
                  <p className="text-sm font-medium">{initialData.hobbys || "N/A"}</p>
               )}
            </div>
            {/* Address */}
            <div className="space-y-1 md:col-span-2">
               <label className="text-sm font-medium text-muted-foreground">Address</label>
               {isEditing ? (
                  <textarea
                     className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[80px]"
                     value={form.address ?? ""}
                     onChange={(e) => handleChange("address", e.target.value)}
                     placeholder="123 Main St..."
                  />
               ) : (
                  <p className="text-sm font-medium whitespace-pre-wrap">{initialData.address || "N/A"}</p>
               )}
            </div>
         </div>

         {isEditing && (
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
               <Button variant="ghost" onClick={handleCancel} disabled={status === "executing"}>
                  Cancel
               </Button>
               <Button onClick={onSubmit} disabled={status === "executing"}>
                  {status === "executing" ? "Saving..." : "Save Changes"}
               </Button>
            </div>
         )}
      </div>
   );
}
