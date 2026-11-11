import UserTable from "@/components/users/UserTable";
import { auth } from "@/lib/auth";
import { Suspense } from "react";

async function UsersContentWrapper() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "ADMIN") {
    return <div className="p-6 text-destructive font-medium">Unauthorized</div>;
  }

  return <UserTable />;
}

export default function AdminUsersPage() {
  return (
    <main className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User Management</h1>
      </div>
      <Suspense fallback={<div className="h-64 rounded-lg bg-muted animate-pulse" />}>
        <UsersContentWrapper />
      </Suspense>
    </main>
  );
}
