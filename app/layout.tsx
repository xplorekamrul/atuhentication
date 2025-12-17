import AppProviders from "@/components/providers/AppProviders";
import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = { title: "Hr_Plus" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-screen bg-light dark:bg-background text-foreground">
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
