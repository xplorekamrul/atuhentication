import { prisma } from "@/lib/prisma";
import { DEFAULT_THEME_COLORS, type ThemeColors } from "../lib/theme-utils";

export * from "../lib/theme-utils";

/**
 * Get active default theme from database (Server-side)
 */
export async function getTheme() {
  try {
    const theme = await prisma.theme.findFirst({
      where: { isDefault: true },
    });

    if (theme && theme.colors) {
      const colors = typeof theme.colors === "string" ? JSON.parse(theme.colors) : theme.colors;
      return colors as ThemeColors;
    }
  } catch (err) {
    console.error("Failed to fetch default theme:", err);
  }

  return DEFAULT_THEME_COLORS;
}
