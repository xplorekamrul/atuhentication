import { listRouteGroups } from "@/actions/rbac/route-groups";
import { listRoutes } from "@/actions/rbac/routes";
import RoleTable from "@/components/rbac/RoleTable";
import RouteGroupTable from "@/components/rbac/RouteGroupTable";
import RouteTable from "@/components/rbac/RouteTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

export default function RBACPage() {
   return (
      <div className="space-y-6 p-6">
         <div>
            <h1 className="text-3xl font-bold text-tcolor">RBAC Management</h1>
            <p className="text-muted-foreground mt-1">
               Manage roles, route groups, and routes for your application
            </p>
         </div>

         <Suspense fallback={<div className="space-y-4">Loading RBAC data...</div>}>
            <RBACContent />
         </Suspense>
      </div>
   );
}

async function RBACContent() {
   const [allRouteGroups, allRoutes] = await Promise.all([
      getAllRouteGroups(),
      getAllRoutes(),
   ]);

   return (
      <Tabs defaultValue="roles" className="w-full">
         <TabsList className="grid w-full grid-cols-3 bg-muted">
            <TabsTrigger value="roles" className="data-[state=active]:bg-background ">
               Roles
            </TabsTrigger>
            <TabsTrigger
               value="route-groups"
               className="data-[state=active]:bg-background"
            >
               Route Groups
            </TabsTrigger>
            <TabsTrigger value="routes" className="data-[state=active]:bg-background">
               Routes
            </TabsTrigger>
         </TabsList>

         <TabsContent value="roles" className="space-y-4 mt-6">
            <RoleTable routeGroups={allRouteGroups} />
         </TabsContent>

         <TabsContent value="route-groups" className="space-y-4 mt-6">
            <RouteGroupTable routes={allRoutes} />
         </TabsContent>

         <TabsContent value="routes" className="space-y-4 mt-6">
            <RouteTable routeGroups={allRouteGroups} />
         </TabsContent>
      </Tabs>
   );
}
