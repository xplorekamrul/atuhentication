"use client";

import { deleteRole, listRoles } from "@/actions/rbac/roles";
import { Button } from "@/components/ui/button";
import { Edit2, Link, Plus, Search, Users } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useTransition, useMemo } from "react";
import AssignRouteGroupsDialog from "./AssignRouteGroupsDialog";
import AssignUsersDialog from "./AssignUsersDialog";
import RoleDialog from "./RoleDialog";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

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
   const [isPending, startTransition] = useTransition();
   const [q, setQ] = useState("");
   const [page, setPage] = useState(1);
   const [pageSize, setPageSize] = useState(10);
   const [data, setData] = useState<RoleData>({ items: [], total: 0, page: 1, pageSize: 10 });
   const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
   const [showDialog, setShowDialog] = useState(false);
   const [assigningRole, setAssigningRole] = useState<RoleItem | null>(null);
   const [showAssignDialog, setShowAssignDialog] = useState(false);
   const [assigningUsersRole, setAssigningUsersRole] = useState<RoleItem | null>(null);
   const [showAssignUsersDialog, setShowAssignUsersDialog] = useState(false);

   const { executeAsync: doDelete } = useAction(deleteRole);
   const { executeAsync: doList } = useAction(listRoles);

   useEffect(() => {
      fetchRoles(1, q, pageSize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   function fetchRoles(targetPage = page, searchTerm = q, targetPageSize = pageSize) {
      startTransition(async () => {
         const result = await doList({ page: targetPage, pageSize: targetPageSize, q: searchTerm.trim() });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(targetPage);
            setPageSize(targetPageSize);
         }
      });
   }

   const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchRoles(1, q, pageSize);
   };

   async function handleDelete(id: string) {
      const result = await doDelete({ id });
      if (result?.data?.ok) {
         fetchRoles(page, q, pageSize);
      } else {
         alert(result?.data?.error || "Failed to delete role");
      }
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
         fetchRoles(page, q, pageSize);
      }
   }

   function handleAssign(role: RoleItem) {
      setAssigningRole(role);
      setShowAssignDialog(true);
   }

   async function handleAssignClose(refreshed: boolean) {
      setShowAssignDialog(false);
      if (refreshed) {
         fetchRoles(page, q, pageSize);
      }
   }

   function handleAssignUsers(role: RoleItem) {
      setAssigningUsersRole(role);
      setShowAssignUsersDialog(true);
   }

   async function handleAssignUsersClose(refreshed: boolean) {
      setShowAssignUsersDialog(false);
      if (refreshed) {
         fetchRoles(page, q, pageSize);
      }
   }

   const columns: ColumnDef<RoleItem>[] = useMemo(
      () => [
         {
            header: "Name",
            accessorKey: "name",
            sortable: true,
            cell: (role) => <span className="font-medium text-foreground">{role.name}</span>,
         },
         {
            header: "Users",
            cell: (role) => (
               <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {role._count.adminRoles}
               </span>
            ),
         },
         {
            header: "Route Groups",
            cell: (role) => (
               <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {role._count.roleRouteGroups}
               </span>
            ),
         },
         {
            header: "Created",
            accessorKey: "createdAt",
            sortable: true,
            cell: (role) => {
               try {
                  const date =
                     typeof role.createdAt === "string"
                        ? new Date(role.createdAt)
                        : role.createdAt instanceof Date
                        ? role.createdAt
                        : new Date(role.createdAt);
                  return isNaN(date.getTime())
                     ? "—"
                     : date.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                       });
               } catch {
                  return "—";
               }
            },
         },
         {
            header: "Actions",
            className: "text-right",
            cell: (role) => (
               <div className="flex items-center justify-end gap-1.5">
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleAssignUsers(role)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Assign Users"
                  >
                     <Users className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleAssign(role)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Assign Route Groups"
                  >
                     <Link className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleEdit(role)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Edit"
                  >
                     <Edit2 className="h-4 w-4" />
                  </Button>
                  <DeleteConfirmDialog
                     title="Delete Role"
                     description={`Are you sure you want to delete role "${role.name}"? This action cannot be undone.`}
                     onConfirm={() => handleDelete(role.id.toString())}
                     triggerClassName="h-8 w-8 p-0 border-none bg-transparent hover:bg-destructive/10 text-destructive cursor-pointer"
                  />
               </div>
            ),
         },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isPending, page, q, pageSize]
   );

   return (
      <div className="space-y-4">
         <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
               <div className="relative">
                  <input
                     className="pl-9 pr-3 py-1.5 rounded-sm border border-border bg-background w-72 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                     placeholder="Search roles..."
                     value={q}
                     onChange={(e) => setQ(e.target.value)}
                  />
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
               </div>
               <button
                  type="submit"
                  disabled={isPending}
                  className="px-3 py-1.5 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer disabled:opacity-50"
               >
                  Search
               </button>
            </form>

            <button
               onClick={handleCreate}
               disabled={isPending}
               className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50"
            >
               <Plus className="h-4 w-4" /> Add Role
            </button>
         </div>

         <DataTable<RoleItem>
            data={data.items}
            columns={columns}
            keyExtractor={(role) => role.id.toString()}
            isLoading={isPending}
            emptyMessage="No roles found."
            enableColumnResizing={true}
            enableRowResizing={true}
            tableId="rbac-roles-table"
            pagination={{
               page,
               total: data.total,
               pageSize,
               onPageChange: (newPage) => fetchRoles(newPage, q, pageSize),
               onPageSizeChange: (newPageSize) => {
                  setPageSize(newPageSize);
                  fetchRoles(1, q, newPageSize);
               },
               pageSizeOptions: [10, 20, 50, 100],
            }}
         />

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
      </div>
   );
}
