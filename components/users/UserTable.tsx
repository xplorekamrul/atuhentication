"use client";

import { listUsers } from "@/actions/users/list-users";
import { Filter, Plus, Search } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState } from "react";
import UserRowActions from "./UserRowActions";
import CreateUserDialog from "./dialogs/CreateUserDialog";

type Role = "DEVELOPER" | "SUPER_ADMIN" | "ADMIN";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type Row = {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  status: Status;
  suspendedAt: string | null;
  createdAt: string;
};

type ListUsersData = {
  total: number;
  items: Row[];
};

// ---------- helpers (lenient coercion, no `any`) ----------
function isRole(v: unknown): v is Role {
  return v === "DEVELOPER" || v === "SUPER_ADMIN" || v === "ADMIN";
}
function isStatus(v: unknown): v is Status {
  return v === "ACTIVE" || v === "INACTIVE" || v === "SUSPENDED";
}
function toISO(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  return null;
}

function coerceRow(v: unknown): Row | null {
  if (!v || typeof v !== "object") return null;
  const o = v as Record<string, unknown>;

  const id = typeof o.id === "string" ? o.id : null;
  const email = typeof o.email === "string" ? o.email : null;

  const roleRaw = o.role;
  const statusRaw = o.status;

  const role = isRole(roleRaw) ? roleRaw : null;
  const status = isStatus(statusRaw) ? statusRaw : null;

  if (!id || !email || !role || !status) return null;

  const name =
    typeof o.name === "string" ? o.name : o.name === null ? null : null;

  const suspendedAt = toISO(o.suspendedAt);
  const createdAtStr = toISO(o.createdAt) ?? "";

  return {
    id,
    name,
    email,
    role,
    status,
    suspendedAt,
    createdAt: createdAtStr,
  };
}

function coerceListUsersData(input: unknown): ListUsersData {
  if (!input || typeof input !== "object") return { total: 0, items: [] };

  const o = input as Record<string, unknown>;

  const rawItems = o["items"];
  const itemsUnknown = Array.isArray(rawItems) ? rawItems : [];
  const items: Row[] = itemsUnknown
    .map((x) => coerceRow(x))
    .filter((x): x is Row => Boolean(x));

  const total =
    typeof o["total"] === "number" ? (o["total"] as number) : items.length;

  return { total, items };
}

export default function UserTable() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [q, setQ] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roles, setRoles] = useState<Role[]>([]);
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [openCreate, setOpenCreate] = useState(false);

  const { execute: run, result, status } = useAction(listUsers);

  const { total, items } = coerceListUsersData(result?.data);

  function refresh() {
    run({
      page,
      pageSize,
      q: q.trim() || undefined,
      roles: roles.length ? roles : undefined,
      statuses: statuses.length ? statuses : undefined,
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, roles, statuses]);

  function toggle<T extends string>(arr: T[], v: T): T[] {
    return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
  }

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 hover:bg-light"
            title="Filters"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>

          <div className="relative">
            <input
              className="pl-9 pr-3 py-2 rounded-md border border-border bg-background w-72"
              placeholder="Search by name or email"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (setPage(1), refresh())}
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
          <button
            onClick={() => {
              setPage(1);
              refresh();
            }}
            className="rounded-md border border-border px-3 py-2 hover:bg-light"
          >
            Search
          </button>
        </div>

        <button
          onClick={() => setOpenCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary text-white px-3 py-2 hover:bg-scolor"
        >
          <Plus className="h-4 w-4" /> Add User
        </button>
      </div>

      {/* Filters panel */}
      {showFilters ? (
        <div className="rounded-lg border border-border p-3 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium mb-1">Role</p>
            <div className="flex flex-wrap gap-2">
              {(["ADMIN", "SUPER_ADMIN", "DEVELOPER"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRoles((prev) => toggle(prev, r));
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full border ${
                    roles.includes(r)
                      ? "bg-primary text-white border-primary"
                      : "border-border"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium mb-1">Status</p>
            <div className="flex flex-wrap gap-2">
              {(["ACTIVE", "INACTIVE", "SUSPENDED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatuses((prev) => toggle(prev, s));
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-full border ${
                    statuses.includes(s)
                      ? "bg-primary text-white border-primary"
                      : "border-border"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-border h-[80vh]">
        <table className="min-w-full text-sm">
          <thead className="bg-light">
            <tr className="text-left">
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Role</th>
              <th className="px-3 py-2 ">Status</th>
              <th className="px-3 py-2 ">Actions</th>
            </tr>
          </thead>
          <tbody>
            {status === "executing" && items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-3 py-2">{u.name || "—"}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.role}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs border text-center ${
                        u.status === "ACTIVE"
                          ? "border-emerald-600 text-emerald-700"
                          : u.status === "SUSPENDED"
                          ? "border-red-600 text-red-700"
                          : "border-amber-600 text-amber-700"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  {/* actions button hide for developer role */}
                  <td className="px-3 py-2">
                    {u.role === "DEVELOPER" ? null : (
                      <UserRowActions user={u} onChanged={() => refresh()} />
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > pageSize ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} of {Math.ceil(total / pageSize)} • {total} users
          </p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-2 rounded-md border disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= Math.ceil(total / pageSize)}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-2 rounded-md border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      <CreateUserDialog
        open={openCreate}
        onOpenChange={setOpenCreate}
        onCreated={() => refresh()}
      />
    </div>
  );
}
