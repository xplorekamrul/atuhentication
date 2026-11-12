import { prisma } from "@/lib/prisma";
import { DEFAULT_REDIS_CACHE_TTL_SECONDS, getOrSetCache } from "@/lib/redis/cache";
import { DEFAULT_THEME_COLORS, type ThemeColors } from "../lib/theme-utils";

export * from "../lib/theme-utils";

/**
 * Get active default theme from Redis cache (falls back to DB on miss).
 */
export async function getTheme() {
  try {
    return await getOrSetCache<ThemeColors>({
      key: "theme:default",
      tags: ["theme"],
      ttlSeconds: DEFAULT_REDIS_CACHE_TTL_SECONDS,
      fetcher: async () => {
        const theme = await prisma.theme.findFirst({
          where: { isDefault: true },
        });

        if (theme && theme.colors) {
          const colors =
            typeof theme.colors === "string"
              ? JSON.parse(theme.colors)
              : theme.colors;
          return colors as ThemeColors;
        }

        return DEFAULT_THEME_COLORS;
      },
    });
  } catch (err) {
    console.error("Failed to fetch default theme:", err);
  }

  return DEFAULT_THEME_COLORS;
}
