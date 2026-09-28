import AdminSessionProvider from "@/components/providers/AdminSessionProvider";
import { ThemeProvider } from "next-themes";

export default function AdminAuthLayout({
   children,
}: {
   children: React.ReactNode;
}) {
   return (
      <AdminSessionProvider>
         <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
         >
            {children}
         </ThemeProvider>
      </AdminSessionProvider>
   );
}
