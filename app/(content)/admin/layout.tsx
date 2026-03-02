import SidebarFrame from "@/components/layout/SidebarFrame";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
   return <SidebarFrame>{children}</SidebarFrame>;
}