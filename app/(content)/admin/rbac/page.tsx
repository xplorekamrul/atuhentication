import { listRoles } from "@/actions/rbac/roles";
import { listRouteGroups } from "@/actions/rbac/route-groups";
import { listRoutes } from "@/actions/rbac/routes";
import RoleTable from "@/components/rbac/RoleTable";
import RouteGroupTable from "@/components/rbac/RouteGroupTable";
import RouteTable from "@/components/rbac/RouteTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { auth } from "@/lib/auth";
import { Suspense } from "react";


export const metadata = {
   title: "RBAC Management",
   description: "Manage roles, route groups, and routes",
};

async function getAllRouteGroups() {
   const result = await listRouteGroups({ page: 1, pageSize: 100 });
   if (result?.data?.ok) {
      return result.data.items.map((item: any) => ({
         id: item.id,
         name: item.name,
      }));
   }
   return [];
}

async function getAllRoutes() {
   const result = await listRoutes({ page: 1, pageSize: 1000 });
   if (result?.data?.ok) {
      return result.data.items;
   }
   return [];
}

async function getRoleCount() {
   try {
      const result = await listRoles({ page: 1, pageSize: 1 });
      if (result?.data?.ok) {
         return result.data.total;
      }
      return 0;
   } catch {
      return 0;
   }
}

export default async function RBACPage() {
   const session = await auth();
   if (!session?.user) {
      return <div className="p-6">Unauthorized</div>;
   }

   return (
      <div className="space-y-6 p-4 sm:p-6">
         <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">RBAC Management</h1>
            <p className="text-muted-foreground mt-1 text-sm">
               Manage roles, route groups, and routes for your application
            </p>
         </div>

         <Suspense fallback={<div className="space-y-4 text-muted-foreground p-4">Loading RBAC data...</div>}>
            <RBACContent />
         </Suspense>
      </div>
   );
}

async function RBACContent() {
   const [allRouteGroups, allRoutes, rolesCount] = await Promise.all([
      getAllRouteGroups(),
      getAllRoutes(),
      getRoleCount(),
   ]);

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
                     {allRouteGroups.length}
                  </span>
               </TabsTrigger>
               <TabsTrigger
                  value="routes"
                  className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
               >
                  Routes
                  <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                     {allRoutes.length}
                  </span>
               </TabsTrigger>
            </div>
         </TabsList>

         <div className="border border-primary/20 border-t-0 rounded-b-md p-4 bg-card">
            <TabsContent value="roles" className="mt-0 space-y-4">
               <RoleTable routeGroups={allRouteGroups} />
            </TabsContent>

            <TabsContent value="route-groups" className="mt-0 space-y-4">
               <RouteGroupTable routes={allRoutes} />
            </TabsContent>

            <TabsContent value="routes" className="mt-0 space-y-4">
               <RouteTable routeGroups={allRouteGroups} />
            </TabsContent>
         </div>
      </Tabs>
   );
}
