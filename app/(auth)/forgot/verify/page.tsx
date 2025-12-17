// /app/(auth)/forgot/verify/page.tsx
import type { Metadata } from "next";
import AuthCard from "@/components/auth/AuthCard";
import ForgotVerifyForm from "@/components/auth/ForgotVerifyForm";

export const metadata: Metadata = { title: "Verify code" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const sp = await searchParams;
  const email = sp?.email ?? "";

  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="Verify code" subtitle="Enter the 6-digit code we sent to your email">
          <ForgotVerifyForm defaultEmail={email} />
        </AuthCard>
      </div>
    </main>
  );
}
