import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

type Role = "DEVELOPER" | "SUPER_ADMIN" | "ADMIN" | "USER";

const ROLE_HOME: Record<Role, string> = {
   SUPER_ADMIN: "/admin",
   DEVELOPER: "/admin",
   ADMIN: "/admin",
   USER: "/",
};

export default async function DashboardPage() {
   const session = await auth();

   if (!session || !session.user) {
      redirect("/login");
   }

   const role = (session.user.level || "USER") as Role;
   const target = ROLE_HOME[role] || "/";

   redirect(target);
}
