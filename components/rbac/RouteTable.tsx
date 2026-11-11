"use client";

import { deleteRoute, listRoutes } from "@/actions/rbac/routes";
import { Button } from "@/components/ui/button";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Edit2, Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition, useMemo } from "react";
import RouteDialog from "./RouteDialog";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { SyncRoutesButton } from "./SyncRoutesButton";

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

type RouteData = {
   items: RouteItem[];
   total: number;
   page: number;
   pageSize: number;
};

type RouteGroup = {
   id: string | bigint;
   name: string;
};

export default function RouteTable({
   routeGroups,
   initialData,
}: {
   routeGroups: RouteGroup[];
   initialData?: RouteData;
}) {
   const router = useRouter();
   const [isPending, startTransition] = useTransition();
   const [q, setQ] = useState("");
   const [groupId, setGroupId] = useState("all");
   const [page, setPage] = useState(initialData?.page ?? 1);
   const [pageSize, setPageSize] = useState(initialData?.pageSize ?? 10);
   const [data, setData] = useState<RouteData>(
      initialData ?? { items: [], total: 0, page: 1, pageSize: 10 }
   );
   const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
   const [showDialog, setShowDialog] = useState(false);

   const { executeAsync: doDelete } = useAction(deleteRoute);
   const { executeAsync: doList } = useAction(listRoutes);

   useEffect(() => {
      if (!initialData) {
         fetchRoutes(1, q, groupId, pageSize);
      } else {
         setData(initialData);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [initialData]);

   function notifyPermissionsChanged() {
      router.refresh();
      if (typeof window !== "undefined") {
         window.dispatchEvent(new Event("rbac-permissions-updated"));
      }
   }

   function fetchRoutes(targetPage = page, searchTerm = q, filterGroupId = groupId, targetPageSize = pageSize) {
      startTransition(async () => {
         const result = await doList({
            page: targetPage,
            pageSize: targetPageSize,
            q: searchTerm.trim(),
            groupId: filterGroupId !== "all" ? filterGroupId : undefined,
         });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(targetPage);
            setPageSize(targetPageSize);
         }
      });
   }

   const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      fetchRoutes(1, q, groupId, pageSize);
   };

   const handleGroupChange = (newGroupId: string) => {
      setGroupId(newGroupId);
      fetchRoutes(1, q, newGroupId, pageSize);
   };

   async function handleDelete(id: string) {
      const result = await doDelete({ id });
      if (result?.data?.ok) {
         fetchRoutes(page, q, groupId, pageSize);
         notifyPermissionsChanged();
      } else {
         alert(result?.data?.error || "Failed to delete route");
      }
   }

   function handleEdit(route: RouteItem) {
      setEditingRoute(route);
      setShowDialog(true);
   }

   function handleCreate() {
      setEditingRoute(null);
      setShowDialog(true);
   }

   async function handleDialogClose(refreshed: boolean) {
      setShowDialog(false);
      if (refreshed) {
         fetchRoutes(page, q, groupId, pageSize);
         notifyPermissionsChanged();
      }
   }

   const columns: ColumnDef<RouteItem>[] = useMemo(
      () => [
         {
            header: "Path",
            accessorKey: "path",
            sortable: true,
            cell: (route) => <span className="font-mono text-xs font-medium">{route.path}</span>,
         },
         {
            header: "Name",
            accessorKey: "name",
            sortable: true,
            cell: (route) => <span className="text-sm">{route.name || "—"}</span>,
         },
         {
            header: "Route Group",
            cell: (route) => (
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {route.group?.name || "—"}
               </span>
            ),
         },
         {
            header: "Visible To",
            cell: (route) => (
               <div className="flex flex-col gap-0.5 text-xs font-medium">
                  {route.visibleToAdmin && (
                     <span className="text-blue-600 dark:text-blue-400">ADMIN</span>
                  )}
                  {route.visibleToSuperAdmin && (
                     <span className="text-purple-600 dark:text-purple-400">SUPER ADMIN</span>
                  )}
                  {!route.visibleToAdmin && !route.visibleToSuperAdmin && (
                     <span className="text-muted-foreground">None</span>
                  )}
               </div>
            ),
         },
         {
            header: "Editable By",
            cell: (route) => (
               <div className="flex flex-col gap-0.5 text-xs font-medium">
                  {route.editableByAdmin && (
                     <span className="text-blue-600 dark:text-blue-400">ADMIN</span>
                  )}
                  {route.editableBySuperAdmin && (
                     <span className="text-purple-600 dark:text-purple-400">SUPER ADMIN</span>
                  )}
                  {!route.editableByAdmin && !route.editableBySuperAdmin && (
                     <span className="text-muted-foreground">None</span>
                  )}
               </div>
            ),
         },
         {
            header: "Created",
            accessorKey: "createdAt",
            sortable: true,
            cell: (route) => {
               try {
                  const date =
                     typeof route.createdAt === "string"
                        ? new Date(route.createdAt)
                        : route.createdAt instanceof Date
                           ? route.createdAt
                           : new Date(route.createdAt);
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
            cell: (route) => (
               <div className="flex items-center justify-end gap-1.5">
                  <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => handleEdit(route)}
                     disabled={isPending}
                     className="h-8 w-8 p-0 cursor-pointer hover:bg-muted"
                     title="Edit"
                  >
                     <Edit2 className="h-4 w-4" />
                  </Button>
                  <DeleteConfirmDialog
                     title="Delete Route"
                     description={`Are you sure you want to delete route "${route.path}"? This action cannot be undone.`}
                     onConfirm={() => handleDelete(route.id.toString())}
                     triggerClassName="h-8 w-8 p-0 border-none bg-transparent hover:bg-destructive/10 text-destructive cursor-pointer"
                  />
               </div>
            ),
         },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [isPending, page, q, groupId, pageSize]
   );

   return (
      <div className="space-y-4">
         <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between flex-wrap">
            <div className="flex flex-wrap items-center gap-2">
               <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
                  <div className="relative">
                     <input
                        className="pl-9 pr-3 py-1.5 rounded-sm border border-border bg-background w-60 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                        placeholder="Search routes..."
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

               <Select value={groupId} onValueChange={handleGroupChange}>
                  <SelectTrigger className="w-48 h-8.5 rounded-sm text-sm border-border bg-background">
                     <SelectValue placeholder="All Route Groups" />
                  </SelectTrigger>
                  <SelectContent>
                     <SelectItem value="all">All Route Groups</SelectItem>
                     {routeGroups.map((group) => (
                        <SelectItem key={group.id.toString()} value={group.id.toString()}>
                           {group.name}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>


            </div>
            <div className="flex gap-x-2">
               <SyncRoutesButton
                  onSyncComplete={() => {
                     fetchRoutes(1, q, groupId, pageSize);
                     notifyPermissionsChanged();
                  }}
               />
               <button
                  onClick={handleCreate}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50"
               >
                  <Plus className="h-4 w-4" /> Add Route
               </button>
            </div>

         </div>

         <DataTable<RouteItem>
            data={data.items}
            columns={columns}
            keyExtractor={(route) => route.id.toString()}
            isLoading={isPending}
            emptyMessage="No routes found."
            enableColumnResizing={true}
            enableRowResizing={true}
            tableId="rbac-routes-table"
            pagination={{
               page,
               total: data.total,
               pageSize,
               onPageChange: (newPage) => fetchRoutes(newPage, q, groupId, pageSize),
               onPageSizeChange: (newPageSize) => {
                  setPageSize(newPageSize);
                  fetchRoutes(1, q, groupId, newPageSize);
               },
               pageSizeOptions: [10, 20, 50, 100],
            }}
         />

         <RouteDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            route={editingRoute}
            routeGroups={routeGroups}
            onClose={handleDialogClose}
         />
      </div>
   );
}
