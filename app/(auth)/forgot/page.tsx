import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ForgotRequestForm from "@/components/auth/ForgotRequestForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function Page() {
  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="Forgot password" subtitle="We’ll send a 6-digit code to your email">
          <ForgotRequestForm />
        </AuthCard>
      </div>
    </main>
  );
}
