"use client";

import { Wifi, WifiOff } from "lucide-react";
import { useEffect, useState } from "react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";

export default function NetworkStatus() {
   const { isOnline, wasOffline } = useNetworkStatus();
   const [showRestored, setShowRestored] = useState(false);

   useEffect(() => {
      if (isOnline && wasOffline) {
         setShowRestored(true);
         // Hide the "connection restored" message after 3 seconds
         const timer = setTimeout(() => {
            setShowRestored(false);
         }, 3000);
         return () => clearTimeout(timer);
      }
   }, [isOnline, wasOffline]);

   if (!isOnline) {
      return (
         <div className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground p-2">
            <div className="flex items-center justify-center gap-2 text-sm">
               <WifiOff className="h-4 w-4" />
               <span>No internet connection</span>
            </div>
         </div>
      );
   }

   if (showRestored) {
      return (
         <div className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white p-2">
            <div className="flex items-center justify-center gap-2 text-sm">
               <Wifi className="h-4 w-4" />
               <span>Connection restored</span>
            </div>
         </div>
      );
   }

   return null;
}