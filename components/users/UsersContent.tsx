"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, Users } from "lucide-react";
import { type ReactNode, useState } from "react";
import UserTable from "./UserTable";

export default function UsersContent({ header }: { header?: ReactNode }) {
  const [accountType, setAccountType] = useState<"ADMIN" | "USER">("ADMIN");

  return (
    <Tabs
      value={accountType}
      onValueChange={(val) => setAccountType(val as "ADMIN" | "USER")}
      className="w-full space-y-5"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {header ?? (
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              User Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage administrative accounts and normal user accounts independently.
            </p>
          </div>
        )}

        <TabsList className="bg-muted/60 border border-border p-1 rounded-lg h-auto inline-flex gap-1 self-start sm:self-auto shrink-0">
          <TabsTrigger
            value="ADMIN"
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Admins</span>
          </TabsTrigger>
          <TabsTrigger
            value="USER"
            className="px-4 py-2 text-sm font-medium rounded-md data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm flex items-center gap-2 cursor-pointer"
          >
            <Users className="h-4 w-4" />
            <span>Users</span>
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="ADMIN" className="mt-0">
        <UserTable accountType="ADMIN" />
      </TabsContent>

      <TabsContent value="USER" className="mt-0">
        <UserTable accountType="USER" />
      </TabsContent>
    </Tabs>
  );
}
