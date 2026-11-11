import UsersContent from "@/components/users/UsersContent";
import { auth } from "@/lib/auth";
import { Suspense } from "react";

export const metadata = {
  title: "User Management | Admin",
};

const pageHeader = (
  <div className="flex flex-col gap-1">
    <h1 className="text-2xl font-bold tracking-tight text-foreground">
      User Management
    </h1>
    <p className="text-sm text-muted-foreground">
      Manage administrative accounts and normal user accounts independently.
    </p>
  </div>
);

async function UsersContentWrapper() {
  const session = await auth();
  if (!session?.user || session.user.userType !== "ADMIN") {
    return <div className="p-6 text-destructive font-medium">Unauthorized</div>;
  }

  return <UsersContent header={pageHeader} />;
}

export default function AdminUsersPage() {
  return (
    <main className="p-4 sm:p-6">
      <Suspense
        fallback={
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {pageHeader}
              <div className="h-10 w-48 rounded-lg bg-muted animate-pulse shrink-0" />
            </div>
            <div className="h-136 rounded-lg bg-muted/60 animate-pulse border border-border" />
          </div>
        }
      >
        <UsersContentWrapper />
      </Suspense>
    </main>
  );
}
