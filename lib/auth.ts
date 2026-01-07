
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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds, req) {
        const identifier = (creds?.email ?? "").trim();
        const password = creds?.password ?? "";

        // Check if identifier is email or username
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier }, // Assuming strict case for username or normalized inputs
            ],
          },
        });
        if (!user) return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Log login history
        try {
          console.log("Attempting to record login history for userId:", user.id);
          const headers = req?.headers as Record<string, string | string[]> | undefined;

          let ip = (headers?.["x-forwarded-for"] as string) || (headers?.["x-real-ip"] as string) || "Unknown IP";
          if (Array.isArray(ip)) ip = ip[0];

          let ua = (headers?.["user-agent"] as string) || "Unknown User Agent";
          if (Array.isArray(ua)) ua = ua[0];

          console.log("Captured IP:", ip);
          console.log("Captured UA:", ua);

          await prisma.loginHistory.create({
            data: {
              userId: user.id,
              ipAddress: ip,
              userAgent: ua,
            }
          });
          console.log("Login history saved successfully.");
        } catch (error) {
          console.error("CRITICAL: Failed to record login history.", error);
        }

        const u: User = {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
          image: user.image,
          role: user.role as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER",
          status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
        } as User;

        // Send login alert email (fire and forget)
        if (user.name) {
          const { sendLoginAlertEmail } = await import("@/lib/mail");
          void sendLoginAlertEmail(user.email, user.name, new Date().toLocaleString());
        }

        return u;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
        token.status = user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
        token.picture = user.image;
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true, name: true, image: true },
        });

        if (!dbUser) {
          // User has been deleted from the database invalidate the session
          return null as any;
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
          token.status = dbUser.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
          token.picture = dbUser.image;
        }
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      // If token is invalid (e.g. user deleted), we can't populate the session.
      // Depending on NextAuth version, returning a session with null user or throwing might be needed to force logout.
      // But simply checking token prevents the crash.
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
        session.user.status = token.status as
          | "ACTIVE"
          | "INACTIVE"
          | "SUSPENDED";
        session.user.image = token.picture;
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
