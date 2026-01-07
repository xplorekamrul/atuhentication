
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

        // Log login history (fire and forget)
        const headers = req?.headers as Record<string, string | string[]> | undefined; // Cast safely
        const ip = (headers?.["x-forwarded-for"] as string) || (headers?.["x-real-ip"] as string) || null;
        const ua = (headers?.["user-agent"] as string) || null;

        void prisma.loginHistory.create({
          data: {
            userId: user.id,
            ipAddress: Array.isArray(ip) ? ip[0] : ip, // Handle array case if multiple proxies
            userAgent: Array.isArray(ua) ? ua[0] : ua,
          }
        });

        const u: User = {
          id: user.id,
          name: user.name ?? null,
          email: user.email,
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
      } else if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, status: true, name: true },
        });

        if (!dbUser) {
          // User has been deleted from the database invalidate the session
          return null as any;
        }

        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
          token.status = dbUser.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
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
      }
      return session;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
