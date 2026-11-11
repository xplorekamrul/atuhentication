import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Settings | Admin",
};

const configItems = [
  { key: "Session Version Enforcement", value: "Active (Real-time JWT check)" },
  { key: "Rate Limit Escalation", value: "1h -> 2h -> 4h -> 8h -> 16h -> 24h" },
  { key: "RBAC Proxy Cache Layer", value: "Layer 1 In-Memory (10m TTL)" },
  { key: "RBAC Data Cache Layer", value: "Layer 2 Next.js 16 Use Cache" },
];

export default function AdminSettingsPage() {
  return (
    <AdminDummyPageShell
      routePath="/admin/settings"
      title="Platform Settings"
      description="Test Super Admin restrictions (e.g., disable visibleToSuperAdmin to block SUPER_ADMIN access while keeping DEVELOPER unrestricted)."
      actionLabel="Update Configuration"
      metrics={[
        { label: "Active Guards", value: "2 Layers", hint: "Memory + Next.js Cache Tags" },
        { label: "Admin Auth Mode", value: "Credentials", hint: "OAuth disabled on admin side" },
        { label: "Session Checks", value: "Strict", hint: "Status + sessionVersion verified" },
        { label: "Environment", value: "Configured", hint: "RBAC test target ready" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">System Policy Overview</CardTitle>
          <CardDescription>
            Great for testing <span className="font-mono">visibleToSuperAdmin = false</span> in{" "}
            <span className="font-mono">/admin/rbac</span>.
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

