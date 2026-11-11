import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { Check, CreditCard, Receipt } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

export const metadata = {
  title: "Billing | rareviewit",
};

const invoices = [
  { id: "INV-2026-11", date: "Nov 01, 2026", amount: "$19.00", status: "Paid" },
  { id: "INV-2026-10", date: "Oct 01, 2026", amount: "$19.00", status: "Paid" },
  { id: "INV-2026-09", date: "Sep 01, 2026", amount: "$19.00", status: "Paid" },
];

async function BillingContent() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Billing & Subscription
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer billing dummy page protected behind session authentication.
          </p>
        </div>

        <Button asChild variant="outline" size="sm">
          <Link href="/workspace">Back to Workspace</Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-1 border-primary/20 bg-primary/5">
          <CardHeader>
            <div className="size-10 rounded-lg bg-primary text-primary-foreground grid place-items-center mb-2">
              <CreditCard className="h-5 w-5" />
            </div>
            <CardTitle className="text-xl">Pro Member Plan</CardTitle>
            <CardDescription>$19.00 / month &bull; Active</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm">
            {[
              "Protected Workspace Access",
              "Multi-Device Session Security",
              "Live Custom Theme Presets",
              "Priority Email Support",
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-foreground">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              Billing History
            </CardTitle>
            <CardDescription>
              Dummy invoice list for <span className="font-mono">{session.user.email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {invoices.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between rounded-lg border border-border bg-muted/30 p-3.5"
              >
                <div>
                  <p className="font-medium text-foreground font-mono text-sm">{inv.id}</p>
                  <p className="text-xs text-muted-foreground">{inv.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-foreground">{inv.amount}</span>
                  <span className="inline-flex items-center rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-medium">
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function UserBillingPage() {
  return (
    <Suspense fallback={<div className="h-48 rounded-lg bg-muted animate-pulse" />}>
      <BillingContent />
    </Suspense>
  );
}

