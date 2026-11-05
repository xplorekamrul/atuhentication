import bcrypt from "bcrypt";
import type { NextAuthOptions, Session, User, Account } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import "server-only";
import { headers } from "next/headers";
import { prisma } from "./prisma";
import { recordLoginHistory } from "./login-history";
import {
  getClientIp,
  incrementRateLimit,
  checkExponentialLockout,
  recordExponentialFailure,
  recordSpamWhileLocked,
  resetExponentialLockout,
} from "./rate-limit";

function safeParseBigInt(val: unknown): bigint | null {
  if (typeof val === "bigint") return val;
  if (typeof val === "number" && Number.isInteger(val)) return BigInt(val);
  if (typeof val === "string" && /^\d+$/.test(val.trim())) {
    try {
      return BigInt(val.trim());
    } catch {
      return null;
    }
  }
  return null;
}

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

        if (!identifier || !password) return null;

        const headers = req?.headers as Record<string, string | string[]> | undefined;
        const ip = getClientIp(headers);

        // 1. IP Burst Rate Limiter with Exponential Escalation (1h -> 2h -> 4h -> 8h -> 24h)
        const ipBurstLockKey = `exp:burst:ip:${ip}`;
        const burstLockCheck = checkExponentialLockout(ipBurstLockKey);
        if (burstLockCheck.locked) {
          const penalized = recordSpamWhileLocked(ipBurstLockKey, { threshold: 1, baseLockSeconds: 3600 });
          throw new Error(
            `High volume of login requests detected. Network blocked for ${penalized.formattedDuration}. Please try later.`
          );
        }

        // Check sliding window: max 30 requests per 3 minutes
        const burstWindow = incrementRateLimit(`burst:window:ip:${ip}`, 30, 180);
        if (!burstWindow.success) {
          const lockResult = recordExponentialFailure(ipBurstLockKey, { threshold: 1, baseLockSeconds: 3600 });
          throw new Error(
            `High volume of login requests detected. Network blocked for ${lockResult.formattedDuration}. Please try later.`
          );
        }

        // 2. Account & IP Failed Attempts / Exponential Lockout Protection
        const accountLockKey = `exp:account:${identifier.toLowerCase()}`;
        const ipFailLockKey = `exp:fail:ip:${ip}`;

        const accountLockCheck = checkExponentialLockout(accountLockKey);
        if (accountLockCheck.locked) {
          const penalized = recordSpamWhileLocked(accountLockKey, { threshold: 5, baseLockSeconds: 3600 });
          throw new Error(
            `Account temporarily locked due to too many failed attempts. Try again in ${penalized.formattedDuration}.`
          );
        }

        const ipLockCheck = checkExponentialLockout(ipFailLockKey);
        if (ipLockCheck.locked) {
          const penalized = recordSpamWhileLocked(ipFailLockKey, { threshold: 15, baseLockSeconds: 3600 });
          throw new Error(
            `Too many failed login attempts from this network. Try again in ${penalized.formattedDuration}.`
          );
        }

        const recordFailedAttempt = () => {
          if (identifier) {
            const accResult = recordExponentialFailure(accountLockKey, { threshold: 5, baseLockSeconds: 3600 });
            if (accResult.locked) {
              throw new Error(
                `Account temporarily locked due to too many failed attempts. Try again in ${accResult.formattedDuration}.`
              );
            }
          }
          const ipResult = recordExponentialFailure(ipFailLockKey, { threshold: 15, baseLockSeconds: 3600 });
          if (ipResult.locked) {
            throw new Error(
              `Too many failed login attempts from this network. Try again in ${ipResult.formattedDuration}.`
            );
          }
        };

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
          if (!ok) {
            recordFailedAttempt();
            return null;
          }

          // Block suspended or inactive admin
          if (admin.status !== "ACTIVE") return null;

          // Successful login: reset account failed attempts
          resetExponentialLockout(accountLockKey);

          // Log admin login history
          try {
            let ua = (headers?.["user-agent"] as string) || "Unknown User Agent";
            if (Array.isArray(ua)) ua = ua[0];

            await recordLoginHistory({
              adminId: admin.id,
              ipAddress: ip,
              userAgent: ua,
              maxKeep: 20,
            });
          } catch (error) {
            console.error("Failed to record admin login history:", error);
          }

          const u: User = {
            id: admin.id,
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

        if (!user) {
          recordFailedAttempt();
          return null;
        }

        // User must have a password for credentials login (OAuth-only users won't have one)
        if (!user.password) {
          recordFailedAttempt();
          return null;
        }

        // Block suspended or inactive user
        if (user.status !== "ACTIVE") return null;

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
          recordFailedAttempt();
          return null;
        }

        // Successful login: reset account failed attempts
        resetExponentialLockout(accountLockKey);

        // Log user login history
        try {
          let ua = (headers?.["user-agent"] as string) || "Unknown User Agent";
          if (Array.isArray(ua)) ua = ua[0];

          await recordLoginHistory({
            userId: user.id,
            ipAddress: ip,
            userAgent: ua,
            maxKeep: 20,
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
        // OAuth is strictly forbidden for Admin accounts: admins must only use the credential form
        const admin = await prisma.admin.findUnique({
          where: { email },
        });

        if (admin) {
          console.warn(`[OAuth signIn] Blocked OAuth login attempt for admin email: ${email}`);
          return false;
        }

        // Regular User flow
        let existingUser = await prisma.user.findUnique({
          where: { email },
        });

        if (!existingUser) {
          // Generate unique username from name or email (checks BOTH User and Admin tables)
          const baseUsername = (user.name ?? email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 30) || "user";
          let username = baseUsername;
          let counter = 1;
          while (
            (await prisma.user.findUnique({ where: { username }, select: { id: true } })) ||
            (await prisma.admin.findUnique({ where: { username }, select: { id: true } }))
          ) {
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
          // Prevent suspended or inactive users from signing in
          if (existingUser.status !== "ACTIVE") return false;

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

        // Record OAuth login history for user
        try {
          const headerList = await headers();
          const ip = getClientIp(headerList);
          const ua = headerList.get("user-agent") || "Unknown User Agent";
          await recordLoginHistory({
            userId: existingUser.id,
            ipAddress: ip,
            userAgent: ua,
            maxKeep: 20,
          });
        } catch (error) {
          console.error("Failed to record user OAuth login history:", error);
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
     * When sessionVersion mismatches or user is suspended/inactive, returning null invalidates the JWT.
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
          const adminId = String(token.id);
          const admin = await prisma.admin.findUnique({
            where: { id: adminId },
            select: { id: true, level: true, status: true, name: true, image: true, sessionVersion: true },
          });

          // Admin deleted, suspended, or inactive
          if (!admin || admin.status !== "ACTIVE") return null as any;

          // Session version mismatch -> force logout all active sessions
          if (token.sessionVersion !== admin.sessionVersion) return null as any;

          token.id = admin.id;
          token.userType = "ADMIN";
          token.level = admin.level;
          token.status = admin.status;
          token.picture = admin.image;
          token.sessionVersion = admin.sessionVersion;
          return token;
        }

        const parsedId = safeParseBigInt(token.id);
        if (!parsedId) return null as any;

        const dbUser = await prisma.user.findUnique({
          where: { id: parsedId },
          select: { id: true, status: true, name: true, image: true, sessionVersion: true },
        });

        // User deleted, suspended, or inactive
        if (!dbUser || dbUser.status !== "ACTIVE") return null as any;

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
