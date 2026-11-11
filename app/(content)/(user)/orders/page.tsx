import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { PackageCheck, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "My Orders | rareviewit",
};

const userOrders = [
  { id: "ORD-2026-104", item: "Starter Workspace Plan (Annual)", date: "Nov 02, 2026", amount: "$99.00", status: "Delivered" },
  { id: "ORD-2026-089", item: "Custom Theme Pack Add-on", date: "Oct 19, 2026", amount: "$29.00", status: "Delivered" },
  { id: "ORD-2026-051", item: "Security Audit Snapshot", date: "Sep 28, 2026", amount: "$49.00", status: "Completed" },
];

async function OrdersContent() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            My Orders
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Protected customer orders page for testing user authentication and redirect behavior.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/workspace">Back to Workspace</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Recent Purchases
          </CardTitle>
          <CardDescription>
            Signed in as <span className="font-mono text-foreground">{session.user.email}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {userOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
            >
              <div className="flex items-start gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <PackageCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{order.item}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.id} &bull; Placed on {order.date}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="font-semibold text-foreground">{order.amount}</span>
                <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                  {order.status}
                </span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserOrdersPage() {
  return (
    <Suspense fallback={<div className="h-48 rounded-lg bg-muted animate-pulse" />}>
      <OrdersContent />
    </Suspense>
  );
}

