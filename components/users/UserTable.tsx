"use client";

import { listUsers } from "@/actions/users/list-users";
import { Plus } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useMemo } from "react";
import CreateUserDialog from "./dialogs/CreateUserDialog";
import UserRowActions from "./UserRowActions";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  userType: "ADMIN" | "USER";
  status: string;
  createdAt: Date | string;
};

type UserStatusTab = "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

export default function UserTable() {
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    ALL: 0,
    ACTIVE: 0,
    INACTIVE: 0,
    SUSPENDED: 0,
  });
  const [filterStatus, setFilterStatus] = useState<UserStatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const { executeAsync: doList } = useAction(listUsers);

  async function loadUsers(
    targetPage = page,
    statusTab = filterStatus,
    query = searchQuery
  ) {
    setIsLoading(true);
    try {
      const statuses =
        statusTab === "ALL"
          ? undefined
          : [statusTab as "ACTIVE" | "INACTIVE" | "SUSPENDED"];

      const result = await doList({
        page: targetPage,
        pageSize,
        q: query || undefined,
        statuses,
      });

      if (result?.data?.ok) {
        setUsers(result.data.items || []);
        setTotal(result.data.total || 0);
        if (result.data.counts) {
          setCounts(result.data.counts);
        }
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(page, filterStatus, searchQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadUsers(1, filterStatus, searchQuery);
  };

  const getUserActionProps = (user: User) => {
    const originalId = user.id.replace(/^(admin|user)-/, "");
    return {
      id: originalId,
      name: user.name,
      email: user.email || "",
      role: (user.role || "ADMIN") as "DEVELOPER" | "SUPER_ADMIN" | "ADMIN",
      status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    };
  };

  const columns: ColumnDef<User>[] = useMemo(
    () => [
      {
        header: "Name",
        accessorKey: "name",
        sortable: true,
        cell: (user) => (
          <span className="font-medium text-foreground">
            {user.name || "—"}
          </span>
        ),
      },
      {
        header: "Email",
        accessorKey: "email",
        sortable: true,
        cell: (user) => (
          <span className="text-muted-foreground">{user.email || "—"}</span>
        ),
      },
      {
        header: "Role",
        accessorKey: "role",
        sortable: true,
        cell: (user) => user.role || "—",
      },
      {
        header: "User Type",
        accessorKey: "userType",
        sortable: true,
        cell: (user) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              user.userType === "ADMIN"
                ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {user.userType}
          </span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        sortable: true,
        cell: (user) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              user.status === "ACTIVE"
                ? "border-emerald-600/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                : user.status === "SUSPENDED"
                ? "border-red-600/30 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                : "border-amber-600/30 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
            }`}
          >
            {user.status}
          </span>
        ),
      },
      {
        header: "Created",
        accessorKey: "createdAt",
        sortable: true,
        cell: (user) => {
          try {
            const date =
              typeof user.createdAt === "string"
                ? new Date(user.createdAt)
                : user.createdAt instanceof Date
                ? user.createdAt
                : new Date(user.createdAt);
            return isNaN(date.getTime())
              ? "—"
              : date.toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                });
          } catch {
            return "—";
          }
        },
      },
      {
        header: "Actions",
        className: "text-right",
        cell: (user) => (
          <div className="flex justify-end">
            <UserRowActions
              user={getUserActionProps(user)}
              onChanged={() => loadUsers(page, filterStatus, searchQuery)}
            />
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [page, filterStatus, searchQuery]
  );

  return (
    <div className="space-y-4">
      <Tabs
        value={filterStatus}
        onValueChange={(val) => {
          setFilterStatus(val as UserStatusTab);
          setSearchQuery("");
          setPage(1);
        }}
        className="w-full gap-0"
      >
        <TabsList className="bg-secondary/20 border border-primary/20 border-b-0 rounded-none h-auto gap-x-5 p-0 pt-1 px-1 rounded-t-md w-full justify-between flex-wrap sm:flex-nowrap">
          <div className="flex items-center gap-x-2 overflow-x-auto">
            <TabsTrigger
              value="ALL"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              All Users
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                {counts.ALL}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ACTIVE"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Active
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                {counts.ACTIVE}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="INACTIVE"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Inactive
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                {counts.INACTIVE}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="SUSPENDED"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Suspended
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                {counts.SUSPENDED}
              </span>
            </TabsTrigger>
          </div>

          <div className="flex items-center justify-end gap-2 mr-2 my-1">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <input
                type="text"
                placeholder="Search name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-1 border rounded-sm text-sm w-48 sm:w-64 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="submit"
                className="px-3 py-1 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
              >
                Search
              </button>
            </form>

            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-sm bg-primary text-primary-foreground px-3 py-1 text-sm font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer whitespace-nowrap"
            >
              <Plus className="h-4 w-4" /> Add User
            </button>
          </div>
        </TabsList>

        {(["ALL", "ACTIVE", "INACTIVE", "SUSPENDED"] as const).map(
          (tabValue) => (
            <TabsContent key={tabValue} value={tabValue} className="mt-0">
              <DataTable
                data={users}
                columns={columns}
                keyExtractor={(u) => u.id}
                isLoading={isLoading}
                emptyMessage="No users match your filters."
                enableColumnResizing={true}
                enableRowResizing={true}
                tableId="admin-users-table"
                pagination={{
                  page,
                  total,
                  pageSize,
                  onPageChange: (newPage) => setPage(newPage),
                }}
                className="rounded-t-none border-t-0"
              />
            </TabsContent>
          )
        )}
      </Tabs>

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => loadUsers(page, filterStatus, searchQuery)}
      />
    </div>
  );
}
