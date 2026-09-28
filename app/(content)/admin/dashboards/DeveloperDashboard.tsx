import { Card } from "@/components/ui/card";

export default function DeveloperDashboard() {
   return (
      <div className="space-y-6">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">Developer Dashboard</h1>
            <p className="text-muted-foreground mt-2">Full system access and control</p>
         </div>

         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">System Access</p>
                  <p className="text-2xl font-bold">Unrestricted</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-2xl font-bold">Developer</p>
               </div>
            </Card>

            <Card className="p-6">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-bold">All</p>
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
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">Manage Users</h3>
                  <p className="text-sm text-muted-foreground">Create, edit, and manage all user accounts</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">Manage Admins</h3>
                  <p className="text-sm text-muted-foreground">Manage admin accounts and permissions</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">RBAC Management</h3>
                  <p className="text-sm text-muted-foreground">Configure roles, routes, and permissions</p>
               </div>
               <div className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors">
                  <h3 className="font-medium">System Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure system-wide settings</p>
               </div>
            </div>
         </Card>
      </div>
   );
}
