"use client";

import { deleteRole, listRoles } from "@/actions/rbac/roles";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import { Edit2, Link, Plus, Search, Trash2, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import AssignRouteGroupsDialog from "./AssignRouteGroupsDialog";
import AssignUsersDialog from "./AssignUsersDialog";
import RoleDialog from "./RoleDialog";

type RoleItem = {
   id: string | bigint;
   name: string;
   createdAt: string | Date;
   _count: { adminRoles: number; roleRouteGroups: number };
};

type RoleData = {
   items: RoleItem[];
   total: number;
   page: number;
   pageSize: number;
};

type RouteGroup = {
   id: string | bigint;
   name: string;
};

export default function RoleTable({ routeGroups = [] }: { routeGroups?: RouteGroup[] }) {
   const router = useRouter();
   const [isPending, startTransition] = useTransition();
   const [q, setQ] = useState("");
   const [page, setPage] = useState(1);
   const [data, setData] = useState<RoleData>({ items: [], total: 0, page: 1, pageSize: 10 });
   const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
   const [showDialog, setShowDialog] = useState(false);
   const [assigningRole, setAssigningRole] = useState<RoleItem | null>(null);
   const [showAssignDialog, setShowAssignDialog] = useState(false);
   const [assigningUsersRole, setAssigningUsersRole] = useState<RoleItem | null>(null);
   const [showAssignUsersDialog, setShowAssignUsersDialog] = useState(false);

   const { executeAsync: doDelete } = useAction(deleteRole);
   const { executeAsync: doList } = useAction(listRoles);

   // Fetch initial data on mount
   useEffect(() => {
      handleSearch();
   }, []);

   async function handleSearch() {
      startTransition(async () => {
         const result = await doList({ page: 1, pageSize: 10, q: q.trim() });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(1);
         }
      });
   }

   async function handleDelete(id: string, name: string) {
      if (!confirm(`Delete role "${name}"?`)) return;

      startTransition(async () => {
         const result = await doDelete({ id });
         if (result?.data?.ok) {
            await handleSearch();
         } else {
            alert(result?.data?.error || "Failed to delete role");
         }
      });
   }

   async function handlePageChange(newPage: number) {
      startTransition(async () => {
         const result = await doList({ page: newPage, pageSize: 10, q: q.trim() });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(newPage);
         }
      });
   }

   function handleEdit(role: RoleItem) {
      setEditingRole(role);
      setShowDialog(true);
   }

   function handleCreate() {
      setEditingRole(null);
      setShowDialog(true);
   }

   async function handleDialogClose(refreshed: boolean) {
      setShowDialog(false);
      if (refreshed) {
         await handleSearch();
      }
   }

   function handleAssign(role: RoleItem) {
      setAssigningRole(role);
      setShowAssignDialog(true);
   }

   async function handleAssignClose(refreshed: boolean) {
      setShowAssignDialog(false);
      if (refreshed) {
         await handleSearch();
      }
   }

   function handleAssignUsers(role: RoleItem) {
      setAssigningUsersRole(role);
      setShowAssignUsersDialog(true);
   }

   async function handleAssignUsersClose(refreshed: boolean) {
      setShowAssignUsersDialog(false);
      if (refreshed) {
         await handleSearch();
      }
   }

   const { items, total, pageSize } = data;
   const totalPages = Math.ceil(total / pageSize);

   return (
      <>
         <Card className="space-y-2 bg-card border-border">
            <CardHeader className="space-y-2">
               <CardTitle className="text-lg font-semibold text-tcolor">
                  Roles
               </CardTitle>

               <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                     <div className="relative">
                        <input
                           className="pl-9 pr-3 py-2 rounded-md border border-border bg-background w-72 text-foreground text-sm"
                           placeholder="Search roles..."
                           value={q}
                           onChange={(e) => setQ(e.target.value)}
                           onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>

                     <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSearch}
                        disabled={isPending}
                        className="border-border bg-background hover:bg-light transition cursor-pointer"
                     >
                        Search
                     </Button>
                  </div>

                  <Button
                     onClick={handleCreate}
                     disabled={isPending}
                     className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-primary text-primary-foreground hover:bg-scolor transition text-sm cursor-pointer"
                  >
                     <Plus className="h-4 w-4" /> Add Role
                  </Button>
               </div>
            </CardHeader>

            <CardContent className="pb-2">
               <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="min-w-full text-sm">
                     <thead className="bg-muted">
                        <tr className="text-left text-text-hcolor">
                           <th className="px-4 py-3">Name</th>
                           <th className="px-4 py-3">Users</th>
                           <th className="px-4 py-3">Route Groups</th>
                           <th className="px-4 py-3">Created</th>
                           <th className="px-4 py-3 text-right">Actions</th>
                        </tr>
                     </thead>
                     <tbody className="text-foreground">
                        {isPending ? (
                           Array.from({ length: pageSize }).map((_, idx) => (
                              <tr
                                 key={`skeleton-${idx}`}
                                 className="border-t border-border animate-pulse"
                              >
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-32"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-8"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-8"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-8 bg-muted rounded w-16 ml-auto"></div>
                                 </td>
                              </tr>
                           ))
                        ) : items?.length ? (
                           items.map((role) => (
                              <tr key={role.id} className="border-t border-border hover:bg-muted/50">
                                 <td className="px-4 py-3 font-medium">{role.name}</td>
                                 <td className="px-4 py-3">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                       {role._count.adminRoles}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3">
                                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                                       {role._count.roleRouteGroups}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground text-xs">
                                    {(() => {
                                       try {
                                          const date = typeof role.createdAt === 'string'
                                             ? new Date(role.createdAt)
                                             : role.createdAt instanceof Date
                                                ? role.createdAt
                                                : new Date(role.createdAt);
                                          return isNaN(date.getTime()) ? 'Invalid Date' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                       } catch {
                                          return 'Invalid Date';
                                       }
                                    })()}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAssignUsers(role)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0 cursor-pointer"
                                          title="Assign Users"
                                       >
                                          <Users className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleAssign(role)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0 cursor-pointer"
                                          title="Assign Route Groups"
                                       >
                                          <Link className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(role)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0 cursor-pointer"
                                          title="Edit"
                                       >
                                          <Edit2 className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(role.id.toString(), role.name)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0 cursor-pointer text-destructive hover:text-destructive"
                                          title="Delete"
                                       >
                                          <Trash2 className="h-4 w-4" />
                                       </Button>
                                    </div>
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                                 No roles found.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </CardContent>

            {total > pageSize && (
               <CardFooter className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                     Page {page} of {totalPages} • {total} roles
                  </p>
                  <div className="flex gap-2">
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1 || isPending}
                        onClick={() => handlePageChange(page - 1)}
                        className="border-border bg-background disabled:opacity-50 hover:bg-light transition"
                     >
                        Prev
                     </Button>
                     <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages || isPending}
                        onClick={() => handlePageChange(page + 1)}
                        className="border-border bg-background disabled:opacity-50 hover:bg-light transition"
                     >
                        Next
                     </Button>
                  </div>
               </CardFooter>
            )}
         </Card>

         <RoleDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            role={editingRole}
            onClose={handleDialogClose}
         />

         <AssignRouteGroupsDialog
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            role={assigningRole}
            allRouteGroups={routeGroups}
            onClose={handleAssignClose}
         />

         <AssignUsersDialog
            open={showAssignUsersDialog}
            onOpenChange={setShowAssignUsersDialog}
            role={assigningUsersRole}
            onClose={handleAssignUsersClose}
         />
      </>
   );
}
