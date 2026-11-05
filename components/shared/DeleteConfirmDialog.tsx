"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DeleteConfirmDialogProps {
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
  isLoading?: boolean;
  triggerClassName?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export function DeleteConfirmDialog({
  onConfirm,
  title = "Delete Item",
  description = "Are you sure you want to delete this item? This action cannot be undone.",
  isLoading = false,
  triggerClassName,
  showIcon = true,
  children,
}: DeleteConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "p-1 hover:bg-destructive/20 bg-destructive/10 rounded-md transition-colors",
          triggerClassName
        )}
        disabled={loading || isLoading}
      >
        {showIcon && <Trash2 className={cn("w-4 h-4 text-destructive", children ? "mr-2" : "")} />}
        {children}
      </Button>

      <DialogContent className="sm:max-w-106">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {showIcon && <Trash2 className="w-5 h-5 text-destructive" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 pt-0">

          <DialogDescription >{description}</DialogDescription>

          <DialogFooter className="flex gap-2 mt-5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading || isLoading}
              className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirm}
              disabled={loading || isLoading}
            >
              {loading || isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Confirm Delete"
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
