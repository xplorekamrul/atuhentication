"use client";

import { SessionProvider } from "next-auth/react";

import { useEffect } from "react";
import { ThemeProvider } from "next-themes";

export default function AppProviders({ children }: { children: React.ReactNode }) {
  // Strip Facebook OAuth #_=_ URL fragment
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#_=_") {
      if (window.history.replaceState) {
        window.history.replaceState(null, "", window.location.href.split("#")[0]);
      } else {
        window.location.hash = "";
      }
    }
  }, []);

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
