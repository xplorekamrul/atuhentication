import "server-only";
import { createSafeActionClient } from "next-safe-action";
import { auth } from "../auth";

export const actionClient = createSafeActionClient();

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return next({ ctx: { session } });
});

export const superAdminActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "SUPER_ADMIN") throw new Error("Super admin only action");
  return next({ ctx: { session } });
});

export const adminActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  if (session.user.role !== "ADMIN") throw new Error("Admin only action");
  return next({ ctx: { session } });
});
