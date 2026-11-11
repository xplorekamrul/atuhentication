import { getEditPermissionForRoute } from "@/actions/user-permissions/edit-permissions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { auth } from "@/lib/auth";
import {
  CheckCircle2,
  Eye,
  Lock,
  Pencil,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

export interface DummyMetric {
  label: string;
  value: string;
  hint: string;
}

interface AdminDummyPageShellProps {
  routePath: string;
  patternPath?: string;
  title: string;
  description: string;
  actionLabel?: string;
  metrics: DummyMetric[];
  children?: React.ReactNode;
}

async function AdminDummyContent({
  routePath,
  patternPath,
  title,
  description,
  actionLabel = "Save Changes",
  metrics,
  children,
}: AdminDummyPageShellProps) {
  const session = await auth();
  const permissionPath = patternPath ?? routePath;
  const editPerm = await getEditPermissionForRoute(permissionPath);
  const canEdit = editPerm === null || editPerm === true;
  const level = (session?.user as any)?.level ?? "UNKNOWN";
  const email = session?.user?.email ?? "Unknown";

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-7xl mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-semibold border border-primary/20">
              <ShieldCheck className="h-3.5 w-3.5" />
              {level}
            </span>
            <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground border border-border">
              {routePath}
            </span>
            {patternPath && patternPath !== routePath ? (
              <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs font-mono text-accent-foreground border border-border">
                Pattern: {patternPath}
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <span
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border ${
              canEdit
                ? "bg-primary/10 text-primary border-primary/20"
                : "bg-muted text-muted-foreground border-border"
            }`}
          >
            {canEdit ? (
              <>
                <Pencil className="h-3.5 w-3.5" /> Edit Mode Enabled
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" /> View-Only Access
              </>
            )}
          </span>

          <Button disabled={!canEdit} className="shadow-sm">
            {canEdit ? actionLabel : "Read-Only"}
          </Button>
        </div>
      </div>

      {/* RBAC Permission Diagnostic Banner */}
      <Card className="border-primary/20 bg-primary/5 shadow-none">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              {canEdit ? (
                <CheckCircle2 className="h-5 w-5" />
              ) : (
                <Lock className="h-5 w-5" />
              )}
            </div>
            <div className="space-y-0.5 text-sm">
              <p className="font-medium text-foreground">
                RBAC Route Verification Passed for{" "}
                <span className="font-mono text-primary">{email}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Verified via <span className="font-mono">proxy.ts</span> Layer-1
                memory cache and <span className="font-mono">getEditPermissionForRoute</span>{" "}
                Layer-2 cache ({canEdit ? "editable" : "view-only"}).
              </p>
            </div>
          </div>

          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/admin">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.label}
            className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]"
          >
            <CardHeader className="pb-2">
              <CardDescription className="text-xs font-medium uppercase tracking-wider">
                {metric.label}
              </CardDescription>
              <CardTitle className="text-2xl font-bold text-foreground">
                {metric.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{metric.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {children}
    </div>
  );
}

export function AdminDummyPageShell(props: AdminDummyPageShellProps) {
  return (
    <Suspense
      fallback={
        <div className="p-6 space-y-4 max-w-7xl mx-auto w-full">
          <div className="h-10 w-64 rounded bg-muted animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-lg bg-muted/60 border border-border animate-pulse"
              />
            ))}
          </div>
        </div>
      }
    >
      <AdminDummyContent {...props} />
    </Suspense>
  );
}

