import AdminLoginForm from "@/components/auth/AdminLoginForm";
import AuthCard from "../../../../components/auth/AuthCard";

export const metadata = {
   title: "Admin Login",
   description: "Admin login page",
};

export default function AdminLoginPage() {
   return (
      <div className="w-full max-w-md mx-auto  min-h-screen grid items-center">
         <AuthCard title="Admin Login" subtitle="Sign in to your admin account">
            <AdminLoginForm />
         </AuthCard>
      </div>
   );
}
