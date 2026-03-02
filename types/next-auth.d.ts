import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      userType: "ADMIN" | "USER";
      level?: "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    userType: "ADMIN" | "USER";
    level?: "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    userType: "ADMIN" | "USER";
    level?: "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
    status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  }
}

