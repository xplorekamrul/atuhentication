import bcrypt from "bcrypt";
import type { NextAuthOptions, Session, User } from "next-auth";
import { getServerSession } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import "server-only";
import { prisma } from "./prisma";

export const adminAuthOptions: NextAuthOptions = {
   secret: process.env.NEXTAUTH_SECRET,
   session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60,
   },
   pages: {
      signIn: "/admin/login",
   },
   providers: [
      // Credentials Provider for Admins only
      CredentialsProvider({
         id: "admin-credentials",
         name: "Admin Credentials",
         credentials: {
            email: { label: "Email", type: "text" },
            password: { label: "Password", type: "password" },
         },
         async authorize(creds, req) {
            const identifier = (creds?.email ?? "").trim();
            const password = creds?.password ?? "";

            // Try admin only
            let admin = await prisma.admin.findFirst({
               where: {
                  OR: [
                     { email: identifier.toLowerCase() },
                     { username: identifier },
                  ],
               },
            });

            if (!admin) return null;

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
         },
      }),
   ],
   callbacks: {
      async jwt({ token, user }: { token: JWT; user?: User }) {
         if (user) {
            const dbAdmin = await prisma.admin.findUnique({
               where: { id: BigInt(user.id) },
               select: { sessionVersion: true },
            });
            token.id = user.id;
            token.userType = user.userType;
            token.level = user.level;
            token.status = user.status;
            token.picture = user.image;
            token.sessionVersion = dbAdmin?.sessionVersion ?? 1;
         } else if (token.id) {
            // Try to find admin
            const dbAdmin = await prisma.admin.findUnique({
               where: { id: BigInt(token.id as string) },
               select: { id: true, level: true, status: true, name: true, image: true, sessionVersion: true },
            });

            if (!dbAdmin || dbAdmin.status === "INACTIVE" || dbAdmin.status === "SUSPENDED" || dbAdmin.sessionVersion !== token.sessionVersion) {
               return null as any; // Invalidates session
            }

            token.status = dbAdmin.status;
            token.picture = dbAdmin.image;
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

export function adminAuth() {
   return getServerSession(adminAuthOptions);
}
