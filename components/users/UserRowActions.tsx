"use client";

import { useState, useMemo, type ReactNode } from "react";
import { useAction } from "next-safe-action/hooks";
import { updateUserStatus } from "@/actions/users/update-user-status";
import { deleteUser } from "@/actions/users/delete-user";
import { Pencil, KeyRound, PlayCircle, PauseCircle, UserX, MoreHorizontal } from "lucide-react";
import EditInfoDialog from "./dialogs/EditInfoDialog";
import EditPasswordDialog from "./dialogs/EditPasswordDialog";
import { DeleteConfirmDialog } from "@/components/shared/DeleteConfirmDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";

type Role = "DEVELOPER" | "SUPER_ADMIN" | "ADMIN";
type Status = "ACTIVE" | "INACTIVE" | "SUSPENDED";

type Props = {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    userType?: "ADMIN" | "USER";
    status: Status;
  };
  onChanged: () => void;
  disabled?: boolean;
};

export default function UserRowActions({ user, onChanged, disabled: disabledProp }: Props) {
  const disabled = disabledProp ?? user.role === "DEVELOPER";

  const [openMenu, setOpenMenu] = useState(false);
  const [openInfo, setOpenInfo] = useState(false);
  const [openPass, setOpenPass] = useState(false);

  const { executeAsync: doStatus } = useAction(updateUserStatus);
  const { executeAsync: doDelete } = useAction(deleteUser);

  async function setStatus(status: Status) {
    if (disabled) return;
    setOpenMenu(false);
    const res = await doStatus({ id: user.id, userType: user.userType, status });
    if (res?.data?.ok) {
      toast.success(res.data.message || `User status updated to ${status.toLowerCase()}`);
      onChanged();
    } else {
      toast.error(res?.data?.message || res?.serverError || "Failed to update user status");
    }
  }

  const statusOptions = useMemo((): { key: Status; label: string; icon: ReactNode; className: string }[] => {
    const all = [
      { key: "ACTIVE" as const, label: "Activate", icon: <PlayCircle className="h-4 w-4" />, className: "text-emerald-600" },
      { key: "INACTIVE" as const, label: "Inactivate", icon: <PauseCircle className="h-4 w-4" />, className: "text-orange-600" },
      { key: "SUSPENDED" as const, label: "Suspend", icon: <UserX className="h-4 w-4" />, className: "text-amber-700" },
    ];
    return all.filter(o => o.key !== user.status);
  }, [user.status]);

  if (disabled) {
    return (
      <button
        type="button"
        aria-label="Actions disabled"
        className="h-8 w-8 grid place-items-center rounded-md border border-border opacity-50 cursor-not-allowed"
        disabled
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
    );
  }

  return (
    <>
      <Popover open={openMenu} onOpenChange={setOpenMenu}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-muted text-foreground cursor-pointer transition-colors"
            aria-label="User actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </PopoverTrigger>

        <PopoverContent
          align="end"
          sideOffset={4}
          className="w-48 p-1 text-sm bg-popover text-popover-foreground border border-border rounded-lg shadow-lg"
        >
          {/* Status Sub-options */}
          {statusOptions.map(opt => (
            <button
              key={opt.key}
              type="button"
              className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md cursor-pointer text-sm ${opt.className}`}
              onClick={() => setStatus(opt.key)}
            >
              {opt.icon} {opt.label}
            </button>
          ))}

          <div className="h-px bg-border my-1" />

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md text-foreground cursor-pointer text-sm"
            onClick={() => {
              setOpenMenu(false);
              setOpenInfo(true);
            }}
          >
            <Pencil className="h-4 w-4" /> Edit Info
          </button>

          <button
            type="button"
            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted rounded-md text-foreground cursor-pointer text-sm"
            onClick={() => {
              setOpenMenu(false);
              setOpenPass(true);
            }}
          >
            <KeyRound className="h-4 w-4" /> Edit Password
          </button>

          <div className="h-px bg-border my-1" />

          <div onClick={() => setOpenMenu(false)}>
            <DeleteConfirmDialog
              triggerClassName="w-full flex items-center justify-start gap-2 px-3 py-2 bg-transparent hover:bg-destructive/10 text-destructive shadow-none rounded-md font-normal text-sm cursor-pointer border-none"
              title="Delete User"
              description={`Are you sure you want to delete user "${user.name || user.email}"? This action cannot be undone.`}
              onConfirm={async () => {
                const res = await doDelete({ id: user.id, userType: user.userType });
                if (res?.data?.ok) {
                  toast.success(res.data.message || "User deleted successfully");
                  onChanged();
                } else {
                  toast.error(res?.data?.message || res?.serverError || "Failed to delete user");
                }
              }}
            >
              Delete User
            </DeleteConfirmDialog>
          </div>
        </PopoverContent>
      </Popover>

      {/* Dialogs */}
      <EditInfoDialog open={openInfo} onOpenChange={setOpenInfo} user={user} onSaved={onChanged} />
      <EditPasswordDialog open={openPass} onOpenChange={setOpenPass} userId={user.id} userType={user.userType} onSaved={onChanged} />
    </>
  );
}
