import { Card } from "@/components/ui/card";

export default function SuperAdminDashboard() {
   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Super Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">Manage all system resources and configurations</p>
         </div>

         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">System Access</p>
                  <p className="text-2xl font-bold">Full</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-2xl font-bold">Super Admin</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-bold">Database</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold text-green-600">Active</p>
               </div>
            </Card>
         </div>

         <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Management Areas</h2>
            <div className="grid gap-4 md:grid-cols-2">
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">User Management</h3>
                  <p className="text-sm text-muted-foreground">View and manage all user accounts</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">RBAC Configuration</h3>
                  <p className="text-sm text-muted-foreground">Configure roles, routes, and permissions</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">Admin Accounts</h3>
                  <p className="text-sm text-muted-foreground">Manage admin user accounts</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">System Logs</h3>
                  <p className="text-sm text-muted-foreground">View system activity and logs</p>
               </div>
            </div>
         </Card>
      </div>
   );
}
