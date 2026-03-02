"use client";

import { createRole, updateRole } from "@/actions/rbac/roles";
import { Button } from "@/components/ui/button";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

type RoleItem = {
   id: string | bigint;
   name: string;
   createdAt: string | Date;
   _count: { userRoles: number; roleRouteGroups: number };
};

interface RoleDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   role: RoleItem | null;
   onClose: (refreshed: boolean) => void;
}

export default function RoleDialog({
   open,
   onOpenChange,
   role,
   onClose,
}: RoleDialogProps) {
   const [name, setName] = useState("");
   const [error, setError] = useState("");

   const { executeAsync: doCreate, isPending: isCreating } = useAction(createRole);
   const { executeAsync: doUpdate, isPending: isUpdating } = useAction(updateRole);

   const isPending = isCreating || isUpdating;

   useEffect(() => {
      if (open) {
         setName(role?.name || "");
         setError("");
      }
   }, [open, role]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError("");

      if (!name.trim()) {
         setError("Role name is required");
         return;
      }

      if (role) {
         const result = await doUpdate({ id: role.id.toString(), name: name.trim() });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to update role");
         }
      } else {
         const result = await doCreate({ name: name.trim() });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to create role");
         }
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle>{role ? "Edit Role" : "Create Role"}</DialogTitle>
               <DialogDescription>
                  {role
                     ? "Update the role name"
                     : "Create a new role for your system"}
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                     Role Name
                  </label>
                  <Input
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="e.g., Manager, Editor, Viewer"
                     disabled={isPending}
                     className="border-border bg-background"
                  />
               </div>

               {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                     {error}
                  </div>
               )}

               <div className="flex justify-end gap-2 pt-4">
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => onOpenChange(false)}
                     disabled={isPending}
                     className="border-border"
                  >
                     Cancel
                  </Button>
                  <Button
                     type="submit"
                     disabled={isPending}
                     className="bg-primary text-primary-foreground hover:bg-scolor"
                  >
                     {isPending ? "Saving..." : role ? "Update" : "Create"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
