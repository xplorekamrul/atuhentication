import SidebarFrame from "@/components/layout/SidebarFrame";
import AdminSessionProvider from "@/components/providers/AdminSessionProvider";

export default function ContentLayout({ children }: { children: React.ReactNode }) {
   return (
      <AdminSessionProvider>
         <SidebarFrame>{children}</SidebarFrame>
      </AdminSessionProvider>
   );
}