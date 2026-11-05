import AuthCard from "@/components/auth/AuthCard";
import LoginForm from "@/components/auth/LoginForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Login",
  robots: { index: false, follow: false },
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const sp = await searchParams;
  const callbackUrl = sp?.callbackUrl ?? "/admin";

  return (
    <main className="min-h-screen bg-light dark:bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <AuthCard title="Admin Portal" subtitle="Sign in with your administrative credentials">
          <LoginForm
            callbackUrl={callbackUrl}
            showOAuth={false}
            showRegisterLink={false}
            isAdminLogin={true}
          />
        </AuthCard>
      </div>
    </main>
  );
}

