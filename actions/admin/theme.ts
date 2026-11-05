"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ThemeColors } from "@/lib/theme-utils";

export async function getThemes() {
  try {
    let themes = await prisma.theme.findMany({
      orderBy: { createdAt: "desc" },
    });

    // If database has no themes yet, seed beautiful pre-defined initial themes
    if (themes.length === 0) {
      await seedInitialThemes();
      themes = await prisma.theme.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return {
      success: true as const,
      themes: themes.map((t) => ({
        id: t.id.toString(),
        name: t.name,
        colors: (typeof t.colors === "string" ? JSON.parse(t.colors) : t.colors) as ThemeColors,
        isDefault: t.isDefault,
      })),
    };
  } catch (error: any) {
    console.error("Failed to fetch themes:", error);
    return { success: false as const, error: error.message || "Failed to load themes" };
  }
}

export async function createTheme(name: string, colors: ThemeColors, isDefault: boolean) {
  try {
    const trimmedName = name.trim();
    if (!trimmedName) {
      return { success: false as const, error: "Theme name is required." };
    }

    // Check if name already exists
    const existing = await prisma.theme.findUnique({
      where: { name: trimmedName },
    });
    if (existing) {
      return { success: false as const, error: "A theme with this name already exists." };
    }

    // If this theme is set as default, unset others first
    if (isDefault) {
      await prisma.theme.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    const theme = await prisma.theme.create({
      data: {
        name: trimmedName,
        colors: colors as any,
        isDefault,
      },
    });

    revalidatePath("/admin/themes");
    revalidatePath("/", "layout");

    return {
      success: true as const,
      theme: {
        id: theme.id.toString(),
        name: theme.name,
        colors: theme.colors as ThemeColors,
        isDefault: theme.isDefault,
      },
    };
  } catch (error: any) {
    console.error("Failed to create theme:", error);
    return { success: false as const, error: error.message || "Failed to create theme." };
  }
}

export async function updateTheme(
  rawId: string | bigint,
  name: string,
  colors: ThemeColors,
  isDefault: boolean
) {
  try {
    const id = BigInt(rawId);
    const trimmedName = name.trim();

    if (!trimmedName) {
      return { success: false as const, error: "Theme name is required." };
    }

    // Check if name is taken by another theme
    const existing = await prisma.theme.findUnique({
      where: { name: trimmedName },
    });
    if (existing && existing.id !== id) {
      return { success: false as const, error: "A theme with this name already exists." };
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.theme.updateMany({
        where: {
          id: { not: id },
          isDefault: true,
        },
        data: { isDefault: false },
      });
    }

    const theme = await prisma.theme.update({
      where: { id },
      data: {
        name: trimmedName,
        colors: colors as any,
        isDefault,
      },
    });

    revalidatePath("/admin/themes");
    revalidatePath("/", "layout");

    return {
      success: true as const,
      theme: {
        id: theme.id.toString(),
        name: theme.name,
        colors: theme.colors as ThemeColors,
        isDefault: theme.isDefault,
      },
    };
  } catch (error: any) {
    console.error("Failed to update theme:", error);
    return { success: false as const, error: error.message || "Failed to update theme." };
  }
}

export async function deleteTheme(rawId: string | bigint) {
  try {
    const id = BigInt(rawId);
    const theme = await prisma.theme.findUnique({
      where: { id },
    });

    if (!theme) {
      return { success: false as const, error: "Theme not found." };
    }

    if (theme.isDefault) {
      return {
        success: false as const,
        error: "Cannot delete the default theme. Please set another theme as default first.",
      };
    }

    await prisma.theme.delete({
      where: { id },
    });

    revalidatePath("/admin/themes");
    revalidatePath("/", "layout");

    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to delete theme:", error);
    return { success: false as const, error: error.message || "Failed to delete theme." };
  }
}

export async function setDefaultTheme(rawId: string | bigint) {
  try {
    const id = BigInt(rawId);

    await prisma.$transaction([
      prisma.theme.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      }),
      prisma.theme.update({
        where: { id },
        data: { isDefault: true },
      }),
    ]);

    revalidatePath("/admin/themes");
    revalidatePath("/", "layout");

    return { success: true as const };
  } catch (error: any) {
    console.error("Failed to set default theme:", error);
    return { success: false as const, error: error.message || "Failed to set default theme." };
  }
}

/**
 * Seed initial themes if table is empty
 */
async function seedInitialThemes() {
  const starters = [
    {
      name: "Emerald Default",
      colors: { primary: "#009966", secondary: "#1C1C84", accent: "#059337" },
      isDefault: true,
    },
    {
      name: "Royal Navy",
      colors: { primary: "#00268b", secondary: "#0e7490", accent: "#f59e0b" },
      isDefault: false,
    },
    {
      name: "Crimson Sunset",
      colors: { primary: "#b91c1c", secondary: "#c2410c", accent: "#f59e0b" },
      isDefault: false,
    },
    {
      name: "Purple Orchid",
      colors: { primary: "#7c3aed", secondary: "#4338ca", accent: "#ec4899" },
      isDefault: false,
    },
  ];

  for (const item of starters) {
    try {
      await prisma.theme.upsert({
        where: { name: item.name },
        update: {},
        create: {
          name: item.name,
          colors: item.colors,
          isDefault: item.isDefault,
        },
      });
    } catch {
      // Ignore concurrent race condition collision
    }
  }
}
