import { RouteSyncContent } from "@/components/developer/RouteSyncContent";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata = {
   title: "Developer Tools",
   description: "Developer-only tools for route synchronization and management",
};

export default async function DeveloperPage() {
   const session = await auth();

   // Only allow DEVELOPER and SUPER_ADMIN
   if (
      !session?.user?.id ||
      (session.user.level !== "DEVELOPER" &&
         session.user.level !== "SUPER_ADMIN")
   ) {
      redirect("/unauthorized");
   }

   return (
      <main className="p-4 sm:p-6 space-y-6">
         <div>
            <h1 className="text-3xl font-bold text-tcolor"> Route synchronization and management</h1>
           
         </div>

         <RouteSyncContent />
      </main>
   );
}
