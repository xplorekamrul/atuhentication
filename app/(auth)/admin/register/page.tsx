import AdminRegisterForm from "@/components/auth/AdminRegisterForm";
import AuthCard from "../../../../components/auth/AuthCard";

export const metadata = {
   title: "Admin Registration",
   description: "Admin registration page",
};

export default function AdminRegisterPage() {
   return (
      <div className="w-full max-w-md mx-auto  min-h-screen grid items-center">

         <AuthCard title="Admin Registration" subtitle="Create your admin account">
            <AdminRegisterForm />
         </AuthCard>
      </div>
   );
}
