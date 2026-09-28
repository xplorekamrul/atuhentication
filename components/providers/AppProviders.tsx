"use client";

import { SessionProvider } from "next-auth/react";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster richColors />
      </ThemeProvider>
    </SessionProvider>
  );
}
