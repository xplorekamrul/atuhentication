import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Analytics | Admin",
};

const trafficChannels = [
  { channel: "Organic Search", visitors: "18,420", conversion: "4.2%", share: "48%" },
  { channel: "Direct & Bookmarks", visitors: "9,810", conversion: "6.1%", share: "26%" },
  { channel: "Social Referral", visitors: "6,140", conversion: "3.4%", share: "16%" },
  { channel: "Partner Campaigns", visitors: "3,890", conversion: "5.0%", share: "10%" },
];

export default function AdminAnalyticsPage() {
  return (
    <AdminDummyPageShell
      routePath="/admin/analytics"
      title="Analytics & Reports"
      description="RBAC test page for reporting permissions, Super Admin visibility, and Admin view/edit flags."
      actionLabel="Export Report"
      metrics={[
        { label: "Total Sessions", value: "38,260", hint: "+14.2% vs previous 30 days" },
        { label: "Conversion Rate", value: "4.68%", hint: "Across checkout & sign-ups" },
        { label: "Avg. Order Value", value: "$128.40", hint: "Based on completed orders" },
        { label: "Cache Hit Ratio", value: "99.4%", hint: "Dual-layer RBAC active" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Traffic Breakdown (Dummy Dataset)</CardTitle>
          <CardDescription>
            Assign <span className="font-mono">/admin/analytics</span> to an RBAC Route Group to grant Admin access.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {trafficChannels.map((row) => (
            <div
              key={row.channel}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3.5 transition-colors hover:bg-muted/50"
            >
              <div>
                <p className="font-medium text-foreground">{row.channel}</p>
                <p className="text-xs text-muted-foreground">Share of traffic: {row.share}</p>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground block">Visitors</span>
                  <span className="font-semibold text-foreground">{row.visitors}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block">Conversion</span>
                  <span className="font-semibold text-primary">{row.conversion}</span>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminDummyPageShell>
  );
}

