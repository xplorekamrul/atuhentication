import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminDashboard from "./dashboards/AdminDashboard";
import DeveloperDashboard from "./dashboards/DeveloperDashboard";
import SuperAdminDashboard from "./dashboards/SuperAdminDashboard";

export default async function AdminPage() {
   const session = await auth();

   if (!session?.user) {
      redirect("/login");
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
