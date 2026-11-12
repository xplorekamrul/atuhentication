import { RedisCacheControlCard } from "@/components/admin/ClearRedisCacheButton";
import { Card } from "@/components/ui/card";
import { countRedisCacheKeys } from "@/lib/redis/cache";
import { getRedisStatus } from "@/lib/redis/client";
import Link from "next/link";

const quickActions = [
   {
      href: "/admin/users",
      title: "Manage Users & Admins",
      description: "Create, edit, and manage all user and admin accounts",
   },
   {
      href: "/admin/rbac",
      title: "RBAC Management",
      description: "Configure roles, route groups, and permissions",
   },
   {
      href: "/admin/themes",
      title: "Theme Management",
      description: "Customize and switch application color themes",
   },
   {
      href: "/admin/settings",
      title: "System Settings",
      description: "Inspect Redis cache, rate limits, and system policies",
   },
];

export default async function DeveloperDashboard() {
   const [redisStatus, cacheStats] = await Promise.all([
      getRedisStatus(),
      countRedisCacheKeys(),
   ]);

   return (
      <div className="p-4 sm:p-6 space-y-6">
         <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
               Developer Dashboard
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
               Full system access and control
            </p>
         </div>

         <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="p-6 bg-card border-border shadow-sm">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">System Access</p>
                  <p className="text-2xl font-bold text-card-foreground">Unrestricted</p>
               </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-sm">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Role</p>
                  <p className="text-2xl font-bold text-card-foreground">Developer</p>
               </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-sm">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Permissions</p>
                  <p className="text-2xl font-bold text-card-foreground">All</p>
               </div>
            </Card>

            <Card className="p-6 bg-card border-border shadow-sm">
               <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Status</p>
                  <p className="text-2xl font-bold text-primary">Active</p>
               </div>
            </Card>
         </div>

         <RedisCacheControlCard
            initialConnected={redisStatus.connected}
            initialMode={redisStatus.mode}
            initialKeyCount={cacheStats.count}
         />

         <Card className="p-6 bg-card border-border shadow-sm">
            <h2 className="text-lg font-semibold mb-4 text-card-foreground">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-2">
               {quickActions.map((item) => (
                  <Link
                     key={item.href}
                     href={item.href}
                     className="p-4 border border-border rounded-lg hover:bg-accent transition-colors block"
                  >
                     <h3 className="font-medium text-foreground">{item.title}</h3>
                     <p className="text-sm text-muted-foreground">{item.description}</p>
                  </Link>
               ))}
            </div>
         </Card>
      </div>
   );
}
