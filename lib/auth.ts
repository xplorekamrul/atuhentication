
import bcrypt from "bcrypt";
import type { NextAuthOptions, Session, User } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import "server-only";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    // Unified Credentials Provider for both Admin and User
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds, req) {
        const identifier = (creds?.email ?? "").trim();
        const password = creds?.password ?? "";

        // Try admin first
        let admin = await prisma.admin.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

        if (admin) {
          const ok = await bcrypt.compare(password, admin.password);
          if (!ok) return null;

          // Log admin login history
          try {
            console.log("Attempting to record admin login history for adminId:", admin.id);
            const headers = req?.headers as Record<string, string | string[]> | undefined;

            let ip = (headers?.["x-forwarded-for"] as string) || (headers?.["x-real-ip"] as string) || "Unknown IP";
            if (Array.isArray(ip)) ip = ip[0];

            let ua = (headers?.["user-agent"] as string) || "Unknown User Agent";
            if (Array.isArray(ua)) ua = ua[0];

            await prisma.loginHistory.create({
              data: {
                adminId: admin.id,
                ipAddress: ip,
                userAgent: ua,
              }
            });
            console.log("Admin login history saved successfully.");
          } catch (error) {
            console.error("CRITICAL: Failed to record admin login history.", error);
          }

          const u: User = {
            id: admin.id.toString(),
            name: admin.name ?? null,
            email: admin.email,
            image: admin.image,
            userType: "ADMIN",
            level: admin.level as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER",
            status: admin.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
          } as User;

          return u;
        }

        // Try user
        let user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Log user login history
        try {
          console.log("Attempting to record user login history for userId:", user.id);
          const headers = req?.headers as Record<string, string | string[]> | undefined;

          let ip = (headers?.["x-forwarded-for"] as string) || (headers?.["x-real-ip"] as string) || "Unknown IP";
          if (Array.isArray(ip)) ip = ip[0];

          let ua = (headers?.["user-agent"] as string) || "Unknown User Agent";
          if (Array.isArray(ua)) ua = ua[0];

          await prisma.loginHistory.create({
            data: {
              userId: user.id,
              ipAddress: ip,
              userAgent: ua,
            }
          });
          console.log("User login history saved successfully.");
        } catch (error) {
          console.error("CRITICAL: Failed to record user login history.", error);
        }

        const u: User = {
          id: user.id.toString(),
          name: user.name ?? null,
          email: user.email,
          image: user.image,
          userType: "USER",
          status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
        } as User;

        return u;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.userType = user.userType;
        token.level = user.level;
        token.status = user.status;
        token.picture = user.image;
      } else if (token.email) {
        // Try to find admin
        const admin = await prisma.admin.findUnique({
          where: { email: token.email },
          select: { id: true, level: true, status: true, name: true, image: true },
        });

        if (admin) {
          token.id = admin.id.toString();
          token.userType = "ADMIN";
          token.level = admin.level;
          token.status = admin.status;
          token.picture = admin.image;
          return token;
        }

        // Try to find user
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, status: true, name: true, image: true },
        });

        if (!dbUser) {
          // User has been deleted from the database
          return null as any;
        }

        token.id = dbUser.id.toString();
        token.userType = "USER";
        token.status = dbUser.status;
        token.picture = dbUser.image;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.userType = token.userType as "ADMIN" | "USER";
        session.user.level = token.level as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER" | undefined;
        session.user.status = token.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
        session.user.image = token.picture;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
