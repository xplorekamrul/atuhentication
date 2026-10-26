"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Edit2, Laptop, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useTheme } from "next-themes";
import { generateThemeCSS, type ThemeColors, DEFAULT_THEME_COLORS } from "@/lib/theme-utils";

export type SerializedTheme = {
  id: string;
  name: string;
  colors: ThemeColors;
};

interface UserThemeCustomizerProps {
  dbThemes?: SerializedTheme[];
  defaultThemeColors?: ThemeColors;
  initialPreference?: {
    type: "default" | "db" | "custom";
    themeId?: string;
    colors?: ThemeColors;
  } | null;
}

export function UserThemeCustomizer({
  dbThemes = [],
  defaultThemeColors = DEFAULT_THEME_COLORS,
  initialPreference,
}: UserThemeCustomizerProps) {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const [activePreference, setActivePreference] = useState<{
    type: "default" | "db" | "custom";
    themeId?: string;
    colors?: ThemeColors;
  }>(initialPreference || { type: "default", colors: defaultThemeColors });

  const [showCustom, setShowCustom] = useState(
    initialPreference?.type === "custom"
  );
  const [customColors, setCustomColors] = useState<ThemeColors>(
    initialPreference?.type === "custom" && initialPreference.colors
      ? initialPreference.colors
      : {
          primary: defaultThemeColors.primary || "#009966",
          secondary: defaultThemeColors.secondary || "#1C1C84",
          accent: defaultThemeColors.accent || "#059337",
        }
  );

  useEffect(() => {
    setMounted(true);
    try {
      const saved = localStorage.getItem("user_theme_preference");
      if (saved) {
        const parsed = JSON.parse(saved);
        setActivePreference(parsed);
        // Ensure cookie is synced for server-rendered reloads
        document.cookie = `user_theme_preference=${encodeURIComponent(saved)}; path=/; max-age=31536000; SameSite=Lax`;
        if (parsed.type === "custom" && parsed.colors) {
          setCustomColors(parsed.colors);
          setShowCustom(true);
        }
      }
    } catch (e) {
      console.error("Failed to load user theme preference", e);
    }
  }, []);

  const applyPreference = (pref: typeof activePreference) => {
    setActivePreference(pref);
    try {
      if (pref.type === "default") {
        localStorage.removeItem("user_theme_preference");
        document.cookie = "user_theme_preference=; path=/; max-age=0; SameSite=Lax";
      } else {
        const serialized = JSON.stringify(pref);
        localStorage.setItem("user_theme_preference", serialized);
        document.cookie = `user_theme_preference=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
      }
    } catch {}
    if (pref.type === "custom") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
    }
  };

  const handleCustomColorChange = (key: keyof ThemeColors, value: string) => {
    const newColors = { ...customColors, [key]: value };
    setCustomColors(newColors);
    const pref = { type: "custom" as const, colors: newColors };
    try {
      const serialized = JSON.stringify(pref);
      localStorage.setItem("user_theme_preference", serialized);
      document.cookie = `user_theme_preference=${encodeURIComponent(serialized)}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}
    setActivePreference(pref);
  };

  // Dynamically inject CSS into document.head for instant zero-reload theme changes
  useEffect(() => {
    let colorsToApply: ThemeColors = defaultThemeColors;

    if (activePreference?.type === "db") {
      const found = dbThemes.find((t) => String(t.id) === String(activePreference.themeId));
      colorsToApply = found?.colors || activePreference.colors || defaultThemeColors;
    } else if (activePreference?.type === "custom" && activePreference.colors) {
      colorsToApply = activePreference.colors;
    } else {
      colorsToApply = defaultThemeColors;
    }

    const css = generateThemeCSS(colorsToApply);

    let styleEl =
      document.getElementById("app-theme-style") ||
      document.getElementById("server-theme-style") ||
      document.getElementById("user-theme-style");

    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "app-theme-style";
      document.head.appendChild(styleEl);
    } else {
      styleEl.id = "app-theme-style";
    }
    styleEl.innerHTML = css;

    // Remove any conflicting leftover style elements
    const oldServer = document.getElementById("server-theme-style");
    if (oldServer && oldServer !== styleEl) oldServer.remove();
    const oldUser = document.getElementById("user-theme-style");
    if (oldUser && oldUser !== styleEl) oldUser.remove();
  }, [activePreference, dbThemes, defaultThemeColors]);

  const ThemeCircle = ({
    primary,
    secondary,
    accent,
    isSelected,
    onClick,
    children,
    title,
    overlayIcon,
  }: {
    primary?: string;
    secondary?: string;
    accent?: string;
    isSelected: boolean;
    onClick: () => void;
    children?: React.ReactNode;
    title: string;
    overlayIcon?: boolean;
  }) => (
    <div
      onClick={onClick}
      title={title}
      className={`size-12 rounded-full cursor-pointer flex flex-col overflow-hidden relative border transition-all ${
        isSelected
          ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105 shadow-md"
          : "hover:ring-2 hover:ring-muted hover:ring-offset-2 hover:ring-offset-background hover:scale-105 opacity-85 hover:opacity-100"
      }`}
    >
      {children && !overlayIcon ? (
        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground hover:text-foreground transition-colors">
          {children}
        </div>
      ) : (
        <>
          <div className="h-1/2 w-full" style={{ backgroundColor: primary }} />
          <div className="h-1/2 w-full flex">
            <div className="h-full w-1/2" style={{ backgroundColor: secondary }} />
            <div className="h-full w-1/2" style={{ backgroundColor: accent }} />
          </div>
          {overlayIcon && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] hover:bg-black/35 transition-colors">
              {children}
            </div>
          )}
        </>
      )}

      {isSelected && (
        <div className="absolute top-0 right-0 bg-primary rounded-full p-0.5 shadow-sm transform translate-x-0.5 -translate-y-0.5 z-10">
          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Floating Theme Button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed bottom-4 right-4 z-50 rounded-full shadow-lg h-12 w-12 bg-background/90 backdrop-blur border-2 hover:scale-110 active:scale-95 transition-all cursor-pointer"
        onClick={() => setOpen(true)}
        title="Customize Theme"
        aria-label="Customize Theme"
      >
        <Palette className="w-5 h-5 text-primary" />
      </Button>

      {/* Theme Picker Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-120">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Palette className="w-5 h-5 text-primary" />
              Customize Theme
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Mode Switcher Section (Dark / Light / Auto) */}
            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-foreground">Appearance Mode</span>
                <span className="text-[11px] text-muted-foreground">Toggle Light, Dark, or System mode</span>
              </div>
              {mounted ? (
                <div className="flex items-center gap-1 bg-background p-1 rounded-lg border border-border shadow-xs">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      theme === "light"
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Light Mode"
                  >
                    <Sun className="size-3.5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      theme === "dark"
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="Dark Mode"
                  >
                    <Moon className="size-3.5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("system")}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      theme === "system"
                        ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    title="System Auto Mode"
                  >
                    <Laptop className="size-3.5" />
                    <span>Auto</span>
                  </button>
                </div>
              ) : (
                <div className="h-8 w-24 bg-muted animate-pulse rounded-md" />
              )}
            </div>

            {/* Color Presets Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-foreground">Color Palette</span>
                <span className="text-[11px] text-muted-foreground">Select a preset or customize</span>
              </div>
              <div className="flex flex-wrap gap-3.5 items-center justify-center p-3 rounded-xl border border-border bg-muted/20">
                {/* System Default */}
                <ThemeCircle
                  primary={defaultThemeColors.primary}
                  secondary={defaultThemeColors.secondary}
                  accent={defaultThemeColors.accent}
                  isSelected={activePreference.type === "default"}
                  onClick={() =>
                    applyPreference({ type: "default", colors: defaultThemeColors })
                  }
                  title="System Default"
                  overlayIcon={true}
                >
                  <RotateCcw className="w-4 h-4 text-white drop-shadow" />
                </ThemeCircle>

                {/* Database Themes */}
                {dbThemes.map((t) => {
                  const colors = t.colors || {};
                  return (
                    <ThemeCircle
                      key={t.id}
                      title={t.name}
                      primary={colors.primary || "#000"}
                      secondary={colors.secondary || "#000"}
                      accent={colors.accent || "#000"}
                      isSelected={
                        activePreference.type === "db" &&
                        String(activePreference.themeId) === String(t.id)
                      }
                      onClick={() =>
                        applyPreference({
                          type: "db",
                          themeId: String(t.id),
                          colors: t.colors,
                        })
                      }
                    />
                  );
                })}

                {/* Custom Palette Toggle */}
                <ThemeCircle
                  isSelected={activePreference.type === "custom"}
                  onClick={() =>
                    applyPreference({ type: "custom", colors: customColors })
                  }
                  title="Custom Color Palette"
                >
                  <Edit2 className="w-4 h-4" />
                </ThemeCircle>
              </div>
            </div>

            {/* Custom Color Inputs */}
            {showCustom && (
              <div className="space-y-3.5 p-4 border border-border rounded-xl bg-muted/20 animate-in fade-in zoom-in-95 duration-200">
                <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  Custom Colors
                </h4>

                <div className="space-y-2.5">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-20 text-muted-foreground">
                      Primary
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="color"
                        value={customColors.primary}
                        onChange={(e) =>
                          handleCustomColorChange("primary", e.target.value)
                        }
                        className="w-10 h-8 rounded border border-border bg-card p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        type="text"
                        value={customColors.primary}
                        onChange={(e) =>
                          handleCustomColorChange("primary", e.target.value)
                        }
                        className="flex-1 h-8 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-20 text-muted-foreground">
                      Secondary
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="color"
                        value={customColors.secondary}
                        onChange={(e) =>
                          handleCustomColorChange("secondary", e.target.value)
                        }
                        className="w-10 h-8 rounded border border-border bg-card p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        type="text"
                        value={customColors.secondary}
                        onChange={(e) =>
                          handleCustomColorChange("secondary", e.target.value)
                        }
                        className="flex-1 h-8 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium w-20 text-muted-foreground">
                      Accent
                    </label>
                    <div className="flex-1 flex gap-2">
                      <input
                        type="color"
                        value={customColors.accent}
                        onChange={(e) =>
                          handleCustomColorChange("accent", e.target.value)
                        }
                        className="w-10 h-8 rounded border border-border bg-card p-0.5 cursor-pointer shrink-0"
                      />
                      <Input
                        type="text"
                        value={customColors.accent}
                        onChange={(e) =>
                          handleCustomColorChange("accent", e.target.value)
                        }
                        className="flex-1 h-8 uppercase font-mono text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
