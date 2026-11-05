"use client";

import { deleteRouteGroup, listRouteGroups } from "@/actions/rbac/route-groups";
import { Button } from "@/components/ui/button";
import { Edit2, Link as LinkIcon, Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useTransition, useMemo } from "react";
import AssignRoutesDialog from "./AssignRoutesDialog";
import RouteGroupDialog from "./RouteGroupDialog";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";

type RouteGroupItem = {
   id: string | bigint;
   name: string;
   createdAt: string | Date;
   _count: { routes: number; roleRouteGroups: number };
};

type RouteGroupData = {
   items: RouteGroupItem[];
   total: number;
   page: number;
   pageSize: number;
};

type RouteItem = {
   id: string | bigint;
   path: string;
   groupId: string | bigint;
   group: { id: string | bigint; name: string };
};

export default function RouteGroupTable({
   routes = [],
}: {
   routes?: RouteItem[];
}) {
   const [isPending, startTransition] = useTransition();
   const [q, setQ] = useState("");
   const [page, setPage] = useState(1);
   const [pageSize, setPageSize] = useState(10);
   const [data, setData] = useState<RouteGroupData>({ items: [], total: 0, page: 1, pageSize: 10 });
   const [editingGroup, setEditingGroup] = useState<RouteGroupItem | null>(null);
   const [showDialog, setShowDialog] = useState(false);
   const [assigningGroup, setAssigningGroup] = useState<RouteGroupItem | null>(null);
   const [showAssignDialog, setShowAssignDialog] = useState(false);

   const { executeAsync: doDelete } = useAction(deleteRouteGroup);
   const { executeAsync: doList } = useAction(listRouteGroups);

   useEffect(() => {
      fetchGroups(1, q, pageSize);
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, []);

   function fetchGroups(targetPage = page, searchTerm = q, targetPageSize = pageSize) {
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
      fetchGroups(1, q, pageSize);
   };

   async function handleDelete(id: string) {
      const result = await doDelete({ id });
      if (result?.data?.ok) {
         fetchGroups(page, q, pageSize);
      } else {
         alert(result?.data?.error || "Failed to delete route group");
      }
   }

   function handleEdit(group: RouteGroupItem) {
      setEditingGroup(group);
      setShowDialog(true);
   }

   function handleCreate() {
      setEditingGroup(null);
      setShowDialog(true);
   }

   async function handleDialogClose(refreshed: boolean) {
      setShowDialog(false);
      if (refreshed) {
         fetchGroups(page, q, pageSize);
      }
   }

   function handleAssign(group: RouteGroupItem) {
      setAssigningGroup(group);
      setShowAssignDialog(true);
   }

   function handleAssignClose(refreshed: boolean) {
      setShowAssignDialog(false);
      if (refreshed) {
         fetchGroups(page, q, pageSize);
      }
   }

   const columns: ColumnDef<RouteGroupItem>[] = useMemo(
      () => [
         {
            header: "Name",
            accessorKey: "name",
            sortable: true,
            cell: (group) => <span className="font-medium text-foreground">{group.name}</span>,
         },
         {
            header: "Routes",
            cell: (group) => (
               <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {group._count.routes}
               </span>
            ),
         },
         {
            header: "Roles",
            cell: (group) => (
               <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                  {group._count.roleRouteGroups}
               </span>
            ),
         },
         {
            header: "Created",
            accessorKey: "createdAt",
            sortable: true,
            cell: (group) => {
               try {
                  const date =
                     typeof group.createdAt === "string"
                        ? new Date(group.createdAt)
                        : group.createdAt instanceof Date
                        ? group.createdAt
                        : new Date(group.createdAt);
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
            cell: (group) => (
               <div className="flex items-center justify-end gap-1.5">
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleAssign(group)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Assign Routes"
                  >
                     <LinkIcon className="h-4 w-4" />
                  </Button>
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleEdit(group)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Edit"
                  >
                     <Edit2 className="h-4 w-4" />
                  </Button>
                  <DeleteConfirmDialog
                     title="Delete Route Group"
                     description={`Are you sure you want to delete route group "${group.name}"? This action cannot be undone.`}
                     onConfirm={() => handleDelete(group.id.toString())}
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
                     placeholder="Search route groups..."
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
               <Plus className="h-4 w-4" /> Add Route Group
            </button>
         </div>

         <DataTable<RouteGroupItem>
            data={data.items}
            columns={columns}
            keyExtractor={(group) => group.id.toString()}
            isLoading={isPending}
            emptyMessage="No route groups found."
            enableColumnResizing={true}
            enableRowResizing={true}
            tableId="rbac-route-groups-table"
            pagination={{
               page,
               total: data.total,
               pageSize,
               onPageChange: (newPage) => fetchGroups(newPage, q, pageSize),
               onPageSizeChange: (newPageSize) => {
                  setPageSize(newPageSize);
                  fetchGroups(1, q, newPageSize);
               },
               pageSizeOptions: [10, 20, 50, 100],
            }}
         />

         <RouteGroupDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            group={editingGroup}
            onClose={handleDialogClose}
         />

         <AssignRoutesDialog
            open={showAssignDialog}
            onOpenChange={setShowAssignDialog}
            group={assigningGroup}
            routes={routes}
            onClose={handleAssignClose}
         />
      </div>
   );
}
