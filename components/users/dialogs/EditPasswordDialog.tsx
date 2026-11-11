"use client";

import { updateUserPassword } from "@/actions/users/update-user-password";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userType?: "ADMIN" | "USER";
  onSaved: () => void;
};

function EditPasswordForm({
  userId,
  userType,
  onClose,
  onSaved,
}: {
  userId: string;
  userType?: "ADMIN" | "USER";
  onClose: () => void;
  onSaved: () => void;
}) {
  const newPasswordId = useId();
  const confirmPasswordId = useId();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { executeAsync, status, result } = useAction(updateUserPassword);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { password: errs?.password?.[0], confirm: errs?.confirm?.[0] };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const res = await executeAsync({ id: userId, userType, password: pw, confirm });
    if (res?.data?.ok) {
      toast.success("Password updated successfully");
      onSaved();
      onClose();
    } else {
      const errorMsg = res?.data?.message ?? res?.serverError ?? "Failed to update password";
      setServerError(errorMsg);
      toast.error(errorMsg);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={newPasswordId}>New password</Label>
        <div className="relative">
          <Input
            id={newPasswordId}
            type={show1 ? "text" : "password"}
            value={pw}
            onChange={(e) => {
              setPw(e.target.value);
              if (serverError) setServerError(null);
            }}
            placeholder="At least 6 characters"
            className="pr-10"
            aria-invalid={!!fieldErrors.password}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setShow1((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
            aria-label={show1 ? "Hide new password" : "Show new password"}
          >
            {show1 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {fieldErrors.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={confirmPasswordId}>Confirm password</Label>
        <div className="relative">
          <Input
            id={confirmPasswordId}
            type={show2 ? "text" : "password"}
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              if (serverError) setServerError(null);
            }}
            placeholder="Re-enter new password"
            className="pr-10"
            aria-invalid={!!fieldErrors.confirm}
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setShow2((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
            aria-label={show2 ? "Hide confirm password" : "Show confirm password"}
          >
            {show2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        {fieldErrors.confirm ? (
          <p className="text-xs text-destructive">{fieldErrors.confirm}</p>
        ) : null}
      </div>

      {serverError ? (
        <p className="text-sm text-destructive">{serverError}</p>
      ) : null}

      <DialogFooter className="pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={status === "executing"}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={status === "executing"}>
          {status === "executing" ? "Saving..." : "Save"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export default function EditPasswordDialog({ open, onOpenChange, userId, userType, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Password</DialogTitle>
          <DialogDescription>
            Set a new password for this {userType === "ADMIN" ? "admin" : "user"} account.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EditPasswordForm
            key={userId}
            userId={userId}
            userType={userType}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
