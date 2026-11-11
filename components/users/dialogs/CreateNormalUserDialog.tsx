"use client";

import { createNormalUser } from "@/actions/users/create-normal-user";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { useAction } from "next-safe-action/hooks";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
};

function CreateNormalUserForm({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);

  const { executeAsync, status, result } = useAction(createNormalUser);

  const fieldErrors = useMemo(() => {
    const errs = (result?.validationErrors ?? {}) as Record<
      string,
      string[] | undefined
    >;
    return {
      name: errs?.name?.[0],
      username: errs?.username?.[0],
      email: errs?.email?.[0],
      password: errs?.password?.[0],
    };
  }, [result]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await executeAsync({ name, username, email, password });

    if (res?.data?.ok) {
      toast.success("User created successfully");
      onCreated();
      onClose();
    } else {
      toast.error(
        res?.data?.message || res?.serverError || "Failed to create user"
      );
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="normal-user-name">Name</Label>
        <Input
          id="normal-user-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="John Doe"
          required
        />
        {fieldErrors.name ? (
          <p className="text-xs text-destructive">{fieldErrors.name}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="normal-user-username">Username</Label>
        <Input
          id="normal-user-username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="johndoe"
          required
        />
        {fieldErrors.username ? (
          <p className="text-xs text-destructive">{fieldErrors.username}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="normal-user-email">Email</Label>
        <Input
          id="normal-user-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          required
        />
        {fieldErrors.email ? (
          <p className="text-xs text-destructive">{fieldErrors.email}</p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="normal-user-password">Password</Label>
        <div className="relative">
          <Input
            id="normal-user-password"
            type={showPw ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            className="pr-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
        </div>
        {fieldErrors.password ? (
          <p className="text-xs text-destructive">{fieldErrors.password}</p>
        ) : null}
      </div>

      {result?.data && !result.data.ok ? (
        <p className="text-sm text-destructive">
          {result.data.message ?? "Create failed"}
        </p>
      ) : null}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={status === "executing"}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={status === "executing"}>
          {status === "executing" ? "Creating..." : "Create User"}
        </Button>
      </div>
    </form>
  );
}

export default function CreateNormalUserDialog({
  open,
  onOpenChange,
  onCreated,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add User</DialogTitle>
          <DialogDescription>
            Create a standard user account with credential sign-in access.
          </DialogDescription>
        </DialogHeader>

        {open ? (
          <CreateNormalUserForm
            onClose={() => onOpenChange(false)}
            onCreated={onCreated}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

