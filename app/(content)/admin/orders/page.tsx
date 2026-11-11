import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Orders | Admin",
};

const sampleOrders = [
  { id: "#ORD-9041", customer: "Arif Rahman", total: "$299.00", status: "Fulfilled" },
  { id: "#ORD-9040", customer: "Nadia Islam", total: "$149.00", status: "Processing" },
  { id: "#ORD-9039", customer: "Tariq Mahmud", total: "$448.00", status: "Pending Review" },
];

export default function AdminOrdersPage() {
  return (
    <AdminDummyPageShell
      routePath="/admin/orders"
      title="Order Management"
      description="RBAC dummy page for order processing teams and edit-permission enforcement."
      actionLabel="Process Batch"
      metrics={[
        { label: "Open Orders", value: "24", hint: "Awaiting fulfillment" },
        { label: "Completed Today", value: "61", hint: "Dispatched on schedule" },
        { label: "Gross Volume", value: "$12,480", hint: "Last 24 hours" },
        { label: "Refund Rate", value: "0.8%", hint: "Within target SLA" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders Queue</CardTitle>
          <CardDescription>
            Toggle <span className="font-mono">editableByAdmin</span> on <span className="font-mono">/admin/orders</span> in RBAC to watch the action button switch between active and read-only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 p-3.5"
            >
              <div>
                <p className="font-semibold text-foreground">
                  {order.id} &mdash; {order.customer}
                </p>
                <p className="text-xs text-muted-foreground">Order Amount: {order.total}</p>
              </div>
              <span className="inline-flex w-fit items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                {order.status}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminDummyPageShell>
  );
}

