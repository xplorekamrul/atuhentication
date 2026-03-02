"use client";

import { assignRouteGroupsToRole, getRoleRouteGroups } from "@/actions/rbac/role-route-groups";
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

type RouteGroup = {
   id: string | bigint;
   name: string;
};

type RoleItem = {
   id: string | bigint;
   name: string;
};

interface AssignRouteGroupsDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   role: RoleItem | null;
   allRouteGroups: RouteGroup[];
   onClose: (refreshed: boolean) => void;
}

export default function AssignRouteGroupsDialog({
   open,
   onOpenChange,
   role,
   allRouteGroups,
   onClose,
}: AssignRouteGroupsDialogProps) {
   const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
   const [error, setError] = useState("");
   const [loading, setLoading] = useState(false);

   const { executeAsync: doAssign, isPending: isAssigning } = useAction(assignRouteGroupsToRole);
   const { executeAsync: doGet, isPending: isFetching } = useAction(getRoleRouteGroups);

   const isPending = isAssigning || isFetching || loading;

   useEffect(() => {
      if (open && role) {
         setLoading(true);
         setError("");
         setSelectedGroupIds(new Set<string>());

         // Fetch current assignments
         doGet({ roleId: role.id.toString() }).then((result) => {
            if (result?.data?.ok) {
               const groupIds = new Set<string>(
                  result.data.data.map((item: any) => item.groupId.toString())
               );
               setSelectedGroupIds(groupIds);
            }
            setLoading(false);
         });
      }
   }, [open, role, doGet]);

   function toggleGroup(groupId: string) {
      const newSelected = new Set(selectedGroupIds);
      if (newSelected.has(groupId)) {
         newSelected.delete(groupId);
      } else {
         newSelected.add(groupId);
      }
      setSelectedGroupIds(newSelected);
   }

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError("");

      if (!role) {
         setError("Role not selected");
         return;
      }

      if (selectedGroupIds.size === 0) {
         setError("Select at least one route group");
         return;
      }

      const result = await doAssign({
         roleId: role.id.toString(),
         groupIds: Array.from(selectedGroupIds),
      });

      if (result?.data?.ok) {
         onOpenChange(false);
         onClose(true);
      } else {
         setError(result?.data?.error || "Failed to assign route groups");
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
               <DialogTitle>Assign Route Groups to Role</DialogTitle>
               <DialogDescription>
                  Select which route groups this role should have access to
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">
                     Role: <span className="font-semibold">{role?.name}</span>
                  </p>
               </div>

               {loading ? (
                  <div className="space-y-2">
                     {Array.from({ length: 3 }).map((_, idx) => (
                        <div key={idx} className="h-8 bg-muted rounded animate-pulse"></div>
                     ))}
                  </div>
               ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto border border-border rounded-lg p-4 bg-muted/30">
                     {allRouteGroups.length > 0 ? (
                        allRouteGroups.map((group) => {
                           const groupId = group.id.toString();
                           const isSelected = selectedGroupIds.has(groupId);

                           return (
                              <div
                                 key={groupId}
                                 className="flex items-center gap-3 p-2 rounded hover:bg-muted/50 cursor-pointer transition"
                                 onClick={() => toggleGroup(groupId)}
                              >
                                 <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={() => toggleGroup(groupId)}
                                    disabled={isPending}
                                    className="cursor-pointer"
                                 />
                                 <label className="flex-1 cursor-pointer text-sm font-medium text-foreground">
                                    {group.name}
                                 </label>
                              </div>
                           );
                        })
                     ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                           No route groups available
                        </p>
                     )}
                  </div>
               )}

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
                     {isPending ? "Assigning..." : "Assign"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
