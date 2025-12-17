import type { ReactNode } from "react";
import SidebarFrame from "@/components/layout/SidebarFrame"; 

export default function ContentLayout({ children }: { children: ReactNode }) {
  return <SidebarFrame>{children}</SidebarFrame>;
}
