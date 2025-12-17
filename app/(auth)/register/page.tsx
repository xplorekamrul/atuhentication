import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Register",
};

export default function Page() {
  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard
          title="Create your account"
          subtitle="It takes less than a minute"
        >
          <RegisterForm />
        </AuthCard>
      </div>
    </main>
  );
}
