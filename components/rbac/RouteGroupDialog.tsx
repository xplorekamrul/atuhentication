"use client";

import { createRouteGroup, updateRouteGroup } from "@/actions/rbac/route-groups";
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

type RouteGroupItem = {
   id: string | bigint;
   name: string;
   createdAt: string | Date;
   _count: { routes: number; roleRouteGroups: number };
};

interface RouteGroupDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   group: RouteGroupItem | null;
   onClose: (refreshed: boolean) => void;
}

export default function RouteGroupDialog({
   open,
   onOpenChange,
   group,
   onClose,
}: RouteGroupDialogProps) {
   const [name, setName] = useState("");
   const [error, setError] = useState("");

   const { executeAsync: doCreate, isPending: isCreating } =
      useAction(createRouteGroup);
   const { executeAsync: doUpdate, isPending: isUpdating } =
      useAction(updateRouteGroup);

   const isPending = isCreating || isUpdating;

   useEffect(() => {
      if (open) {
         setName(group?.name || "");
         setError("");
      }
   }, [open, group]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError("");

      if (!name.trim()) {
         setError("Route group name is required");
         return;
      }

      if (group) {
         const result = await doUpdate({ id: group.id.toString(), name: name.trim() });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to update route group");
         }
      } else {
         const result = await doCreate({ name: name.trim() });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to create route group");
         }
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
               <DialogTitle>
                  {group ? "Edit Route Group" : "Create Route Group"}
               </DialogTitle>
               <DialogDescription>
                  {group
                     ? "Update the route group name"
                     : "Create a new route group to organize routes"}
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                     Route Group Name
                  </label>
                  <Input
                     value={name}
                     onChange={(e) => setName(e.target.value)}
                     placeholder="e.g., Admin Panel, User Dashboard"
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
                     {isPending ? "Saving..." : group ? "Update" : "Create"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
