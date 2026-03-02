"use client";

import { assignUserToRole, listRoleUsers, removeUserFromRole } from "@/actions/rbac/role-users";
import { listUsers } from "@/actions/users/list-users";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useEffect, useState, useTransition } from "react";

type User = {
  id: string | bigint;
  name: string | null;
  email: string | null;
  username?: string | null;
  userlevel: string;
  status: string;
  suspendedAt?: Date | null;
  createdAt: string | Date;
};

type Role = {
  id: string | bigint;
  name: string;
};

export default function AssignUsersDialog({
  open,
  onOpenChange,
  role,
  onClose,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
  onClose: (refreshed: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [assignedUsers, setAssignedUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const { executeAsync: doListRoleUsers } = useAction(listRoleUsers);
  const { executeAsync: doListUsers } = useAction(listUsers);
  const { executeAsync: doAssign } = useAction(assignUserToRole);
  const { executeAsync: doRemove } = useAction(removeUserFromRole);

  // Fetch assigned users and available users
  useEffect(() => {
    if (!open || !role) return;

    startTransition(async () => {
      const [assignedResult, availableResult] = await Promise.all([
        doListRoleUsers({ roleId: String(role.id), page: 1, pageSize: 100 }),
        doListUsers({ page: 1, pageSize: 100 }),
      ]);

      if (assignedResult?.data?.ok) {
        setAssignedUsers(assignedResult.data.items);
      }

      if (availableResult?.data?.ok) {
        // Filter out DEVELOPER users
        const filtered = availableResult.data.items.filter(
          (user) => user.userlevel !== "DEVELOPER"
        );
        setAvailableUsers(filtered);
      }
    });
  }, [open, role, doListRoleUsers, doListUsers]);

  const normalizeId = (id: string | bigint): string => String(id);

  async function handleAssignUser(user: User) {
    if (!role) return;

    startTransition(async () => {
      const result = await doAssign({
        userId: normalizeId(user.id),
        roleId: normalizeId(role.id),
      });

      if (result?.data?.ok) {
        // Refetch assigned users
        const assignedResult = await doListRoleUsers({
          roleId: normalizeId(role.id),
          page: 1,
          pageSize: 100,
        });
        if (assignedResult?.data?.ok) {
          setAssignedUsers(assignedResult.data.items);
        }
        // Remove from available
        setAvailableUsers((prev) =>
          prev.filter((u) => normalizeId(u.id) !== normalizeId(user.id))
        );
      } else {
        alert(result?.data?.error || "Failed to assign user");
      }
    });
  }

  async function handleRemoveUser(user: User) {
    if (!confirm(`Remove ${user.name || user.email} from this role?`)) return;
    if (!role) return;

    startTransition(async () => {
      try {
        const result = await doRemove({
          userId: normalizeId(user.id),
          roleId: normalizeId(role.id),
        });

        if (result?.data?.ok) {
          // Remove from assigned users immediately
          setAssignedUsers((prev) =>
            prev.filter((u) => normalizeId(u.id) !== normalizeId(user.id))
          );
          // Add to available users if not already there
          setAvailableUsers((prev) => {
            const exists = prev.some(
              (u) => normalizeId(u.id) === normalizeId(user.id)
            );
            return exists ? prev : [...prev, user];
          });
        } else {
          const errorMsg = result?.data?.error || "Failed to remove user";
          console.error("Remove user error:", errorMsg);
          alert(errorMsg);
        }
      } catch (error) {
        console.error("Remove user exception:", error);
        alert("An error occurred while removing the user");
      }
    });
  }

  const filteredAvailable = availableUsers.filter((u) => {
    const uIdStr = normalizeId(u.id);
    const isAssigned = assignedUsers.some(
      (au) => normalizeId(au.id) === uIdStr
    );
    const matchesSearch =
      u.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username?.toLowerCase().includes(searchQuery.toLowerCase());
    return !isAssigned && matchesSearch;
  });

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen) {
      onClose(true);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Users to Role: {role?.name}</DialogTitle>
          <DialogDescription>
            Add or remove users from this role
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Assigned Users */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">
              Assigned Users ({assignedUsers.length})
            </h3>
            <div className="border border-border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {assignedUsers.length > 0 ? (
                assignedUsers.map((user) => (
                  <div
                    key={`assigned-${normalizeId(user.id)}`}
                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveUser(user)}
                      disabled={isPending}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No users assigned yet
                </p>
              )}
            </div>
          </div>

          {/* Available Users */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Available Users</h3>
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-border"
            />
            <div className="border border-border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
              {filteredAvailable.length > 0 ? (
                filteredAvailable.map((user) => (
                  <div
                    key={`available-${normalizeId(user.id)}`}
                    className="flex items-center justify-between p-2 bg-muted rounded hover:bg-muted/80"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignUser(user)}
                      disabled={isPending}
                      className="ml-2"
                    >
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No available users
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button
            variant="outline"
            onClick={() => handleDialogClose(false)}
            disabled={isPending}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
