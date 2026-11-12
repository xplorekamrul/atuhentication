import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getRedisStatus } from "@/lib/redis/client";
import { Suspense } from "react";

export const metadata = {
  title: "Settings | Admin",
};

async function RedisSettingsContent() {
  const redisStatus = await getRedisStatus();

  const configItems = [
    { key: "Session Version Enforcement", value: "Active (Real-time JWT check)" },
    { key: "Rate Limit Escalation", value: "Redis Lua (1h -> 2h -> 4h -> 8h -> 16h -> 24h)" },
    { key: "RBAC & Sidebar Cache Engine", value: "Redis (1h TTL + Tag Sets, No Use Cache)" },
    {
      key: "Redis Connection Mode",
      value: redisStatus.connected
        ? `Connected (${redisStatus.status})`
        : `Memory Fallback (${redisStatus.status})`,
    },
  ];

  return (
    <AdminDummyPageShell
      routePath="/admin/settings"
      title="Platform Settings"
      description="Test Super Admin restrictions (e.g., disable visibleToSuperAdmin to block SUPER_ADMIN access while keeping DEVELOPER unrestricted)."
      actionLabel="Update Configuration"
      metrics={[
        {
          label: "Cache Store",
          value: redisStatus.connected ? "Redis Live" : "Fallback Mode",
          hint: redisStatus.connected
            ? "Distributed Redis cache active"
            : "Start Docker Redis to switch live",
        },
        { label: "Admin Auth Mode", value: "Credentials", hint: "OAuth disabled on admin side" },
        { label: "Rate Limiter", value: "Redis Lua", hint: "Atomic window + exponential lockouts" },
        { label: "Session Checks", value: "Strict", hint: "Status + sessionVersion verified" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Policy Overview</CardTitle>
          <CardDescription>
            Great for testing <span className="font-mono">visibleToSuperAdmin = false</span> in{" "}
            <span className="font-mono">/admin/rbac</span> and verifying live Redis connection state.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {configItems.map((item) => (
            <div
              key={item.key}
              className="rounded-lg border border-border bg-muted/30 p-3.5 space-y-1"
            >
              <p className="text-xs font-medium text-muted-foreground">{item.key}</p>
              <p className="text-sm font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminDummyPageShell>
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4">
          <div className="h-24 rounded-lg bg-muted/60 animate-pulse" />
          <div className="h-48 rounded-lg bg-muted/60 animate-pulse" />
        </div>
      }
    >
      <RedisSettingsContent />
    </Suspense>
  );
}
