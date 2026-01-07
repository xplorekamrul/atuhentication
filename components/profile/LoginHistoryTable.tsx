"use client";

import { Globe, Monitor, Smartphone, Tablet } from "lucide-react"; // Icons for devices
import { useMemo } from "react";
import { UAParser } from "ua-parser-js";

type LoginHistoryItem = {
   id: string;
   ipAddress: string | null;
   userAgent: string | null;
   location: string | null;
   createdAt: string; // ISO string
};

export default function LoginHistoryTable({ history }: { history: LoginHistoryItem[] }) {

   const parsedHistory = useMemo(() => {
      return history.map((item) => {
         const parser = new UAParser(item.userAgent || "");
         const result = parser.getResult();

         const deviceType = result.device.type; // mobile, tablet, console, smarttv, wearable, embedded
         const os = result.os.name;
         const browser = result.browser.name;

         let Icon = Globe;
         if (deviceType === "mobile") Icon = Smartphone;
         else if (deviceType === "tablet") Icon = Tablet;
         else if (!deviceType) Icon = Monitor; // Default to monitor/desktop

         const deviceName = `${os || "Unknown OS"} - ${browser || "Unknown Browser"}`;

         return {
            ...item,
            deviceName,
            Icon,
         };
      });
   }, [history]);

   if (history.length === 0) {
      return (
         <div className="border rounded-lg bg-card p-6 text-center text-muted-foreground">
            No login history available yet.
         </div>
      );
   }

   return (
      <div className="border rounded-lg bg-card shadow-sm overflow-hidden">
         <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">Login History</h2>
            <p className="text-sm text-muted-foreground">Recent login activity for your account.</p>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="bg-muted/50 text-muted-foreground font-medium">
                  <tr>
                     <th className="px-6 py-3">Device</th>
                     <th className="px-6 py-3">Location</th>
                     <th className="px-6 py-3">IP Address</th>
                     <th className="px-6 py-3">Time</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-border">
                  {parsedHistory.map((item) => (
                     <tr key={item.id} className="bg-background hover:bg-muted/50 transition-colors">
                        <td className="px-6 py-4">
                           <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10 text-primary">
                                 <item.Icon className="h-4 w-4" />
                              </div>
                              <span className="font-medium">{item.deviceName}</span>
                           </div>
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                           {item.location || "Unknown"}
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">
                           {item.ipAddress || "—"}
                        </td>
                        <td className="px-6 py-4 text-muted-foreground">
                           {new Date(item.createdAt).toLocaleString()}
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
   );
}
