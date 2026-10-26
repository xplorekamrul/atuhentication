"use client";

import { createTheme, updateTheme } from "@/actions/admin/theme";
import type { ThemeColors } from "@/lib/theme-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export type ThemeType = {
  id: string;
  name: string;
  colors: ThemeColors;
  isDefault: boolean;
};

interface ThemeFormProps {
  initialData?: ThemeType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export default function ThemeForm({ initialData, onSuccess, onCancel }: ThemeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const [name, setName] = useState(initialData?.name || "");
  const [primary, setPrimary] = useState(initialData?.colors.primary || "#009966");
  const [secondary, setSecondary] = useState(initialData?.colors.secondary || "#1C1C84");
  const [accent, setAccent] = useState(initialData?.colors.accent || "#059337");
  const [backgroundImage, setBackgroundImage] = useState(initialData?.colors.backgroundImage || "");
  const [isDefault, setIsDefault] = useState(initialData?.isDefault || false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Theme name is required.");
      return;
    }

    startTransition(async () => {
      const colors: ThemeColors = {
        primary,
        secondary,
        accent,
        ...(backgroundImage.trim() ? { backgroundImage: backgroundImage.trim() } : {}),
      };

      let result;
      if (initialData) {
        result = await updateTheme(initialData.id, name, colors, isDefault);
      } else {
        result = await createTheme(name, colors, isDefault);
      }

      if (result.success) {
        if (onSuccess) onSuccess();
        else router.refresh();
      } else {
        setError(result.error || "An unexpected error occurred.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 p-3 rounded-md text-sm border border-red-200 dark:border-red-900">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Controls Column */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="mb-1.5 block text-sm font-medium">Theme Name</Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Emerald Glow, Cyberpunk Blue"
              required
            />
          </div>

          <div>
            <Label htmlFor="primary" className="mb-1.5 block text-sm font-medium">Primary Brand Color</Label>
            <div className="flex gap-2">
              <input
                id="primary-picker"
                type="color"
                value={primary.startsWith("#") ? primary : "#009966"}
                onChange={(e) => setPrimary(e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-border bg-card p-1 shrink-0"
                title="Pick solid color"
              />
              <Input
                id="primary"
                type="text"
                value={primary}
                onChange={(e) => setPrimary(e.target.value)}
                placeholder="#009966"
                className="font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="secondary" className="mb-1.5 block text-sm font-medium">Secondary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={secondary.startsWith("#") ? secondary : "#1C1C84"}
                onChange={(e) => setSecondary(e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-border bg-card p-1 shrink-0"
              />
              <Input
                id="secondary"
                type="text"
                value={secondary}
                onChange={(e) => setSecondary(e.target.value)}
                placeholder="#1C1C84"
                className="font-mono text-sm uppercase"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="accent" className="mb-1.5 block text-sm font-medium">Accent / Highlight Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                value={accent.startsWith("#") ? accent : "#059337"}
                onChange={(e) => setAccent(e.target.value)}
                className="h-10 w-12 rounded cursor-pointer border border-border bg-card p-1 shrink-0"
              />
              <Input
                id="accent"
                type="text"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                placeholder="#059337"
                className="font-mono text-sm uppercase"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-primary rounded border-border bg-card focus:ring-primary cursor-pointer"
            />
            <span className="text-sm font-medium text-foreground">Set as Default System Theme</span>
          </label>
        </div>

        {/* Live Preview Pane */}
        <div>
          <Label className="block text-sm font-medium mb-1.5">Live Interactive Preview</Label>
          <div
            className="w-full h-80 rounded-xl border border-border overflow-hidden relative shadow-sm flex flex-col transition-all"
            style={{
              backgroundColor: primary,
              backgroundImage: backgroundImage ? `url('${backgroundImage}')` : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Header Mock */}
            <header
              className="h-12 flex items-center justify-between px-4 text-white shadow-sm transition-colors"
              style={{ backgroundColor: secondary }}
            >
              <span className="font-semibold text-sm">Theme Preview App</span>
              <div className="flex gap-2">
                <span className="size-2.5 rounded-full bg-white/40" />
                <span className="size-2.5 rounded-full bg-white/60" />
                <span className="size-2.5 rounded-full bg-white/80" />
              </div>
            </header>

            {/* Content Mock */}
            <div className="flex-1 p-5 flex items-center justify-center bg-black/15 backdrop-blur-[2px]">
              <div className="bg-card/95 backdrop-blur-md p-5 rounded-xl shadow-xl w-full max-w-xs text-center space-y-3.5 border border-border">
                <div className="size-10 rounded-full mx-auto flex items-center justify-center text-white font-bold" style={{ backgroundColor: primary }}>
                  ✓
                </div>
                <div>
                  <h4 className="text-card-foreground font-semibold text-base">{name.trim() || "Preview Theme"}</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">Experience your personalized dynamic theme palette.</p>
                </div>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg text-white font-medium text-xs w-full transition-all hover:opacity-90 shadow-sm cursor-pointer"
                  style={{ backgroundColor: accent }}
                >
                  Action Button
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isPending}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isPending}
        >
          {isPending ? "Saving..." : initialData ? "Update Theme" : "Create Theme"}
        </Button>
      </div>
    </form>
  );
}
