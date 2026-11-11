"use client";

import { updateUserInfo } from "@/actions/users/update-user-info";
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
import { useAction } from "next-safe-action/hooks";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";

type EditUser = {
  id: string;
  name: string | null;
  email: string;
  userType?: "ADMIN" | "USER";
};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  user: EditUser;
  onSaved: () => void;
};

function EditInfoForm({
  user,
  onClose,
  onSaved,
}: {
  user: EditUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const nameId = useId();
  const emailId = useId();
  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email);
  const [serverError, setServerError] = useState<string | null>(null);

  const { executeAsync, result, status } = useAction(updateUserInfo);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<string, string[] | undefined>;
    return { name: errs?.name?.[0], email: errs?.email?.[0] };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    const res = await executeAsync({ id: user.id, userType: user.userType, name, email });
    if (res?.data?.ok) {
      toast.success("User info updated successfully");
      onSaved();
      onClose();
    } else {
      const errorMsg = res?.data?.message ?? res?.serverError ?? "Failed to update user info";
      setServerError(errorMsg);
      toast.error(errorMsg);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (serverError) setServerError(null);
          }}
          placeholder="Full name"
          aria-invalid={!!fieldErrors.name}
          required
        />
        {fieldErrors.name ? (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={emailId}>Email</Label>
        <Input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (serverError) setServerError(null);
          }}
          placeholder="name@example.com"
          aria-invalid={!!fieldErrors.email}
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
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

export default function EditInfoDialog({ open, onOpenChange, user, onSaved }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Info</DialogTitle>
          <DialogDescription>
            Update {user.userType === "ADMIN" ? "admin" : "user"} name and email address.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <EditInfoForm
            key={user.id}
            user={user}
            onClose={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
