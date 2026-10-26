import { getThemes } from "@/actions/admin/theme";
import ThemeList from "@/components/admin/themes/theme-list";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { connection } from "next/server";

export const metadata = {
  title: "Themes Management | Admin",
};

async function ThemesWrapper() {
  await connection();
  const result = await getThemes();

  if (!result.success || !result.themes) {
    return (
      <div className="p-4 rounded-xl bg-destructive/10 text-destructive border border-destructive/20">
        Failed to load themes: {result.error}
      </div>
    );
  }

  return <ThemeList initialThemes={result.themes} />;
}

export default async function AdminThemesPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Theme Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create, edit, and configure dynamic visual color palettes across the platform.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="h-64 rounded-2xl bg-muted/40 animate-pulse border border-border" />
        }
      >
        <ThemesWrapper />
      </Suspense>
    </main>
  );
}
