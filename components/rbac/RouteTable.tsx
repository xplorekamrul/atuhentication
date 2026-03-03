"use client";

import { deleteRoute, listRoutes } from "@/actions/rbac/routes";
import { Button } from "@/components/ui/button";
import {
   Card,
   CardContent,
   CardFooter,
   CardHeader,
   CardTitle,
} from "@/components/ui/card";
import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
} from "@/components/ui/select";
import { Edit2, Plus, Search, Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useTransition } from "react";
import RouteDialog from "./RouteDialog";

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
}: {
   routeGroups: RouteGroup[];
}) {
   const [isPending, startTransition] = useTransition();
   const [q, setQ] = useState("");
   const [groupId, setGroupId] = useState("all");
   const [page, setPage] = useState(1);
   const [data, setData] = useState<RouteData>({ items: [], total: 0, page: 1, pageSize: 10 });
   const [editingRoute, setEditingRoute] = useState<RouteItem | null>(null);
   const [showDialog, setShowDialog] = useState(false);

   const { executeAsync: doDelete } = useAction(deleteRoute);
   const { executeAsync: doList } = useAction(listRoutes);

   // Fetch initial data on mount
   useEffect(() => {
      handleSearch();
   }, []);

   async function handleSearch() {
      startTransition(async () => {
         const result = await doList({
            page: 1,
            pageSize: 10,
            q: q.trim(),
            groupId: groupId !== "all" ? groupId : undefined,
         });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(1);
         }
      });
   }

   async function handleDelete(id: string, path: string) {
      if (!confirm(`Delete route "${path}"?`)) return;

      startTransition(async () => {
         const result = await doDelete({ id });
         if (result?.data?.ok) {
            await handleSearch();
         } else {
            alert(result?.data?.error || "Failed to delete route");
         }
      });
   }

   async function handlePageChange(newPage: number) {
      startTransition(async () => {
         const result = await doList({
            page: newPage,
            pageSize: 10,
            q: q.trim(),
            groupId: groupId !== "all" ? groupId : undefined,
         });
         if (result?.data?.ok) {
            setData(result.data);
            setPage(newPage);
         }
      });
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
                  Routes
               </CardTitle>

               <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                     <div className="relative">
                        <input
                           className="pl-9 pr-3 py-2 rounded-md border border-border bg-background w-72 text-foreground text-sm"
                           placeholder="Search routes..."
                           value={q}
                           onChange={(e) => setQ(e.target.value)}
                           onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                        />
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                     </div>

                     <Select value={groupId} onValueChange={setGroupId}>
                        <SelectTrigger className="w-48">
                           <SelectValue placeholder="All groups" />
                        </SelectTrigger>
                        <SelectContent>
                           <SelectItem value="all">All groups</SelectItem>
                           {routeGroups.map((g) => (
                              <SelectItem key={g.id} value={g.id.toString()}>
                                 {g.name}
                              </SelectItem>
                           ))}
                        </SelectContent>
                     </Select>

                     <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSearch}
                        disabled={isPending}
                        className="border-border bg-background hover:bg-light transition"
                     >
                        Search
                     </Button>
                  </div>

                  <Button
                     onClick={handleCreate}
                     disabled={isPending}
                     className="inline-flex items-center gap-2 rounded-md px-3 py-2 bg-primary text-primary-foreground hover:bg-scolor transition text-sm"
                  >
                     <Plus className="h-4 w-4" /> Add Route
                  </Button>
               </div>
            </CardHeader>

            <CardContent className="pb-0">
               <div className="overflow-x-auto rounded-lg border border-border bg-card">
                  <table className="min-w-full text-sm">
                     <thead className="bg-muted">
                        <tr className="text-left text-text-hcolor">
                           <th className="px-4 py-3">Path</th>
                           <th className="px-4 py-3">Name</th>
                           <th className="px-4 py-3">Route Group</th>
                           <th className="px-4 py-3">Visible To</th>
                           <th className="px-4 py-3">Editable By</th>
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
                                    <div className="h-4 bg-muted rounded w-40"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-32"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24"></div>
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24"></div>
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
                           items.map((route) => (
                              <tr key={route.id} className="border-t border-border hover:bg-muted/50">
                                 <td className="px-4 py-3 font-mono text-xs">{route.path}</td>
                                 <td className="px-4 py-3 text-sm">{route.name || "-"}</td>
                                 <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                       {route.group.name}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-xs">
                                    <div className="flex flex-col gap-1">
                                       {route.visibleToAdmin && <span className="text-blue-600">ADMIN</span>}
                                       {route.visibleToSuperAdmin && <span className="text-purple-600">SUPER ADMIN</span>}
                                       {!route.visibleToAdmin && !route.visibleToSuperAdmin && <span className="text-muted-foreground">None</span>}
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 text-xs">
                                    <div className="flex flex-col gap-1">
                                       {route.editableByAdmin && <span className="text-blue-600">ADMIN</span>}
                                       {route.editableBySuperAdmin && <span className="text-purple-600">SUPER ADMIN</span>}
                                       {!route.editableByAdmin && !route.editableBySuperAdmin && <span className="text-muted-foreground">None</span>}
                                    </div>
                                 </td>
                                 <td className="px-4 py-3 text-muted-foreground text-xs">
                                    {new Date(route.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleEdit(route)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0"
                                          title="Edit"
                                       >
                                          <Edit2 className="h-4 w-4" />
                                       </Button>
                                       <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => handleDelete(route.id.toString(), route.path)}
                                          disabled={isPending}
                                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
                              <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                                 No routes found.
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
                     Page {page} of {totalPages} • {total} routes
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

         <RouteDialog
            open={showDialog}
            onOpenChange={setShowDialog}
            route={editingRoute}
            routeGroups={routeGroups}
            onClose={handleDialogClose}
         />
      </>
   );
}
