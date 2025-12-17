import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ForgotResetForm from "@/components/auth/ForgotResetForm";

export const metadata: Metadata = { title: "Reset password" };

export default function Page() {
  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="Set a new password" subtitle="Choose a strong password">
          <ForgotResetForm />
        </AuthCard>
      </div>
    </main>
  );
}
