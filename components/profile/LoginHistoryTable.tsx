"use client";

import { Globe, Monitor, Smartphone, Tablet } from "lucide-react";
import { useMemo, useState } from "react";
import { UAParser } from "ua-parser-js";
import { DataTable, ColumnDef } from "@/components/shared/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type LoginHistoryItem = {
   id: string;
   ipAddress: string | null;
   userAgent: string | null;
   location: string | null;
   createdAt: string; // ISO string
};

type ParsedHistoryItem = LoginHistoryItem & {
   deviceName: string;
   category: "DESKTOP" | "MOBILE" | "OTHER";
   Icon: typeof Globe;
};

type FilterTab = "ALL" | "DESKTOP" | "MOBILE";

export default function LoginHistoryTable({ history }: { history: LoginHistoryItem[] }) {
   const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
   const [searchQuery, setSearchQuery] = useState("");
   const [page, setPage] = useState(1);
   const pageSize = 10;

   const parsedHistory = useMemo((): ParsedHistoryItem[] => {
      return history.map((item) => {
         const parser = new UAParser(item.userAgent || "");
         const result = parser.getResult();

         const deviceType = result.device.type; // mobile, tablet, etc.
         const os = result.os.name;
         const browser = result.browser.name;

         let Icon = Globe;
         let category: "DESKTOP" | "MOBILE" | "OTHER" = "DESKTOP";

         if (deviceType === "mobile" || deviceType === "tablet") {
            Icon = deviceType === "mobile" ? Smartphone : Tablet;
            category = "MOBILE";
         } else if (!deviceType) {
            Icon = Monitor;
            category = "DESKTOP";
         } else {
            category = "OTHER";
         }

         const deviceName = `${os || "Unknown OS"} - ${browser || "Unknown Browser"}`;

         return {
            ...item,
            deviceName,
            category,
            Icon,
         };
      });
   }, [history]);

   const counts = useMemo(() => {
      return {
         ALL: parsedHistory.length,
         DESKTOP: parsedHistory.filter((i) => i.category === "DESKTOP").length,
         MOBILE: parsedHistory.filter((i) => i.category === "MOBILE").length,
      };
   }, [parsedHistory]);

   const filteredHistory = useMemo(() => {
      let filtered = parsedHistory;

      if (activeTab === "DESKTOP") {
         filtered = filtered.filter((i) => i.category === "DESKTOP");
      } else if (activeTab === "MOBILE") {
         filtered = filtered.filter((i) => i.category === "MOBILE");
      }

      if (searchQuery.trim()) {
         const q = searchQuery.toLowerCase().trim();
         filtered = filtered.filter(
            (i) =>
               i.deviceName.toLowerCase().includes(q) ||
               (i.ipAddress && i.ipAddress.toLowerCase().includes(q)) ||
               (i.location && i.location.toLowerCase().includes(q))
         );
      }

      return filtered;
   }, [parsedHistory, activeTab, searchQuery]);

   const paginatedData = useMemo(() => {
      const start = (page - 1) * pageSize;
      return filteredHistory.slice(start, start + pageSize);
   }, [filteredHistory, page, pageSize]);

   const handleSearchSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      setPage(1);
   };

   const columns: ColumnDef<ParsedHistoryItem>[] = useMemo(
      () => [
         {
            header: "Device",
            accessorKey: "deviceName",
            sortable: true,
            cell: (item) => (
               <div className="flex items-center gap-3">
                  <div className="p-1.5 rounded-full bg-primary/10 text-primary shrink-0">
                     <item.Icon className="h-4 w-4" />
                  </div>
                  <span className="font-medium text-foreground">{item.deviceName}</span>
               </div>
            ),
         },
         {
            header: "Location",
            accessorKey: "location",
            sortable: true,
            cell: (item) => (
               <span className="text-muted-foreground">{item.location || "Unknown"}</span>
            ),
         },
         {
            header: "IP Address",
            accessorKey: "ipAddress",
            sortable: true,
            cell: (item) => (
               <span className="font-mono text-xs">{item.ipAddress || "—"}</span>
            ),
         },
         {
            header: "Time",
            accessorKey: "createdAt",
            sortable: true,
            cell: (item) => (
               <span className="text-muted-foreground text-xs">
                  {new Date(item.createdAt).toLocaleString()}
               </span>
            ),
         },
      ],
      []
   );

   return (
      <div className="space-y-2">
         <div>
            <h2 className="text-xl font-semibold">Login History</h2>
            <p className="text-sm text-muted-foreground">Recent login activity for your account.</p>
         </div>

         <Tabs
            value={activeTab}
            onValueChange={(val) => {
               setActiveTab(val as FilterTab);
               setSearchQuery("");
               setPage(1);
            }}
            className="w-full gap-0"
         >
            <TabsList className="bg-secondary/20 border border-primary/20 border-b-0 rounded-none h-auto gap-x-5 p-0 pt-1 px-1 rounded-t-md w-full justify-between flex-wrap sm:flex-nowrap">
               <div className="flex items-center gap-x-2 overflow-x-auto">
                  <TabsTrigger
                     value="ALL"
                     className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
                  >
                     All Sessions
                     <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                        {counts.ALL}
                     </span>
                  </TabsTrigger>
                  <TabsTrigger
                     value="DESKTOP"
                     className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
                  >
                     Desktop
                     <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                        {counts.DESKTOP}
                     </span>
                  </TabsTrigger>
                  <TabsTrigger
                     value="MOBILE"
                     className="bg-transparent text-foreground/70 data-[state=active]:text-primary data-[state=active]:bg-card rounded-t-sm flex items-center gap-x-2 font-medium data-[state=active]:shadow-none pb-2 text-sm"
                  >
                     Mobile & Tablet
                     <span className="inline-flex items-center justify-center min-w-6 h-6 px-1.5 text-xs font-semibold rounded-lg border border-primary/10 text-foreground bg-primary/10 hover:bg-primary/40">
                        {counts.MOBILE}
                     </span>
                  </TabsTrigger>
               </div>

               <div className="flex justify-end gap-2 mr-2 my-1">
                  <form onSubmit={handleSearchSubmit} className="flex gap-2">
                     <input
                        type="text"
                        placeholder="Search IP, location..."
                        value={searchQuery}
                        onChange={(e) => {
                           setSearchQuery(e.target.value);
                           setPage(1);
                        }}
                        className="px-3 py-1 border rounded-sm text-sm w-48 sm:w-64 bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                     />
                     <button
                        type="submit"
                        className="px-3 py-1 bg-primary text-primary-foreground rounded-sm text-sm font-medium hover:opacity-90 transition-opacity shadow-sm cursor-pointer"
                     >
                        Search
                     </button>
                  </form>
               </div>
            </TabsList>

            {(["ALL", "DESKTOP", "MOBILE"] as const).map((tabValue) => (
               <TabsContent key={tabValue} value={tabValue} className="mt-0">
                  <DataTable<ParsedHistoryItem>
                     data={paginatedData}
                     columns={columns}
                     keyExtractor={(item) => item.id}
                     emptyMessage="No login records match your filters."
                     enableColumnResizing={true}
                     enableRowResizing={true}
                     tableId="profile-login-history-table"
                     pagination={{
                        page,
                        total: filteredHistory.length,
                        pageSize,
                        onPageChange: (newPage) => setPage(newPage),
                     }}
                     className="rounded-t-none border-t-0"
                  />
               </TabsContent>
            ))}
         </Tabs>
      </div>
   );
}
