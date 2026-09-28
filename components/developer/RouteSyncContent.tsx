"use client";

import { getAllRoutesAndGroups, syncRoutesToDatabase } from "@/actions/rbac/sync-routes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

interface Route {
   id: string;
   path: string;
   name: string | null;
   groupId: string;
   group: { id: string; name: string };
   createdAt: Date;
}

interface RouteGroup {
   id: string;
   name: string;
}

export function RouteSyncContent() {
   const [isPending, startTransition] = useTransition();
   const [isLoading, setIsLoading] = useState(true);
   const [routes, setRoutes] = useState<Route[]>([]);
   const [routeGroups, setRouteGroups] = useState<RouteGroup[]>([]);
   const [syncMessage, setSyncMessage] = useState<{
      type: "success" | "error";
      message: string;
      addedCount?: number;
   } | null>(null);

   // Load initial data
   useEffect(() => {
      loadData();
   }, []);

   async function loadData() {
      setIsLoading(true);
      try {
         const result = await getAllRoutesAndGroups();
         if (result.ok) {
            setRoutes(result.routes);
            setRouteGroups(result.routeGroups);
         } else {
            toast.error("Error", {
               description: result.message,
            });
         }
      } catch (error) {
         toast.error("Error", {
            description: "Failed to load routes",
         });
      } finally {
         setIsLoading(false);
      }
   }

   async function handleSync() {
      startTransition(async () => {
         try {
            const result = await syncRoutesToDatabase();
            if (result.ok) {
               setSyncMessage({
                  type: "success",
                  message: result.message,
                  addedCount: result.addedCount,
               });
               toast.success("Success", {
                  description: result.message,
               });
               // Reload data
               await loadData();
            } else {
               setSyncMessage({
                  type: "error",
                  message: result.message,
               });
               toast.error("Error", {
                  description: result.message,
               });
            }
         } catch (error) {
            const errorMsg = error instanceof Error ? error.message : "Unknown error";
            setSyncMessage({
               type: "error",
               message: errorMsg,
            });
            toast.error("Error", {
               description: errorMsg,
            });
         }
      });
   }

   return (
      <div className="space-y-6">
         {/* Sync Button Card */}
         <Card className="bg-card border-border">
            <CardHeader>
               <CardTitle className="text-lg font-semibold text-tcolor">
                  Route Synchronization
               </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <p className="text-sm text-muted-foreground">
                  Scan the app directory for new routes and sync them to the database. This will automatically create routes in the "Not Assign Routes" group.
               </p>

               <Button
                  onClick={handleSync}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-md px-4 py-2 bg-primary text-primary-foreground hover:bg-scolor transition text-sm font-medium"
               >
                  <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                  {isPending ? "Syncing..." : "Sync Routes"}
               </Button>

               {syncMessage && (
                  <div
                     className={`flex items-start gap-3 p-3 rounded-lg border ${syncMessage.type === "success"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                        }`}
                  >
                     {syncMessage.type === "success" ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                     ) : (
                        <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                     )}
                     <div className="flex-1">
                        <p
                           className={`text-sm font-medium ${syncMessage.type === "success"
                              ? "text-green-800"
                              : "text-red-800"
                              }`}
                        >
                           {syncMessage.message}
                        </p>
                        {syncMessage.addedCount !== undefined && (
                           <p className="text-xs text-green-700 mt-1">
                              {syncMessage.addedCount} new routes added
                           </p>
                        )}
                     </div>
                  </div>
               )}
            </CardContent>
         </Card>

         {/* Route Groups Summary */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card border-border">
               <CardHeader>
                  <CardTitle className="text-base font-semibold text-tcolor">
                     Route Groups
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  {isLoading ? (
                     <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                           <div key={i} className="h-8 bg-muted rounded animate-pulse" />
                        ))}
                     </div>
                  ) : routeGroups.length > 0 ? (
                     <div className="space-y-2">
                        {routeGroups.map((group) => (
                           <div
                              key={group.id}
                              className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition"
                           >
                              <span className="text-sm font-medium text-foreground">
                                 {group.name}
                              </span>
                              <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                                 {routes.filter((r) => r.groupId === group.id).length}
                              </span>
                           </div>
                        ))}
                     </div>
                  ) : (
                     <p className="text-sm text-muted-foreground">No route groups found</p>
                  )}
               </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="bg-card border-border">
               <CardHeader>
                  <CardTitle className="text-base font-semibold text-tcolor">
                     Statistics
                  </CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="space-y-3">
                     <div className="flex items-center justify-between p-2 rounded-lg bg-blue-50 dark:bg-blue-950">
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                           Total Routes
                        </span>
                        <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                           {routes.length}
                        </span>
                     </div>
                     <div className="flex items-center justify-between p-2 rounded-lg bg-purple-50 dark:bg-purple-950">
                        <span className="text-sm text-purple-700 dark:text-purple-300">
                           Route Groups
                        </span>
                        <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                           {routeGroups.length}
                        </span>
                     </div>
                     <div className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950">
                        <span className="text-sm text-green-700 dark:text-green-300">
                           Not Assigned
                        </span>
                        <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                           {routes.filter((r) => r.group.name === "Not Assign Routes").length}
                        </span>
                     </div>
                  </div>
               </CardContent>
            </Card>
         </div>

         {/* Routes Table */}
         <Card className="bg-card border-border ">
            <CardHeader>
               <CardTitle className="text-lg font-semibold text-tcolor">
                  All Routes ({routes.length})
               </CardTitle>
            </CardHeader>
            <CardContent >
               <div className="overflow-x-auto rounded-lg border border-border h-screen overflow-y-auto">
                  <table className="min-w-full text-sm">
                     <thead className="bg-muted">
                        <tr className="text-left text-text-hcolor">
                           <th className="px-4 py-3">Path</th>
                           <th className="px-4 py-3">Name</th>
                           <th className="px-4 py-3">Route Group</th>
                           <th className="px-4 py-3">Created</th>
                        </tr>
                     </thead>
                     <tbody className="text-foreground">
                        {isLoading ? (
                           Array.from({ length: 5 }).map((_, idx) => (
                              <tr
                                 key={`skeleton-${idx}`}
                                 className="border-t border-border animate-pulse"
                              >
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-40" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-32" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24" />
                                 </td>
                                 <td className="px-4 py-3">
                                    <div className="h-4 bg-muted rounded w-24" />
                                 </td>
                              </tr>
                           ))
                        ) : routes.length > 0 ? (
                           routes.map((route, idx) => (
                              <tr
                                 key={route.id}
                                 className={`border-t border-border hover:bg-muted/50 transition ${idx % 2 === 0 ? "bg-white dark:bg-background" : "bg-primary/8"
                                    }`}
                              >
                                 <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">
                                    {route.path}
                                 </td>
                                 <td className="px-4 py-3 text-sm font-medium">
                                    {route.name || "-"}
                                 </td>
                                 <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                       {route.group.name}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-xs text-muted-foreground">
                                    {new Date(route.createdAt).toLocaleDateString()}
                                 </td>
                              </tr>
                           ))
                        ) : (
                           <tr>
                              <td colSpan={4} className="px-4 py-6 text-center text-muted-foreground">
                                 No routes found. Click "Sync Routes" to generate routes from the app directory.
                              </td>
                           </tr>
                        )}
                     </tbody>
                  </table>
               </div>
            </CardContent>
         </Card>
      </div>
   );
}
