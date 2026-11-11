import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Suspense } from "react";

export const metadata = {
  title: "Edit Product | Admin",
};

async function DynamicProductEditWrapper({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <AdminDummyPageShell
      routePath={`/admin/products/${id}/edit`}
      patternPath="/admin/products/[id]/edit"
      title={`Edit Product: ${id}`}
      description="Dynamic RBAC test page verifying parameterized route matching via matchesPattern()."
      actionLabel="Save Product"
      metrics={[
        { label: "Product ID", value: id, hint: "Extracted from URL parameter [id]" },
        { label: "Route Pattern", value: "[id]", hint: "/admin/products/[id]/edit" },
        { label: "Pattern Cache", value: "Memoized", hint: "RegExp cached in route-pattern-matcher" },
        { label: "Sync Status", value: "Live", hint: "Ready for permission testing" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Product Editor (Dummy Form)</CardTitle>
          <CardDescription>
            If an Admin has <span className="font-mono">/admin/products</span> assigned but NOT{" "}
            <span className="font-mono">/admin/products/[id]/edit</span>, accessing this URL will redirect them back to{" "}
            <span className="font-mono">/admin</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="dummy-name">Product Name</Label>
              <Input id="dummy-name" defaultValue={`Sample Item (${id})`} readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dummy-sku">SKU Code</Label>
              <Input id="dummy-sku" defaultValue={id.toUpperCase()} readOnly />
            </div>
          </div>
          <div className="flex items-center gap-3 pt-2">
            <Button asChild variant="outline">
              <Link href="/admin/products">Back to Products</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </AdminDummyPageShell>
  );
}

export default function AdminProductEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="p-6 max-w-7xl mx-auto">
          <div className="h-32 rounded-lg bg-muted animate-pulse" />
        </div>
      }
    >
      <DynamicProductEditWrapper params={params} />
    </Suspense>
  );
}

