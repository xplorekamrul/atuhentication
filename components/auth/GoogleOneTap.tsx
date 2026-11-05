"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

// ---------- Google Identity Services type declarations ----------
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GsiInitConfig) => void;
          prompt: () => void;
          cancel: () => void;
          renderButton?: (
            parent: HTMLElement,
            options: Record<string, unknown>
          ) => void;
          revoke: (
            hint: string,
            callback: (resp: { successful: boolean }) => void
          ) => void;
        };
      };
    };
  }
}

interface GsiInitConfig {
  client_id: string;
  callback: (response: GsiCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
  context?: "signin" | "signup" | "use";
}

interface GsiCredentialResponse {
  credential: string;
  select_by: string;
  clientId?: string;
}

interface GoogleOneTapProps {
  /** Where to redirect after successful sign-in (default: "/") */
  callbackUrl?: string;
  /** Disable prompting entirely */
  disabled?: boolean;
  /**
   * Softly hide the prompt when the user clicks/taps anywhere on the page
   * outside the prompt. Uses cancel(), which does NOT trigger Chrome's
   * dismissal cooldown. Default: true.
   */
  hideOnOutsideClick?: boolean;
  /**
   * Optionally hide the prompt automatically after N milliseconds
   * (also via cancel(), so no cooldown). 0 = disabled. Default: 0.
   */
  autoHideAfterMs?: number;
}

// ---------- Constants ----------
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";
const ONE_TAP_API = "/api/auth/google-one-tap";
const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const IS_DEV = process.env.NODE_ENV !== "production";

/** Set to false only if FedCM keeps failing in your environment. */
const USE_FEDCM = true;

/** Ignore clicks right after the prompt appears. */
const OUTSIDE_CLICK_GRACE_MS = 800;

/** Logs only in development so production consoles stay clean. */
const debug = (...args: unknown[]) => {
  if (IS_DEV) console.info("[GoogleOneTap]", ...args);
};

// ---------- Silence expected Google Identity Services logs ----------
// 1. AbortError: happens after our own cancel() (soft hide).
// 2. NetworkError "Error retrieving a token": happens when the visitor has
//    no Google account signed in (e.g. Incognito) or FedCM is blocked.
// Everything else is passed through unchanged.
let consoleFilterInstalled = false;
let hintShown = false;

function installGsiLogFilter() {
  if (typeof window === "undefined" || consoleFilterInstalled) return;
  consoleFilterInstalled = true;

  const original = console.error;
  console.error = (...args: unknown[]) => {
    const text = args
      .map((a) => (typeof a === "string" ? a : (a as Error)?.message ?? ""))
      .join(" ");

    if (text.includes("[GSI_LOGGER]")) {
      const isAbort = text.includes("FedCM get() rejects with AbortError");
      const isNoToken =
        text.includes("FedCM get() rejects with NetworkError") &&
        text.includes("Error retrieving a token");

      if (isAbort) return;

      if (isNoToken) {
        if (IS_DEV && !hintShown) {
          hintShown = true;
          console.info(
            "[GoogleOneTap] No token from FedCM. Usually no Google account is signed in " +
              "in this browser profile (e.g. Incognito), or FedCM is blocked for this site. " +
              "If it also happens while signed in, check Authorized JavaScript origins."
          );
        }
        return;
      }
    }

    original.apply(console, args);
  };
}

/** Only allow same-site relative paths (prevents open redirects). */
function safeRedirect(url: string | null | undefined, fallback = "/"): string {
  if (!url) return fallback;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\")) {
    return fallback;
  }
  return url;
}

// ---------- GIS script loader (single shared promise) ----------
let gsiPromise: Promise<void> | null = null;

function loadGsiScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_SRC}"]`
    );
    const script = existing ?? document.createElement("script");

    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener(
      "error",
      () => {
        gsiPromise = null; // allow retry later
        reject(new Error("Failed to load Google Identity Services script"));
      },
      { once: true }
    );

    if (!existing) {
      script.src = GIS_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return gsiPromise;
}

/**
 * GoogleOneTap: Google Identity Services One Tap with FedCM support.
 * - Works in Chrome, Edge, Firefox and Safari (classic UI where FedCM is unavailable).
 * - Clicking outside softly hides the prompt via cancel() (no Chrome cooldown).
 * - Expected GSI logs are filtered, so the console and Next.js overlay stay clean.
 */
