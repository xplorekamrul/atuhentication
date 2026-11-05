"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";
import { useTransition } from "react";
import { syncRoutesToDatabase } from "@/actions/rbac/sync-routes";

interface SyncRoutesButtonProps {
   onSyncComplete?: () => void;
   className?: string;
}

export function SyncRoutesButton({
   onSyncComplete,
   className = "",
}: SyncRoutesButtonProps) {
   const [isPending, startTransition] = useTransition();
   const { toast } = useToast();

   async function handleSync() {
      startTransition(async () => {
         try {
            const result = await syncRoutesToDatabase();
            if (result.ok) {
               toast({
                  title: "Success",
                  description: result.message,
               });
               onSyncComplete?.();
            } else {
               toast({
                  title: "Error",
                  description: result.message,
                  variant: "destructive",
               });
            }
         } catch (error) {
            const errorMsg =
               error instanceof Error ? error.message : "Unknown error";
            toast({
               title: "Error",
               description: errorMsg,
               variant: "destructive",
            });
         }
      });
   }

   return (
      <Button
         type="button"
         onClick={handleSync}
         disabled={isPending}
         className={`inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50 h-8.5 ${className}`}
      >
         <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
         {isPending ? "Syncing..." : "Sync Routes"}
      </Button>
   );
}
