"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/layout/Sidebar";

export default function SidebarFrame({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("_sidebar_collapsed");
    if (saved != null) setCollapsed(saved === "1");
  }, []);

  const sidebarWidth = collapsed ? "4rem" : "15rem";

  return (
    <div
      className="grid gap-[5px] motion-safe:transition-[grid-template-columns] motion-safe:duration-300 motion-safe:ease-in-out"
      style={
        {
          gridTemplateColumns: "auto 1fr",
          height: "100dvh",
        } as React.CSSProperties
      }
    >
      <div
        className="motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out"
        style={{ width: sidebarWidth, willChange: "width" }}
      >
        <Sidebar collapsed={collapsed} onToggle={setCollapsed} />
      </div>

      <main
        className="min-w-0 overflow-auto"
        style={{ scrollbarGutter: "stable" } as React.CSSProperties}
      >
        {children}
      </main>
    </div>
  );
}
