import AppProviders from "@/components/providers/AppProviders";
import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";


export const metadata: Metadata = { title: "ArrowheadIt" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-screen bg-light dark:bg-background text-foreground">
        <Suspense fallback={null}>
          <AppProviders>
            {children}
          </AppProviders>
        </Suspense>
      </body>
    </html>
  );
}
