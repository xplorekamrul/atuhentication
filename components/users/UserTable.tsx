"use client";

import { listUsers } from "@/actions/users/list-users";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import CreateUserDialog from "./dialogs/CreateUserDialog";
import UserRowActions from "./UserRowActions";

type User = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  userType: "ADMIN" | "USER";
  status: string;
  createdAt: Date | string;
};

export default function UserTable() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [openCreate, setOpenCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { executeAsync: doList } = useAction(listUsers);

  async function loadUsers(searchTerm = "") {
    setIsLoading(true);
    try {
      const result = await doList({ page, pageSize, q: searchTerm || undefined });
      if (result?.data?.ok) {
        setUsers(result.data.items || []);
        setTotal(result.data.total || 0);
      }
    } catch (error) {
      console.error("Failed to load users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers(searchQuery);
  }, [page, searchQuery]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setPage(1);
  };

  const totalPages = Math.ceil(total / pageSize);

  // Convert user ID back to original format for UserRowActions
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

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              className="pl-9 pr-3 py-2 rounded-md border border-border bg-background w-72"
              placeholder="Search by name or email"
              value={searchQuery}
              onChange={handleSearch}
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-3 py-2 hover:bg-scolor cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Table Card */}
      <Card className="border-border p-0">
        <CardContent className="p-0!">
          <div className="overflow-y-auto rounded-lg border border-border h-screen">
            <table className="min-w-full text-sm">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">User Type</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      Loading…
                    </td>
                  </tr>
                ) : users.length > 0 ? (
                  users.map((user, index) => (
                    <tr
                      key={user.id}
                      className={`border-t border-border ${index % 2 === 0 ? "bg-white" : "bg-primary/5"
                        } hover:bg-primary/10 transition`}
                    >
                      <td className="px-4 py-3">{user.name || "—"}</td>
                      <td className="px-4 py-3">{user.email || "—"}</td>
                      <td className="px-4 py-3">{user.role || "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${user.userType === "ADMIN"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-gray-100 text-gray-800"
                            }`}
                        >
                          {user.userType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border ${user.status === "ACTIVE"
                            ? "border-emerald-600 text-emerald-700"
                            : user.status === "SUSPENDED"
                              ? "border-red-600 text-red-700"
                              : "border-amber-600 text-amber-700"
                            }`}
                        >
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {(() => {
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
                        })()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <UserRowActions
                          user={getUserActionProps(user)}
                          onChanged={() => loadUsers()}
                        />
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                      No users found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {total > pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {totalPages} • {total} users
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-md border disabled:opacity-50 hover:bg-light cursor-pointer"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded-md border disabled:opacity-50 hover:bg-light cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => loadUsers()}
      />
    </div>
  );
}
