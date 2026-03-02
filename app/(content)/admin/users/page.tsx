import UserTable from "@/components/users/UserTable";
import { auth } from "@/lib/auth";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) {
    return <div className="p-6">Unauthorized</div>;
  }

  return (
    <main className="p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">User Management</h1>
        {/* <p className="text-sm text-muted-foreground">Manage roles, status, credentials</p> */}
      </div>
      <UserTable />
    </main>
  );
}