export default function GoogleOneTap({
  callbackUrl = "/",
  disabled = false,
  hideOnOutsideClick = true,
  autoHideAfterMs = 0,
}: GoogleOneTapProps) {
  const pathname = usePathname();
  const { status } = useSession();
  const [error, setError] = useState<string | null>(null);

  const isAdminRoute = Boolean(pathname?.startsWith("/admin"));

  // ---- Credential callback (runs when the user picks an account) ----
  const handleCredentialResponse = useCallback(
    async (response: GsiCredentialResponse) => {
      try {
        setError(null);

        const res = await fetch(ONE_TAP_API, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            credential: response.credential,
            callbackUrl,
          }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok || !data?.ok) {
          setError(data?.message ?? "Sign-in failed. Please try again.");
          return;
        }

        const queryUrl = new URLSearchParams(window.location.search).get(
          "callbackUrl"
        );
        let target = safeRedirect(callbackUrl !== "/" ? callbackUrl : queryUrl);

        if (data.user?.userType === "ADMIN") {
          target = "/admin";
        } else if (target === "/dashboard") {
          target = "/";
        }

        // Full navigation so SessionProvider picks up the new session cookie
        window.location.assign(target);
      } catch {
        setError("Network error. Please try again.");
      }
    },
    [callbackUrl]
  );

  // Keep the latest callback in a ref so the effect below doesn't re-run
  // (and re-prompt) every time the callback identity changes.
  const callbackRef = useRef(handleCredentialResponse);
  useEffect(() => {
    callbackRef.current = handleCredentialResponse;
  }, [handleCredentialResponse]);

  // ---- Load GIS, initialize and show the prompt ----
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isAdminRoute) return; // Do not initialize GIS on admin portal routes
    if (status !== "unauthenticated") return; // wait for session, skip if logged in
    if (disabled) return;

    if (!CLIENT_ID) {
      debug("NEXT_PUBLIC_GOOGLE_CLIENT_ID is missing in .env");
      return;
    }

    // Dev only: clear Google's classic dismissal-cooldown cookie
    if (
      IS_DEV &&
      (window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1")
    ) {
      document.cookie = "g_state=;path=/;expires=Thu, 01 Jan 1970 00:00:01 GMT;";
    }

    let cancelled = false;
    let promptTimer: ReturnType<typeof setTimeout> | undefined;
    let autoHideTimer: ReturnType<typeof setTimeout> | undefined;
    let promptShownAt = 0;
    let removeOutsideListener: (() => void) | undefined;

    /** Soft-hide: programmatic cancel, NOT a user dismissal, so no cooldown. */
    const softHide = () => {
      if (autoHideTimer) clearTimeout(autoHideTimer);
      removeOutsideListener?.();
      removeOutsideListener = undefined;
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };

    installGsiLogFilter();

    loadGsiScript()
      .then(() => {
        if (cancelled || !window.google?.accounts?.id) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (r) => callbackRef.current(r),
          auto_select: false,
          // We handle outside clicks ourselves with cancel() below
          cancel_on_tap_outside: false,
          use_fedcm_for_prompt: USE_FEDCM,
          itp_support: true,
          context: "signin",
        });

        // Small delay lets hydration settle.
        // No moment-listener is passed to prompt(): the isDisplayed /
        // isNotDisplayed / isSkippedMoment methods are deprecated with FedCM
        // and produced the [GSI_LOGGER] warning.
        promptTimer = setTimeout(() => {
          if (cancelled) return;
          try {
            window.google?.accounts?.id?.prompt();
            promptShownAt = Date.now();

            if (hideOnOutsideClick) {
              const onOutside = () => {
                if (Date.now() - promptShownAt < OUTSIDE_CLICK_GRACE_MS) return;
                debug("Outside click: softly hiding prompt (no cooldown).");
                softHide();
              };
              // capture: true so it still fires if the page stops propagation
              document.addEventListener("pointerdown", onOutside, true);
              removeOutsideListener = () =>
                document.removeEventListener("pointerdown", onOutside, true);
            }

            if (autoHideAfterMs > 0) {
              autoHideTimer = setTimeout(softHide, autoHideAfterMs);
            }
          } catch {
            /* ignore */
          }
        }, 150);
      })
      .catch(() => {
        /* script blocked (ad-blocker/offline): fail silently */
      });

    return () => {
      cancelled = true;
      if (promptTimer) clearTimeout(promptTimer);
      if (autoHideTimer) clearTimeout(autoHideTimer);
      removeOutsideListener?.();
      try {
        window.google?.accounts?.id?.cancel();
      } catch {
        /* ignore */
      }
    };
  }, [isAdminRoute, status, disabled, hideOnOutsideClick, autoHideAfterMs]);

  if (isAdminRoute || !error) return null;

  return (
    <div className="fixed bottom-20 right-4 z-100 max-w-xs animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="rounded-lg border border-destructive/30 bg-card p-3 shadow-lg">
        <p className="text-xs text-destructive">{error}</p>
        <button
          onClick={() => setError(null)}
          className="mt-1 text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}