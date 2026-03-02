"use client";

import { createRoute, updateRoute } from "@/actions/rbac/routes";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogHeader,
   DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";

type RouteItem = {
   id: string | bigint;
   path: string;
   name: string | null;
   groupId: string | bigint;
   visibleToAdmin: boolean;
   visibleToSuperAdmin: boolean;
   editableByAdmin: boolean;
   editableBySuperAdmin: boolean;
   group: { id: string | bigint; name: string };
   createdAt: string | Date;
};

type RouteGroup = {
   id: string | bigint;
   name: string;
};

interface RouteDialogProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   route: RouteItem | null;
   routeGroups: RouteGroup[];
   onClose: (refreshed: boolean) => void;
}

const CHAR_LIMITS = {
   path: 255,
   name: 100,
};

export default function RouteDialog({
   open,
   onOpenChange,
   route,
   routeGroups,
   onClose,
}: RouteDialogProps) {
   const [path, setPath] = useState("");
   const [name, setName] = useState("");
   const [groupId, setGroupId] = useState("");
   const [visibleToAdmin, setVisibleToAdmin] = useState(true);
   const [visibleToSuperAdmin, setVisibleToSuperAdmin] = useState(true);
   const [editableByAdmin, setEditableByAdmin] = useState(false);
   const [editableBySuperAdmin, setEditableBySuperAdmin] = useState(true);
   const [error, setError] = useState("");

   const { executeAsync: doCreate, isPending: isCreating } = useAction(createRoute);
   const { executeAsync: doUpdate, isPending: isUpdating } = useAction(updateRoute);

   const isPending = isCreating || isUpdating;

   useEffect(() => {
      if (open) {
         if (route) {
            // Edit mode - use route values
            setPath(route.path || "");
            setName(route.name || "");
            setGroupId(route.groupId?.toString() || "");
            setVisibleToAdmin(route.visibleToAdmin);
            setVisibleToSuperAdmin(route.visibleToSuperAdmin);
            setEditableByAdmin(route.editableByAdmin);
            setEditableBySuperAdmin(route.editableBySuperAdmin);
         } else {
            // Create mode - use defaults
            setPath("");
            setName("");
            setGroupId("");
            setVisibleToAdmin(true);
            setVisibleToSuperAdmin(true);
            setEditableByAdmin(false);
            setEditableBySuperAdmin(true);
         }
         setError("");
      }
   }, [open, route]);

   async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError("");

      if (!path.trim()) {
         setError("Route path is required");
         return;
      }

      if (!name.trim()) {
         setError("Route name is required");
         return;
      }

      if (!groupId) {
         setError("Route group is required");
         return;
      }

      if (route) {
         const result = await doUpdate({
            id: route.id.toString(),
            path: path.trim(),
            name: name.trim(),
            groupId,
            visibleToAdmin,
            visibleToSuperAdmin,
            editableByAdmin,
            editableBySuperAdmin,
         });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to update route");
         }
      } else {
         const result = await doCreate({
            path: path.trim(),
            name: name.trim(),
            groupId,
            visibleToAdmin,
            visibleToSuperAdmin,
            editableByAdmin,
            editableBySuperAdmin,
         });
         if (result?.data?.ok) {
            onOpenChange(false);
            onClose(true);
         } else {
            setError(result?.data?.error || "Failed to create route");
         }
      }
   }

   return (
      <Dialog open={open} onOpenChange={onOpenChange}>
         <DialogContent className="sm:max-w-[600px] max-w-3xl! max-h-[90vh] overflow-y-auto">
            <DialogHeader>
               <DialogTitle>{route ? "Edit Route" : "Create Route"}</DialogTitle>
               <DialogDescription>
                  {route
                     ? "Update the route details and permissions"
                     : "Create a new route with visibility and edit permissions"}
               </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
               {/* Route Path */}
               <div className="space-y-2">
                  <div className="flex items-center justify-between">
                     <label className="text-sm font-medium text-foreground">
                        Route Path *
                     </label>
                     <span className="text-xs text-muted-foreground">
                        {path.length}/{CHAR_LIMITS.path}
                     </span>
                  </div>
                  <Input
                     value={path}
                     onChange={(e) => setPath(e.target.value.slice(0, CHAR_LIMITS.path))}
                     placeholder="e.g., /users, /dashboard"
                     disabled={isPending}
                     maxLength={CHAR_LIMITS.path}
                     className="border-border bg-background font-mono text-xs"
                  />
                  {path.length === CHAR_LIMITS.path && (
                     <p className="text-xs text-amber-600">Character limit reached</p>
                  )}
               </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Route Name */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-foreground">
                           Route Name *
                        </label>
                        <span className="text-xs text-muted-foreground">
                           {name.length}/{CHAR_LIMITS.name}
                        </span>
                     </div>
                     <Input
                        value={name}
                        onChange={(e) => setName(e.target.value.slice(0, CHAR_LIMITS.name))}
                        placeholder="e.g., Users, Dashboard"
                        disabled={isPending}
                        maxLength={CHAR_LIMITS.name}
                        className="border-border bg-background"
                     />
                     {name.length === CHAR_LIMITS.name && (
                        <p className="text-xs text-amber-600">Character limit reached</p>
                     )}
                  </div>

                  {/* Route Group */}
                  <div className="space-y-2">
                     <label className="text-sm font-medium text-foreground">
                        Route Group *
                     </label>
                     <Select value={groupId} onValueChange={setGroupId} disabled={isPending}>
                        <SelectTrigger className="border-border bg-background">
                           <SelectValue placeholder="Select a route group" />
                        </SelectTrigger>
                        <SelectContent className="mt-1">
                           {routeGroups.map((g) => (
                              <SelectItem key={g.id} value={g.id.toString()}>
                                 {g.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>
                  </div>
               </div>
               {/* Visibility & Permissions Section */}
               <h3 className="text-sm font-semibold text-foreground">Visibility & Permissions</h3>
               <div className="border-t pt-4 space-y-4 grid grid-cols-1 md:grid-cols-2">

                  {/* Visibility */}
                  <div className="space-y-3">
                     <p className="text-xs font-medium text-muted-foreground">Who can see this route?</p>
                     <div className="space-y-2 ml-2">
                        <div className="flex items-center gap-2">
                           <Checkbox
                              id="visibleToAdmin"
                              checked={visibleToAdmin}
                              onCheckedChange={(checked) => setVisibleToAdmin(checked as boolean)}
                              disabled={isPending}
                           />
                           <label htmlFor="visibleToAdmin" className="text-sm cursor-pointer">
                              Visible to ADMIN users
                           </label>
                        </div>
                        <div className="flex items-center gap-2">
                           <Checkbox
                              id="visibleToSuperAdmin"
                              checked={visibleToSuperAdmin}
                              onCheckedChange={(checked) => setVisibleToSuperAdmin(checked as boolean)}
                              disabled={isPending}
                           />
                           <label htmlFor="visibleToSuperAdmin" className="text-sm cursor-pointer">
                              Visible to SUPER ADMIN users
                           </label>
                        </div>
                     </div>
                  </div>

                  {/* Edit Permissions */}
                  <div className="space-y-3">
                     <p className="text-xs font-medium text-muted-foreground">Who can edit this route?</p>
                     <div className="space-y-2 ml-2">
                        <div className="flex items-center gap-2">
                           <Checkbox
                              id="editableByAdmin"
                              checked={editableByAdmin}
                              onCheckedChange={(checked) => setEditableByAdmin(checked as boolean)}
                              disabled={isPending}
                           />
                           <label htmlFor="editableByAdmin" className="text-sm cursor-pointer">
                              ADMIN users can edit
                           </label>
                        </div>
                        <div className="flex items-center gap-2">
                           <Checkbox
                              id="editableBySuperAdmin"
                              checked={editableBySuperAdmin}
                              onCheckedChange={(checked) => setEditableBySuperAdmin(checked as boolean)}
                              disabled={isPending}
                           />
                           <label htmlFor="editableBySuperAdmin" className="text-sm cursor-pointer">
                              SUPER ADMIN users can edit
                           </label>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Error Message */}
               {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                     {error}
                  </div>
               )}

               {/* Actions */}
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
                     {isPending ? "Saving..." : route ? "Update" : "Create"}
                  </Button>
               </div>
            </form>
         </DialogContent>
      </Dialog>
   );
}
