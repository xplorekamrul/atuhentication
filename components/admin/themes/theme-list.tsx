"use client";

import { deleteTheme, setDefaultTheme } from "@/actions/admin/theme";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Edit2, Palette, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import ThemeForm, { type ThemeType } from "./theme-form";

export default function ThemeList({ initialThemes }: { initialThemes: ThemeType[] }) {
  const [themes, setThemes] = useState<ThemeType[]>(initialThemes);
  const [editingTheme, setEditingTheme] = useState<ThemeType | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [actionError, setActionError] = useState("");

  const handleCreateNew = () => {
    setIsCreating(true);
    setEditingTheme(null);
    setActionError("");
  };

  const handleEdit = (theme: ThemeType) => {
    setEditingTheme(theme);
    setIsCreating(false);
    setActionError("");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this theme?")) return;

    const result = await deleteTheme(id);
    if (result.success) {
      setThemes((prev) => prev.filter((t) => t.id !== id));
      setActionError("");
    } else {
      setActionError(result.error || "Failed to delete theme");
    }
  };

  const handleSetDefault = async (id: string) => {
    const result = await setDefaultTheme(id);
    if (result.success) {
      setThemes((prev) =>
        prev.map((t) => ({
          ...t,
          isDefault: t.id === id,
        }))
      );
      setActionError("");
      // Refresh window so server root style re-renders with new default
      window.location.reload();
    } else {
      setActionError(result.error || "Failed to set default theme");
    }
  };

  const handleFormSuccess = () => {
    window.location.reload();
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingTheme(null);
  };

  if (isCreating || editingTheme) {
    return (
      <div className="bg-card p-6 rounded-2xl border border-border shadow-md transition-all">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-card-foreground">
            {isCreating ? "Create New Theme" : `Edit Theme: ${editingTheme?.name}`}
          </h2>
        </div>
        <ThemeForm
          initialData={editingTheme || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Available Themes</h2>
          <p className="text-sm text-muted-foreground">Manage and set active themes for the application.</p>
        </div>
        <Button onClick={handleCreateNew} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Create Theme
        </Button>
      </div>

      {actionError && (
        <div className="bg-destructive/10 text-destructive p-4 rounded-xl border border-destructive/20 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{actionError}</p>
        </div>
      )}

      {themes.length === 0 ? (
        <div className="text-center py-16 bg-muted/30 rounded-2xl border border-dashed border-border">
          <Palette className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-60" />
          <p className="text-muted-foreground font-medium">No themes found. Click &quot;Create Theme&quot; to design one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {themes.map((theme) => (
            <div
              key={theme.id}
              className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg hover:-translate-y-0.5 overflow-hidden flex flex-col transition-all duration-200"
            >
              {/* Visual Preview Header */}
              <div
                className="h-32 w-full relative transition-all"
                style={{
                  backgroundColor: theme.colors.primary,
                  backgroundImage: theme.colors.backgroundImage
                    ? `url('${theme.colors.backgroundImage}')`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                {theme.isDefault && (
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    DEFAULT
                  </div>
                )}

                {/* Secondary / Accent indicators */}
                <div className="absolute bottom-3 right-3 flex items-center gap-1.5">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: theme.colors.secondary }}
                    title={`Secondary: ${theme.colors.secondary}`}
                  />
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
                    style={{ backgroundColor: theme.colors.accent }}
                    title={`Accent: ${theme.colors.accent}`}
                  />
                </div>
              </div>

              {/* Theme Info and Actions */}
              <div className="p-5 flex flex-col grow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-card-foreground text-base">{theme.name}</h3>
                  <div className="flex gap-1 text-xs font-mono text-muted-foreground">
                    <span className="inline-block size-3 rounded-full mr-1" style={{ backgroundColor: theme.colors.primary }} />
                    {theme.colors.primary}
                  </div>
                </div>

                <div className="mt-auto pt-4 flex items-center justify-between gap-2 border-t border-border">
                  <Button
                    variant={theme.isDefault ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => handleSetDefault(theme.id)}
                    disabled={theme.isDefault}
                    className={theme.isDefault ? "opacity-60 cursor-default" : "text-primary hover:text-primary"}
                  >
                    {theme.isDefault ? "Active Default" : "Set Default"}
                  </Button>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(theme)}
                      title="Edit Theme"
                      className="size-8 text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(theme.id)}
                      disabled={theme.isDefault}
                      className="size-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                      title={theme.isDefault ? "Cannot delete default theme" : "Delete Theme"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
