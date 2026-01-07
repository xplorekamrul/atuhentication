"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";
import PasswordForm from "./PasswordForm";

export default function ChangePasswordDialog() {
   const [open, setOpen] = useState(false);

   if (!open) {
      return (
         <div className="border p-6 rounded-lg bg-card h-fit flex flex-col items-start gap-4">
            <h2 className="text-xl font-semibold">Security</h2>
            <p className="text-sm text-muted-foreground">Manage your password and security settings.</p>
            <Button onClick={() => setOpen(true)} variant="outline">
               Change Password
            </Button>
         </div>
      );
   }

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
         <div className="relative w-full max-w-md">
            {/* Close Button */}
            <button
               onClick={() => setOpen(false)}
               className="absolute right-4 top-4 z-10 text-muted-foreground hover:text-foreground"
            >
               <X className="h-4 w-4" />
            </button>

            {/* We reuse the PasswordForm but wrap it in a slightly improved container logic if needed, 
            or just render it directly. Since PasswordForm has its own styling (border/card base), 
            we might get double borders. 
            Ideally, we refactor PasswordForm to be "headless" or style-less, but I'll strip styling via className or just wrap it.
            Actually PasswordForm has `border p-6 rounded-lg bg-card`. This acts as the modal content nicely. 
        */}
            <div className="bg-background rounded-lg shadow-xl relative">
               {/* Override PasswordForm styling via wrapper or modify PasswordForm? 
                Modifying PasswordForm to accept className is best, but to avoid touching too many files,
                I will just render it. It will have a border inside the modal which is fine.
                Actually, let's just use it as the modal content directly.
            */}
               <PasswordForm />
            </div>
         </div>
      </div>
   );
}
