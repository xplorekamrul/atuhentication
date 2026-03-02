import { Card } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function AdminDashboard() {
   const session = await auth();
   const adminId = session?.user?.id ? BigInt(session.user.id) : null;

   // Get admin's assigned roles
   const adminRoles = adminId
      ? await prisma.adminRole.findMany({
         where: { adminId },
         include: {
            role: {
               include: {
                  roleRouteGroups: {
                     include: {
                        group: {
                           include: {
                              routes: true,
                           },
                        },
                     },
                  },
               },
            },
         },
      })
      : [];

   const roles = adminRoles.map((ar) => ar.role);

   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage resources within your assigned roles</p>
         </div>

         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-2xl font-bold">Admin</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Assigned Roles</p>
                  <p className="text-2xl font-bold">{roles.length}</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Access Level</p>
                  <p className="text-2xl font-bold">Role-Based</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold text-green-600">Active</p>
               </div>
            </Card>
         </div>

         {roles.length > 0 ? (
            <Card className="p-6">
               <h2 className="text-lg font-semibold mb-4">Your Assigned Roles</h2>
               <div className="space-y-3">
                  {roles.map((role) => (
                     <div key={role.id} className="p-4 border rounded-lg">
                        <h3 className="font-medium">{role.name}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                           {role.roleRouteGroups.length} route group{role.roleRouteGroups.length !== 1 ? "s" : ""} assigned
                        </p>
                     </div>
                  ))}
               </div>
            </Card>
         ) : (
            <Card className="p-6 border-dashed">
               <div className="text-center py-8">
                  <p className="text-muted-foreground">No roles assigned yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Contact a Super Admin to assign roles</p>
               </div>
            </Card>
         )}

         <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Available Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">View Profile</h3>
                  <p className="text-sm text-muted-foreground">Manage your account settings</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">Change Password</h3>
                  <p className="text-sm text-muted-foreground">Update your password</p>
               </div>
            </div>
         </Card>
      </div>
   );
}
