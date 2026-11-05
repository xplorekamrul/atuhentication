import { prisma } from "@/lib/prisma";
import { recordLoginHistory } from "@/lib/login-history";
import { OAuth2Client } from "google-auth-library";
import { encode } from "next-auth/jwt";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || "";
const NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "";

const oauth2Client = new OAuth2Client(GOOGLE_CLIENT_ID);

interface GoogleOneTapRequestBody {
  credential?: string;
  callbackUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      console.error("[GoogleOneTap API] GOOGLE_CLIENT_ID is not configured");
      return NextResponse.json(
        { ok: false, message: "Google Client ID is not configured on the server." },
        { status: 500 }
      );
    }

    if (!NEXTAUTH_SECRET) {
      console.error("[GoogleOneTap API] NEXTAUTH_SECRET is not configured");
      return NextResponse.json(
        { ok: false, message: "NextAuth secret is not configured on the server." },
        { status: 500 }
      );
    }

    const body: GoogleOneTapRequestBody = await req.json().catch(() => ({}));
    const { credential } = body;

    if (!credential || typeof credential !== "string") {
      return NextResponse.json(
        { ok: false, message: "Google credential ID token is required." },
        { status: 400 }
      );
    }

    // 1. Verify Google ID token using google-auth-library
    let payload;
    try {
      const ticket = await oauth2Client.verifyIdToken({
        idToken: credential,
        audience: GOOGLE_CLIENT_ID,
      });
      payload = ticket.getPayload();
    } catch (verifyError: any) {
      console.error("[GoogleOneTap API] Token verification failed:", verifyError?.message);
      return NextResponse.json(
        { ok: false, message: "Invalid or expired Google token." },
        { status: 401 }
      );
    }

    if (!payload || !payload.email) {
      return NextResponse.json(
        { ok: false, message: "Unable to retrieve email from Google token." },
        { status: 400 }
      );
    }

    if (!payload.email_verified) {
      return NextResponse.json(
        { ok: false, message: "Google email is not verified." },
        { status: 400 }
      );
    }

    const email = payload.email.toLowerCase().trim();
    const name = payload.name ?? null;
    const picture = payload.picture ?? null;
    const googleUserId = payload.sub;

    // Helper for login history
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    let ip = forwarded?.split(",")[0]?.trim() || realIp || "Unknown IP";
    const userAgent = req.headers.get("user-agent") || "Unknown User Agent";

    // 2. Check if user is an existing Admin
    const admin = await prisma.admin.findUnique({
      where: { email },
    });

    let userRecord: {
      id: string;
      name: string | null;
      email: string;
      image: string | null;
      userType: "ADMIN" | "USER";
      level?: "ADMIN" | "SUPER_ADMIN" | "DEVELOPER";
      status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
      sessionVersion: number;
    };

    if (admin) {
      return NextResponse.json(
        { ok: false, message: "OAuth sign-in is not permitted for admin accounts. Please use credential login." },
        { status: 403 }
      );
    } else {
      // 3. Regular User: check if user exists, auto-register if new
      let user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        // Generate unique username matching existing auth logic
        const baseUsername =
          (name ?? email.split("@")[0])
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .slice(0, 30) || "user";

        let username = baseUsername;
        let counter = 1;
        while (await prisma.user.findUnique({ where: { username } })) {
          username = `${baseUsername}${counter++}`;
        }

        user = await prisma.user.create({
          data: {
            name,
            email,
            username,
            emailVerified: new Date(),
            image: picture,
            userType: "USER",
            sessionVersion: 1,
          },
        });
      } else {
        if (user.status === "SUSPENDED") {
          return NextResponse.json(
            { ok: false, message: "Your account is suspended. Please contact support." },
            { status: 403 }
          );
        }

        // Sync avatar if missing
        if (!user.image && picture) {
          user = await prisma.user.update({
            where: { id: user.id },
            data: { image: picture },
          });
        }
      }

      // 4. Link or update OAuthAccount record
      try {
        await prisma.oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: "google",
              providerAccountId: googleUserId,
            },
          },
          create: {
            userId: user.id,
            type: "oauth",
            provider: "google",
            providerAccountId: googleUserId,
            id_token: credential,
          },
          update: {
            id_token: credential,
          },
        });
      } catch (oauthErr) {
        console.error("[GoogleOneTap API] Failed to link OAuthAccount:", oauthErr);
      }

      // Record user login history (keeping only last 20)
      try {
        await recordLoginHistory({
          userId: user.id,
          ipAddress: ip,
          userAgent,
          maxKeep: 20,
        });
      } catch (logErr) {
        console.error("[GoogleOneTap API] Failed to log user history:", logErr);
      }

      userRecord = {
        id: user.id.toString(),
        name: user.name ?? null,
        email: user.email ?? email,
        image: user.image,
        userType: "USER",
        status: user.status as "ACTIVE" | "INACTIVE" | "SUSPENDED",
        sessionVersion: user.sessionVersion,
      };
    }

    // 5. Issue standard NextAuth JWT session token
    const tokenPayload = {
      name: userRecord.name,
      email: userRecord.email,
      picture: userRecord.image,
      sub: userRecord.id,
      id: userRecord.id,
      userType: userRecord.userType,
      level: userRecord.level,
      status: userRecord.status,
      sessionVersion: userRecord.sessionVersion,
    };

    const maxAge = 30 * 24 * 60 * 60; // 30 days
    const sessionToken = await encode({
      token: tokenPayload,
      secret: NEXTAUTH_SECRET,
      maxAge,
    });

    const isSecure =
      process.env.NODE_ENV === "production" ||
      (process.env.NEXTAUTH_URL ?? "").startsWith("https://") ||
      !!process.env.VERCEL;

    const cookieName = isSecure
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const cookieOptions = {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isSecure,
      maxAge,
      expires: new Date(Date.now() + maxAge * 1000),
    };

    // Set cookie on Next.js cookies store
    const cookieStore = await cookies();
    cookieStore.set(cookieName, sessionToken, cookieOptions);

    // Also set on JSON response headers
    const response = NextResponse.json({
      ok: true,
      message: "Sign-in successful",
      user: {
        id: userRecord.id,
        name: userRecord.name,
        email: userRecord.email,
        image: userRecord.image,
        userType: userRecord.userType,
      },
    });

    response.cookies.set(cookieName, sessionToken, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("[GoogleOneTap API] Unexpected error:", error);
    return NextResponse.json(
      { ok: false, message: error?.message || "Internal server error." },
      { status: 500 }
    );
  }
}

