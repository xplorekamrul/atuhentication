import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import AdminDashboard from "./dashboards/AdminDashboard";
import DeveloperDashboard from "./dashboards/DeveloperDashboard";
import SuperAdminDashboard from "./dashboards/SuperAdminDashboard";

async function AdminDashboardSelector() {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const level = (session.user as any)?.level as string | undefined;

  if (level === "DEVELOPER") {
    return <DeveloperDashboard />;
  }

  if (level === "SUPER_ADMIN") {
    return <SuperAdminDashboard />;
  }

  if (level === "ADMIN") {
    return <AdminDashboard />;
  }

  redirect("/unauthorized");
}

export default function AdminPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-10 w-64 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-muted/60 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <AdminDashboardSelector />
    </Suspense>
  );
}
