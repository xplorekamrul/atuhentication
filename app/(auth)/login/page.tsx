import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Login",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp?.callbackUrl ?? "/dashboard";

  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="Welcome back" subtitle="Sign in to continue">
          <LoginForm callbackUrl={callbackUrl} />
        </AuthCard>
      </div>
    </main>
  );
}
