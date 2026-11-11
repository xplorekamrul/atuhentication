"use client";

import { listUsers } from "@/actions/users/list-users";
import { ColumnDef, DataTable } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import UserRowActions from "./UserRowActions";
import CreateNormalUserDialog from "./dialogs/CreateNormalUserDialog";
import CreateUserDialog from "./dialogs/CreateUserDialog";

type AccountUser = {
  id: string;
  name: string | null;
  username?: string | null;
  email: string | null;
  role: string | null;
  userType: "ADMIN" | "USER";
  status: string;
  createdAt: Date | string;
};

type UserStatusTab = "ALL" | "ACTIVE" | "INACTIVE" | "SUSPENDED";

export default function UserTable({
  accountType = "ADMIN",
}: {
  accountType?: "ADMIN" | "USER";
}) {
  const isAdminTab = accountType === "ADMIN";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({
    ALL: 0,
    ACTIVE: 0,
    INACTIVE: 0,
    SUSPENDED: 0,
  });
  const [filterStatus, setFilterStatus] = useState<UserStatusTab>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const requestIdRef = useRef(0);

  const { executeAsync: doList } = useAction(listUsers);

  async function loadUsers(
    targetPage = page,
    statusTab = filterStatus,
    query = debouncedQuery,
    targetPageSize = pageSize
  ) {
    const reqId = ++requestIdRef.current;
    setIsLoading(true);
    try {
      const statuses =
        statusTab === "ALL"
          ? undefined
          : [statusTab as "ACTIVE" | "INACTIVE" | "SUSPENDED"];

      const result = await doList({
        page: targetPage,
        pageSize: targetPageSize,
        q: query.trim() || undefined,
        statuses,
        userType: accountType,
      });

      if (reqId !== requestIdRef.current) return;

      if (result?.data?.ok) {
        setUsers(result.data.items || []);
        setTotal(result.data.total || 0);
        if (result.data.counts) {
          setCounts(result.data.counts);
        }
      }
    } catch (error) {
      if (reqId !== requestIdRef.current) return;
      console.error("Failed to load accounts:", error);
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedQuery) return;

    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedQuery(trimmed);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, debouncedQuery]);

  useEffect(() => {
    loadUsers(page, filterStatus, debouncedQuery, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountType, page, filterStatus, debouncedQuery, pageSize]);

  const getUserActionProps = (user: AccountUser) => {
    const originalId = user.id.replace(/^(admin|user)-/, "");
    return {
      id: originalId,
      name: user.name,
      email: user.email || "",
      role: (user.role || null) as "DEVELOPER" | "SUPER_ADMIN" | "ADMIN" | null,
      userType: user.userType,
      status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
    };
  };

  const columns: ColumnDef<AccountUser>[] = useMemo(() => {
    const baseCols: ColumnDef<AccountUser>[] = [
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
        header: "Username",
        accessorKey: "username",
        sortable: true,
        cell: (user) => (
          <span className="font-mono text-xs text-muted-foreground">
            {user.username || "—"}
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
    ];

    if (isAdminTab) {
      baseCols.push({
        header: "Admin Level",
        accessorKey: "role",
        sortable: true,
        cell: (user) => (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/20">
            {user.role || "ADMIN"}
          </span>
        ),
      });
    }

    baseCols.push(
      {
        header: "Status",
        accessorKey: "status",
        sortable: true,
        cell: (user) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${
              user.status === "ACTIVE"
                ? "border-emerald-600/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : user.status === "SUSPENDED"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-amber-600/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
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
              onChanged={() =>
                loadUsers(page, filterStatus, debouncedQuery, pageSize)
              }
            />
          </div>
        ),
      }
    );

    return baseCols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminTab, page, filterStatus, debouncedQuery, pageSize]);

  return (
    <div className="space-y-4">
      <Tabs
        value={filterStatus}
        onValueChange={(val) => {
          setFilterStatus(val as UserStatusTab);
          setSearchQuery("");
          setDebouncedQuery("");
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
              {isAdminTab ? "All Admins" : "All Users"}
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10">
                {counts.ALL}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="ACTIVE"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Active
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10">
                {counts.ACTIVE}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="INACTIVE"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Inactive
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10">
                {counts.INACTIVE}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="SUSPENDED"
              className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2"
            >
              Suspended
              <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10">
                {counts.SUSPENDED}
              </span>
            </TabsTrigger>
          </div>

          <div className="flex items-center justify-end gap-2 mr-2 my-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  isAdminTab
                    ? "Search admin name, email..."
                    : "Search user name, email..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 text-sm w-48 sm:w-64 pl-8 bg-background"
                aria-label={isAdminTab ? "Search admins" : "Search users"}
              />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={() => setOpenCreate(true)}
              className="h-8 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" />
              {isAdminTab ? "Add Admin" : "Add User"}
            </Button>
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
                emptyMessage={
                  isAdminTab
                    ? "No admins match your filters."
                    : "No users match your filters."
                }
                enableColumnResizing={true}
                enableRowResizing={true}
                tableId={
                  isAdminTab ? "admin-accounts-table" : "normal-users-table"
                }
                pagination={{
                  page,
                  total,
                  pageSize,
                  onPageChange: (newPage) => setPage(newPage),
                  onPageSizeChange: (newPageSize) => {
                    setPageSize(newPageSize);
                    setPage(1);
                  },
                  pageSizeOptions: [10, 20, 50, 100],
                }}
                className="rounded-t-none border-t-0 h-[500px]"
              />
            </TabsContent>
          )
        )}
      </Tabs>

      {isAdminTab ? (
        <CreateUserDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          onCreated={() =>
            loadUsers(page, filterStatus, debouncedQuery, pageSize)
          }
        />
      ) : (
        <CreateNormalUserDialog
          open={openCreate}
          onOpenChange={setOpenCreate}
          onCreated={() =>
            loadUsers(page, filterStatus, debouncedQuery, pageSize)
          }
        />
      )}
    </div>
  );
}
