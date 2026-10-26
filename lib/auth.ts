import bcrypt from "bcrypt";
import type { NextAuthOptions, Session, User, Account } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import "server-only";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
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
        const admin = await prisma.admin.findFirst({
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

          // Block suspended admin
          if (admin.status === "SUSPENDED") return null;

          // Log admin login history
          try {
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
              },
            });
          } catch (error) {
            console.error("Failed to record admin login history:", error);
          }

          const u: User = {
            id: admin.id.toString(),
            name: admin.name ?? null,
            email: admin.email,
            image: admin.image,
            userType: "ADMIN",
            level: admin.level as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER",
            status: admin.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
            sessionVersion: admin.sessionVersion,
          } as User;

          return u;
        }

        // Try user
        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: identifier.toLowerCase() },
              { username: identifier },
            ],
          },
        });

        if (!user) return null;

        // User must have a password for credentials login (OAuth-only users won't have one)
        if (!user.password) return null;

        // Block suspended user
        if (user.status === "SUSPENDED") return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return null;

        // Log user login history
        try {
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
            },
          });
        } catch (error) {
          console.error("Failed to record user login history:", error);
        }

        const u: User = {
          id: user.id.toString(),
          name: user.name ?? null,
          email: user.email,
          image: user.image,
          userType: "USER",
          status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
          sessionVersion: user.sessionVersion,
        } as User;

        return u;
      },
    }),
    // Google OAuth Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    // Facebook OAuth Provider
    FacebookProvider({
      clientId: process.env.FACEBOOK_CLIENT_ID ?? "",
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET ?? "",
    }),
  ],
  callbacks: {
    /**
     * signIn callback: handles OAuth sign-in by finding or creating the User
     * record, and storing the OAuth Account link.
     */
    async signIn({ user, account }: { user: User; account: Account | null }) {
      // Intercept OAuth sign-ins (Google/Facebook)
      if (account?.provider === "google" || account?.provider === "facebook") {
        if (!user.email) return false;

        const email = user.email.toLowerCase().trim();

        // Check if user is an existing Admin
        const admin = await prisma.admin.findUnique({
          where: { email },
        });

        if (admin) {
          if (admin.status === "SUSPENDED") return false;

          user.id = admin.id.toString();
          user.userType = "ADMIN";
          user.level = admin.level as "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
          user.status = admin.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
          user.sessionVersion = admin.sessionVersion;
          return true;
        }

        // Regular User flow
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Generate unique username from name or email
          const baseUsername = (user.name ?? email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 30) || "user";
          let username = baseUsername;
          let counter = 1;
          while (await prisma.user.findUnique({ where: { username } })) {
            username = `${baseUsername}${counter++}`;
          }

          existingUser = await prisma.user.create({
            data: {
              name: user.name ?? null,
              email,
              username,
              emailVerified: new Date(),
              image: user.image ?? null,
              userType: "USER",
              sessionVersion: 1,
            },
          });
        } else {
          // Prevent suspended users from signing in
          if (existingUser.status === "SUSPENDED") return false;

          // Sync avatar if missing
          if (!existingUser.image && user.image) {
            await prisma.user.update({
              where: { id: existingUser.id },
              data: { image: user.image },
            });
          }
        }

        // Check if this OAuth account link already exists
        const existingAccount = await prisma.oAuthAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: account.provider,
              providerAccountId: account.providerAccountId,
            },
          },
        });

        if (!existingAccount) {
          await prisma.oAuthAccount.create({
            data: {
              userId: existingUser.id,
              type: account.type ?? "oauth",
              provider: account.provider,
              providerAccountId: account.providerAccountId,
              refresh_token: account.refresh_token ?? null,
              access_token: account.access_token ?? null,
              expires_at: account.expires_at ?? null,
              token_type: account.token_type ?? null,
              scope: account.scope ?? null,
              id_token: account.id_token ?? null,
              session_state: (account.session_state as string) ?? null,
            },
          });
        }

        // Set user fields so jwt callback reads them on first-time login
        user.id = existingUser.id.toString();
        user.userType = "USER";
        user.status = existingUser.status as "ACTIVE" | "INACTIVE" | "SUSPENDED";
        user.sessionVersion = existingUser.sessionVersion;
      }

      return true;
    },

    /**
     * jwt callback: validates sessionVersion and refreshes user metadata on every request.
     * When sessionVersion mismatches or user is suspended, returning null invalidates the JWT.
     */
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) {
        // Initial sign-in: store user info and initial sessionVersion
        token.id = user.id;
        token.userType = user.userType;
        token.level = user.level;
        token.status = user.status;
        token.picture = user.image;
        token.sessionVersion = user.sessionVersion ?? 1;
        return token;
      }

      // Subsequent requests: validate sessionVersion and status against DB
      if (token.id) {
        if (token.userType === "ADMIN") {
          const admin = await prisma.admin.findUnique({
            where: { id: BigInt(token.id) },
            select: { id: true, level: true, status: true, name: true, image: true, sessionVersion: true },
          });

          // Admin deleted or suspended
          if (!admin || admin.status === "SUSPENDED") return null as any;

          // Session version mismatch -> force logout all active sessions
          if (token.sessionVersion !== admin.sessionVersion) return null as any;

          token.id = admin.id.toString();
          token.userType = "ADMIN";
          token.level = admin.level;
          token.status = admin.status;
          token.picture = admin.image;
          token.sessionVersion = admin.sessionVersion;
          return token;
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: BigInt(token.id) },
          select: { id: true, status: true, name: true, image: true, sessionVersion: true },
        });

        // User deleted or suspended
        if (!dbUser || dbUser.status === "SUSPENDED") return null as any;

        // Session version mismatch -> force logout all active sessions
        if (token.sessionVersion !== dbUser.sessionVersion) return null as any;

        token.id = dbUser.id.toString();
        token.userType = "USER";
        token.status = dbUser.status;
        token.picture = dbUser.image;
        token.sessionVersion = dbUser.sessionVersion;
        return token;
      }

      return token;
    },

    /**
     * session callback: formats the user session returned to client components and API calls.
     */
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token && token.id && session.user) {
        session.user.id = token.id;
        session.user.userType = token.userType;
        session.user.level = token.level;
        session.user.status = token.status;
        session.user.image = token.picture;
        session.user.sessionVersion = token.sessionVersion;
        return session;
      }
      return null as any;
    },
  },
};

export function auth() {
  return getServerSession(authOptions);
}
