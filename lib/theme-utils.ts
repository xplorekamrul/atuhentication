export type ThemeColors = {
  primary: string;
  secondary: string;
  accent: string;
  backgroundImage?: string;
};

export const DEFAULT_THEME_COLORS: ThemeColors = {
  primary: "#009966",   // Emerald Green
  secondary: "#1C1C84", // Deep Indigo
  accent: "#059337",    // Vibrant Green
};

/**
 * Helper to extract a hex color from a string (in case the input is a gradient or invalid)
 */
export function extractBaseHex(colorStr: string): string {
  if (!colorStr) return DEFAULT_THEME_COLORS.primary;
  const match = colorStr.match(/#[0-9a-fA-F]{3,8}/);
  return match ? match[0] : DEFAULT_THEME_COLORS.primary;
}

/**
 * Convert Hex color string to HSL { h, s, l }
 */
export function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = 0, g = 0, b = 0;
  if (hex.length === 4) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else if (hex.length >= 7) {
    r = parseInt(hex.substring(1, 3), 16);
    g = parseInt(hex.substring(3, 5), 16);
    b = parseInt(hex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Generates an entire harmonious color palette for Tailwind/Shadcn based on theme colors.
 * Injects both :root (Light mode) and .dark (Dark mode) CSS variables.
 */
export function generateThemeCSS(themeColors: Record<string, string>) {
  const primaryInput = themeColors?.primary || DEFAULT_THEME_COLORS.primary;
  const secondaryInput = themeColors?.secondary || DEFAULT_THEME_COLORS.secondary;
  const accentInput = themeColors?.accent || DEFAULT_THEME_COLORS.accent;

  const baseHex = extractBaseHex(primaryInput);
  const { h, s, l } = hexToHSL(baseHex);

  const secHex = extractBaseHex(secondaryInput);
  const secHSL = hexToHSL(secHex);

  const isLight = l > 60;
  const primaryForeground = isLight ? "#0a0a0a" : "#ffffff";

  // In dark mode, headings and secondary highlights must be bright and legible
  const darkHeadingColor = `hsl(${secHSL.h}, ${Math.min(secHSL.s, 90)}%, 78%)`;

  // Light Mode Variables (Harmonious Tinting)
  const lightVars: Record<string, string> = {
    // Standard and App-specific tokens
    "--primary": primaryInput,
    "--primary-foreground": primaryForeground,
    "--secondary": secondaryInput,
    "--secondary-foreground": "#ffffff",
    "--accent": accentInput,
    "--accent-foreground": "#ffffff",
    "--hcolor": secondaryInput,
    "--scolor": primaryInput,
    "--tcolor": secondaryInput,
    "--greencolor": primaryInput,
    "--linkcolor": `hsl(${h}, ${Math.min(s, 35)}%, 35%)`,

    "--background": `hsl(${h}, ${Math.min(s, 20)}%, 98%)`,
    "--foreground": `hsl(${h}, ${s}%, 10%)`,
    "--light": `hsl(${h}, ${Math.min(s, 20)}%, 95%)`,
    "--card": `hsl(${h}, ${Math.min(s, 15)}%, 100%)`,
    "--card-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--popover": `hsl(${h}, ${Math.min(s, 15)}%, 100%)`,
    "--popover-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--muted": `hsl(${h}, ${Math.min(s, 20)}%, 94%)`,
    "--muted-foreground": `hsl(${h}, ${Math.min(s, 15)}%, 45%)`,
    "--border": `hsl(${h}, ${Math.min(s, 25)}%, 88%)`,
    "--input": `hsl(${h}, ${Math.min(s, 25)}%, 88%)`,
    "--ring": primaryInput,

    // Sidebar
    "--sidebar": primaryInput,
    "--sidebar-foreground": "#ffffff",
    "--sidebar-primary": primaryInput,
    "--sidebar-primary-foreground": primaryForeground,
    "--sidebar-accent": `hsl(${h}, ${Math.min(s, 30)}%, 92%)`,
    "--sidebar-accent-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--sidebar-border": `hsl(${h}, ${Math.min(s, 25)}%, 85%)`,
    "--sidebar-ring": primaryInput,

    // Tailwind v4 @theme inline overrides
    "--color-primary": primaryInput,
    "--color-primary-foreground": primaryForeground,
    "--color-secondary": secondaryInput,
    "--color-secondary-foreground": "#ffffff",
    "--color-accent": accentInput,
    "--color-accent-foreground": "#ffffff",
    "--color-hcolor": secondaryInput,
    "--color-scolor": primaryInput,
    "--color-tcolor": secondaryInput,
    "--color-greencolor": primaryInput,
    "--color-linkcolor": `hsl(${h}, ${Math.min(s, 35)}%, 35%)`,
    "--color-light": `hsl(${h}, ${Math.min(s, 20)}%, 95%)`,

    "--color-background": `hsl(${h}, ${Math.min(s, 20)}%, 98%)`,
    "--color-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--color-card": `hsl(${h}, ${Math.min(s, 15)}%, 100%)`,
    "--color-card-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--color-popover": `hsl(${h}, ${Math.min(s, 15)}%, 100%)`,
    "--color-popover-foreground": `hsl(${h}, ${s}%, 10%)`,
    "--color-muted": `hsl(${h}, ${Math.min(s, 20)}%, 94%)`,
    "--color-muted-foreground": `hsl(${h}, ${Math.min(s, 15)}%, 45%)`,
    "--color-border": `hsl(${h}, ${Math.min(s, 25)}%, 88%)`,
    "--color-input": `hsl(${h}, ${Math.min(s, 25)}%, 88%)`,
    "--color-ring": primaryInput,

    "--color-sidebar": primaryInput,
    "--color-sidebar-foreground": "#ffffff",
    "--color-sidebar-primary": primaryInput,
    "--color-sidebar-primary-foreground": primaryForeground,
    "--color-sidebar-border": `hsl(${h}, ${Math.min(s, 25)}%, 85%)`,
    "--color-sidebar-ring": primaryInput,
    "--bcolor": `hsl(${h}, ${s}%, 10%)`,
    "--color-bcolor": `hsl(${h}, ${s}%, 10%)`,
  };

  // Dark Mode Variables (Harmonious Shading)
  const darkVars: Record<string, string> = {
    // Standard and App-specific tokens
    "--primary": primaryInput,
    "--primary-foreground": "#ffffff",
    "--secondary": secondaryInput,
    "--secondary-foreground": "#ffffff",
    "--accent": accentInput,
    "--accent-foreground": "#ffffff",
    "--hcolor": darkHeadingColor,
    "--scolor": primaryInput,
    "--tcolor": darkHeadingColor,
    "--greencolor": primaryInput,
    "--linkcolor": `hsl(${h}, ${Math.min(s, 40)}%, 72%)`,

    "--background": `hsl(${h}, ${Math.min(s, 15)}%, 7%)`,
    "--foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--light": `hsl(${h}, ${Math.min(s, 15)}%, 12%)`,
    "--card": `hsl(${h}, ${Math.min(s, 15)}%, 11%)`,
    "--card-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--popover": `hsl(${h}, ${Math.min(s, 15)}%, 11%)`,
    "--popover-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--muted": `hsl(${h}, ${Math.min(s, 15)}%, 18%)`,
    "--muted-foreground": `hsl(${h}, ${Math.min(s, 15)}%, 65%)`,
    "--border": `hsl(${h}, ${Math.min(s, 15)}%, 20%)`,
    "--input": `hsl(${h}, ${Math.min(s, 15)}%, 22%)`,
    "--ring": primaryInput,

    // Sidebar
    "--sidebar": `hsl(${h}, ${Math.min(s, 15)}%, 9%)`,
    "--sidebar-foreground": "#ffffff",
    "--sidebar-primary": primaryInput,
    "--sidebar-primary-foreground": "#ffffff",
    "--sidebar-accent": `hsl(${h}, ${Math.min(s, 15)}%, 18%)`,
    "--sidebar-accent-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--sidebar-border": `hsl(${h}, ${Math.min(s, 15)}%, 18%)`,
    "--sidebar-ring": primaryInput,

    // Tailwind v4 @theme inline overrides
    "--color-primary": primaryInput,
    "--color-primary-foreground": "#ffffff",
    "--color-secondary": secondaryInput,
    "--color-secondary-foreground": "#ffffff",
    "--color-accent": accentInput,
    "--color-accent-foreground": "#ffffff",
    "--color-hcolor": darkHeadingColor,
    "--color-scolor": primaryInput,
    "--color-tcolor": darkHeadingColor,
    "--color-greencolor": primaryInput,
    "--color-linkcolor": `hsl(${h}, ${Math.min(s, 40)}%, 72%)`,
    "--color-light": `hsl(${h}, ${Math.min(s, 15)}%, 12%)`,

    "--color-background": `hsl(${h}, ${Math.min(s, 15)}%, 7%)`,
    "--color-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--color-card": `hsl(${h}, ${Math.min(s, 15)}%, 11%)`,
    "--color-card-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--color-popover": `hsl(${h}, ${Math.min(s, 15)}%, 11%)`,
    "--color-popover-foreground": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--color-muted": `hsl(${h}, ${Math.min(s, 15)}%, 18%)`,
    "--color-muted-foreground": `hsl(${h}, ${Math.min(s, 15)}%, 65%)`,
    "--color-border": `hsl(${h}, ${Math.min(s, 15)}%, 20%)`,
    "--color-input": `hsl(${h}, ${Math.min(s, 15)}%, 22%)`,
    "--color-ring": primaryInput,

    "--color-sidebar": `hsl(${h}, ${Math.min(s, 15)}%, 9%)`,
    "--color-sidebar-foreground": "#ffffff",
    "--color-sidebar-primary": primaryInput,
    "--color-sidebar-primary-foreground": "#ffffff",
    "--color-sidebar-border": `hsl(${h}, ${Math.min(s, 15)}%, 18%)`,
    "--color-sidebar-ring": primaryInput,
    "--bcolor": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
    "--color-bcolor": `hsl(${h}, ${Math.min(s, 10)}%, 98%)`,
  };

  const toCssString = (vars: Record<string, string>) =>
    Object.entries(vars)
      .map(([k, v]) => `${k}: ${v} !important;`)
      .join("\n        ");

  return `
    :root:root, html:not(.dark) {
        ${toCssString(lightVars)}
    }
    .dark:root, html.dark, [data-theme="dark"], .dark {
        ${toCssString(darkVars)}
    }
  `;
}
