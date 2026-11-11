import RoleTable from "@/components/rbac/RoleTable";
import RouteGroupTable from "@/components/rbac/RouteGroupTable";
import RouteTable from "@/components/rbac/RouteTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import {
   getCachedAllRouteGroups,
   getCachedAllRoutes,
   getCachedRolesList,
   getCachedRouteGroupsList,
   getCachedRoutesList,
} from "@/lib/permissions/rbac-cache";
import { Suspense } from "react";

export const metadata = {
   title: "RBAC Management",
   description: "Manage roles, route groups, and routes",
};

export default function RBACPage() {
   return (
      <div className="space-y-6 p-4 sm:p-6">
         <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">RBAC Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">
               Manage roles, route groups, and routes for your application
            </p>
         </div>

         <Suspense
            fallback={
               <div className="space-y-4 p-4 border border-primary/20 rounded-md bg-card">
                  <div className="h-8 w-64 bg-muted animate-pulse rounded" />
                  <div className="h-48 w-full bg-muted/50 animate-pulse rounded" />
               </div>
            }
         >
            <RBACContent />
         </Suspense>
      </div>
   );
}

async function RBACContent() {
   const session = await auth();
   const level = (session?.user as any)?.level as string | undefined;

   if (!session?.user || level !== "DEVELOPER") {
      return <div className="p-6 text-destructive font-medium">Unauthorized</div>;
   }

   // All initial data fetched from Next.js 16 Layer 2 "use cache" (0 DB hits on cache hit)
   const [
      routeGroupsData,
      routesData,
      initialRoles,
      initialRouteGroups,
      initialRoutes,
   ] = await Promise.all([
      getCachedAllRouteGroups(),
      getCachedAllRoutes(),
      getCachedRolesList(1, 10, ""),
      getCachedRouteGroupsList(1, 10, ""),
      getCachedRoutesList(1, 10, ""),
   ]);

   const allRouteGroups = routeGroupsData.items;
   const routeGroupsCount = routeGroupsData.total;

   const allRoutes = routesData.items;
   const routesCount = routesData.total;
   const rolesCount = initialRoles.total;

   return (
      <Tabs defaultValue="roles" className="w-full gap-0">
         <TabsList className="bg-secondary/20 border border-primary/20 border-b-0 rounded-none h-auto gap-x-5 p-0 pt-1 px-1 rounded-t-md w-full justify-start overflow-x-auto">
            <div className="flex items-center gap-x-2">
               <TabsTrigger
                  value="roles"
                  className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
               >
                  Roles
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                     {rolesCount}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="route-groups"
                  className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
               >
                  Route Groups
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                     {routeGroupsCount}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="routes"
                  className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
               >
                  Routes
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                     {routesCount}
                  </span>
               </TabsTrigger>
            </div>
         </TabsList>

         <div className="border border-primary/20 border-t-0 rounded-b-md p-4 bg-card">
            <TabsContent value="roles" className="mt-0 space-y-4">
               <RoleTable routeGroups={allRouteGroups} initialData={initialRoles} />
            </TabsContent>

            <TabsContent value="route-groups" className="mt-0 space-y-4">
               <RouteGroupTable routes={allRoutes} initialData={initialRouteGroups} />
            </TabsContent>

            <TabsContent value="routes" className="mt-0 space-y-4">
               <RouteTable routeGroups={allRouteGroups} initialData={initialRoutes} />
            </TabsContent>
         </div>
      </Tabs>
   );
}
