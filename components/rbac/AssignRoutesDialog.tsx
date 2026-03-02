"use client";

import { assignRoutesToGroup, getGroupRoutes } from "@/actions/rbac/group-routes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

type RouteItem = {
   id: string | bigint;
   path: string;
   groupId: string | bigint;
   group: { id: string | bigint; name: string };
};

type RouteGroupItem = {
   id: string | bigint;
   name: string;
};

interface AssignRoutesDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   group: RouteGroupItem | null;
   routes: RouteItem[];
   onClose: (refreshed: boolean) => void;
}

export default function AssignRoutesDialog({
   open,
   onOpenChange,
   group,
   routes,
   onClose,
}: AssignRoutesDialogProps) {
   const [selectedRoutes, setSelectedRoutes] = useState<Set<string>>(new Set());
   const [error, setError] = useState("");

   const { executeAsync: doGetRoutes, isPending: isLoadingRoutes } =
      useAction(getGroupRoutes);
   const { executeAsync: doAssign, isPending: isAssigning } =
      useAction(assignRoutesToGroup);

   const isPending = isLoadingRoutes || isAssigning;

   useEffect(() => {
      if (open && group) {
         loadCurrentRoutes();
      }
   }, [open, group]);

   async function loadCurrentRoutes() {
      if (!group) return;

      setError("");
      const result = await doGetRoutes({ groupId: group.id.toString() });

      if (result?.data?.ok) {
         setSelectedRoutes(new Set(result.data.routeIds));
      } else {
         setError("Failed to load current routes");
      }
   }

   function toggleRoute(routeId: string) {
      const newSelected = new Set(selectedRoutes);
      if (newSelected.has(routeId)) {
         newSelected.delete(routeId);
      } else {
         newSelected.add(routeId);
      }
      setSelectedRoutes(newSelected);
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      if (!group) return;

      setError("");

      const result = await doAssign({
         groupId: group.id.toString(),
         routeIds: Array.from(selectedRoutes),
      });

      if (result?.data?.ok) {
         onOpenChange(false);
         onClose(true);
      } else {
         setError(result?.data?.message || "Failed to assign routes");
      }
   }

   // Show all routes - user can reassign routes from other groups
   const availableRoutes = routes;

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
               <DialogTitle>Assign Routes to {group?.name}</DialogTitle>
               <DialogDescription>
                  Select routes to assign to this route group
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="max-h-[400px] overflow-y-auto space-y-2 border border-border rounded-md p-4">
                  {isLoadingRoutes ? (
                     <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, idx) => (
                           <div
                              key={idx}
                              className="h-8 bg-muted rounded animate-pulse"
                           ></div>
                        ))}
                     </div>
                  ) : availableRoutes.length > 0 ? (
                     availableRoutes.map((route) => (
                        <div
                           key={route.id}
                           className="flex items-center gap-3 p-2 rounded hover:bg-muted/50"
                        >
                           <Checkbox
                              checked={selectedRoutes.has(route.id.toString())}
                              onCheckedChange={() => toggleRoute(route.id.toString())}
                              disabled={isPending}
                           />
                           <label className="flex-1 cursor-pointer font-mono text-xs">
                              {route.path}
                           </label>
                           <span className="text-xs text-muted-foreground">
                              {route.group.name}
                           </span>
                        </div>
                     ))
                  ) : (
                     <p className="text-center text-muted-foreground text-sm py-4">
                        No routes available
                     </p>
                  )}
               </div>

               {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                     {error}
                  </div>
               )}

               <div className="flex justify-between items-center pt-4">
                  <p className="text-sm text-muted-foreground">
                     {selectedRoutes.size} route{selectedRoutes.size !== 1 ? "s" : ""}{" "}
                     selected
                  </p>
                  <div className="flex gap-2">
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
                        {isPending ? "Saving..." : "Save"}
                     </Button>
                  </div>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
