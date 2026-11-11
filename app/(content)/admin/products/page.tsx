import { AdminDummyPageShell } from "@/components/admin/rbac-dummy/AdminDummyPageShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Package } from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "Products | Admin",
};

const sampleProducts = [
  { id: "prod-101", name: "Enterprise Auth Shield", sku: "SEC-101", price: "$299.00", stock: "Unlimited" },
  { id: "prod-102", name: "RBAC Policy Engine Pro", sku: "RBAC-204", price: "$149.00", stock: "Unlimited" },
  { id: "prod-103", name: "Multi-Device Session Guard", sku: "SES-309", price: "$99.00", stock: "Active" },
];

export default function AdminProductsPage() {
  return (
    <AdminDummyPageShell
      routePath="/admin/products"
      title="Product Catalog"
      description="Test static route permission (/admin/products) and navigate into dynamic [id] edit routes."
      actionLabel="Add Product"
      metrics={[
        { label: "Total SKUs", value: "142", hint: "Across 6 active categories" },
        { label: "Published", value: "128", hint: "Visible in public storefront" },
        { label: "Low Stock", value: "6", hint: "Requires inventory restock" },
        { label: "Drafts", value: "8", hint: "Pending review" },
      ]}
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Catalog Items & Dynamic Route Test</CardTitle>
          <CardDescription>
            Clicking <span className="font-medium text-foreground">Test Dynamic Edit</span> opens{" "}
            <span className="font-mono">/admin/products/[id]/edit</span> to verify dynamic pattern matching in{" "}
            <span className="font-mono">proxy.ts</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sampleProducts.map((product) => (
            <div
              key={product.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 p-4 transition-all hover:bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-primary/10 text-primary grid place-items-center shrink-0">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    ID: <span className="font-mono">{product.id}</span> &bull; SKU: {product.sku} &bull; {product.price}
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm">
                <Link href={`/admin/products/${product.id}/edit`}>
                  <span>Test Dynamic Edit</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </AdminDummyPageShell>
  );
}

