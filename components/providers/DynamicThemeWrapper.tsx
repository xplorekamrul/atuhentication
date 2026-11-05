import { getThemes } from "@/actions/admin/theme";
import { generateThemeCSS, getTheme } from "@/actions/theme";
import { UserThemeCustomizer } from "@/components/user-theme-customizer";
import { connection } from "next/server";
import { cookies } from "next/headers";

export default async function DynamicThemeWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const cookieStore = await cookies();
  const userPrefCookie = cookieStore.get("user_theme_preference");
  let userSelectedColors = null;
  let activePref = null;

  if (userPrefCookie?.value) {
    try {
      const parsed = JSON.parse(decodeURIComponent(userPrefCookie.value));
      activePref = parsed;
      if (parsed?.colors?.primary) {
        userSelectedColors = parsed.colors;
      }
    } catch {}
  }

  // Fetch default active theme and all created themes
  const defaultColors = await getTheme();
  const themesResult = await getThemes();
  const dbThemes = themesResult.success && themesResult.themes ? themesResult.themes : [];

  // If user selected a DB theme, find its latest colors from dbThemes
  if (activePref?.type === "db" && activePref.themeId) {
    const found = dbThemes.find((t) => String(t.id) === String(activePref.themeId));
    if (found?.colors) {
      userSelectedColors = found.colors;
    }
  }

  const initialColors = userSelectedColors || defaultColors;
  const initialCss = generateThemeCSS(initialColors);

  return (
    <>
      {/* Inline script to guarantee instant sync before first paint on reload */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                var p = localStorage.getItem("user_theme_preference");
                if (p) {
                  document.cookie = "user_theme_preference=" + encodeURIComponent(p) + "; path=/; max-age=31536000; SameSite=Lax";
                }
              } catch(e){}
            })();
          `,
        }}
      />
      {/* Server-injected CSS ensures instant matching theme with zero flash */}
      <style
        id="app-theme-style"
        dangerouslySetInnerHTML={{ __html: initialCss }}
      />
      {/* Client customizer: allows instant real-time theme swapping */}
      <UserThemeCustomizer
        dbThemes={dbThemes}
        defaultThemeColors={defaultColors}
        initialPreference={activePref}
      />
      {children}
    </>
  );
}
