import { UserPortalShell } from "@/components/user/UserPortalShell";

export default function UserPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserPortalShell>{children}</UserPortalShell>;
}

