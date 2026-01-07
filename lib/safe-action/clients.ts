import { createSafeActionClient } from "next-safe-action";
import "server-only";
import { auth } from "../auth";

export const actionClient = createSafeActionClient();

export const authActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const userId = session.user.id;
  return next({ ctx: { session, userId } });
});

export const superAdminActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = session.user.role;

  // DEVELOPER can access all actions (no restrictions)
  if (role === "DEVELOPER") {
    return next({ ctx: { session } });
  }

  // Only SUPER_ADMIN can access super admin actions
  if (role !== "SUPER_ADMIN") {
    throw new Error("Super admin only action");
  }

  return next({ ctx: { session } });
});

export const adminActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = session.user.role;

  // DEVELOPER can access all actions (no restrictions)
  if (role === "DEVELOPER") {
    return next({ ctx: { session } });
  }

  // SUPER_ADMIN can access admin actions
  if (role === "SUPER_ADMIN") {
    return next({ ctx: { session } });
  }

  // Only ADMIN can access admin actions
  if (role !== "ADMIN") {
    throw new Error("Admin only action");
  }

  return next({ ctx: { session } });
});

export const developerActionClient = actionClient.use(async ({ next }) => {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const role = session.user.role;

  // Only DEVELOPER can access developer actions
  if (role !== "DEVELOPER") {
    throw new Error("Developer only action");
  }

  return next({ ctx: { session } });
});
