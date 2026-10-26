import AppProviders from "@/components/providers/AppProviders";
import DynamicThemeWrapper from "@/components/providers/DynamicThemeWrapper";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";

export const metadata: Metadata = { title: "ArrowheadIt" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Suspense fallback={null}>
          <AppProviders>
            <Suspense fallback={children}>
              <DynamicThemeWrapper>{children}</DynamicThemeWrapper>
            </Suspense>
          </AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
