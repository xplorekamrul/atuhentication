# UI & Theming Guidelines

This document outlines the standard practices for styling components within the `eduplus` workspace. Following these guidelines ensures perfect compatibility across both **Light Mode** and **Dark Mode**, and maintains a premium, cohesive aesthetic.

## 1. Colors & Semantic Variables

**DO NOT** use fixed color classes like `bg-white`, `bg-gray-50`, `text-gray-900`, or `dark:bg-slate-900` unless absolutely necessary for a one-off exception. Hardcoded colors do not scale and break dark mode consistency.

**ALWAYS** use the semantic CSS variables defined in `app/globals.css`.

### Available Semantic Colors:
- **Backgrounds**: `bg-background`, `bg-card`, `bg-muted`
- **Text**: `text-foreground`, `text-card-foreground`, `text-muted-foreground`
- **Borders**: `border-border`
- **Brand/Themes**: `bg-primary`, `text-primary`, `bg-secondary`, `bg-accent`

### Example Usage:
```tsx
// ❌ BAD: Fixed colors break easily and require manual dark mode variants
<div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 p-6">
  <h2 className="text-gray-900 dark:text-white">Title</h2>
  <p className="text-gray-500 dark:text-gray-400">Subtitle text...</p>
</div>

// ✅ GOOD: Semantic colors automatically adapt to the user's color scheme
<div className="bg-card border border-border p-2">
  <h2 className="text-card-foreground">Title</h2>
  <p className="text-muted-foreground">Subtitle text...</p>
</div>
```

---

## 2. Opacity and Modifiers

When you need a lighter version of a color (especially for theme colors like `primary` or `success`), use Tailwind's opacity modifiers instead of picking a lighter shade from the palette.

```tsx
// Background with 10% opacity for a subtle tint
<div className="bg-primary/10 text-primary p-2 rounded-md">
  Subtle Alert Box
</div>

// Border with 50% opacity
<div className="border-border/50">...</div>
```

---

## 3. Shadows & Depth

Shadows are crucial for creating depth (the "Z-axis") in the application.

- **Light Mode**: Standard Tailwind shadows (`shadow-sm`, `shadow-md`, `shadow-lg`) work beautifully against `bg-background`.
- **Dark Mode**: Standard box-shadows are often invisible against a dark background. To create depth in dark mode, you can either rely on subtle borders (`border-border`) OR use custom dark shadows (e.g. `dark:shadow-[0_8px_30px_rgb(0,0,0,0.12)]`).

### Example Usage:
```tsx
<div className="bg-card border border-border shadow-md rounded-xl">
  ...
</div>

// Interactive Elements (Buttons, Hoverable Cards)
<button className="shadow-sm hover:shadow-md active:shadow-sm transition-shadow">
  Click Me
</button>
```

---

## 4. Transitions & Animations

Premium interfaces feel alive. Use transitions on interactable elements to give immediate visual feedback.

### Hover Effects:
Always pair hover effects with a smooth transition.

```tsx
// ✅ GOOD: Smooth lift effect on hover
<div className="transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
  Hover me to lift!
</div>

// ✅ GOOD: Button click effect
<button className="transition-all active:scale-95 hover:bg-primary/90">
  Press Me
</button>
```

### Transition Delays & Durations:
For staggered entrances (like a list of items loading), use `delay-` utilities.
```tsx
<ul>
  <li className="animate-in fade-in slide-in-from-bottom-4 duration-500">Item 1</li>
  <li className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">Item 2</li>
  <li className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">Item 3</li>
</ul>
```

### Recommended Tailwind Animation Utilities:
If you have plugins like `tailwindcss-animate` installed, utilize them for clean mount animations:
- `animate-in fade-in zoom-in-95`
- `duration-300` or `duration-500` (default is usually 150ms, which can be too fast for structural animations).
- `ease-in-out` or `ease-out` (use `ease-out` for things entering the screen).

---

## 5. UI Components (Shadcn)

**Strict Restriction**: Do **NOT** use raw HTML input or interactive elements (e.g., `<button>`, `<input>`, `<select>`, `<dialog>`, `<label>`). 
Always use the corresponding **Shadcn UI component** from `components/ui/` (e.g., `<Button>`, `<Input>`, `<Label>`).

If a required component is missing, install it using the shadcn CLI (`npx shadcn@latest add [component-name]`) before building the UI.

---

## 6. Relational Selectors

When creating forms that require selecting related data (foreign keys, like picking an `EducationLevel` or an `Institute`), **DO NOT** use raw `<select>` or basic dropdowns. 

Instead, you must build a custom selector component under `components/selector/` that wraps `components/shared/custom-select.tsx` with `searchable={true}` enabled. This provides a consistent, powerful UI that supports search and custom rendering.

### Example Selector Usage:
```tsx
import { CustomSelect, Option } from "@/components/shared/custom-select";

// components/selector/education-level-selector.tsx
export function EducationLevelSelector({ value, onValueChange, data }) {
  return (
    <CustomSelect searchable={true} value={value} onValueChange={onValueChange}>
       {data.map(item => <Option key={item.id} value={item.id}>{item.name}</Option>)}
    </CustomSelect>
  );
}
```

---

## 7. Summary Checklist for New Components
1. [ ] Did I use `bg-card` / `bg-background` instead of `bg-white`?
2. [ ] Did I use `border-border` instead of `border-gray-200`?
3. [ ] Are texts using `text-foreground` / `text-muted-foreground`?
4. [ ] Does the element need a `shadow-sm`? Does that shadow look good in dark mode?
5. [ ] Do interactive elements (buttons, links, cards) have `transition-colors` or `transition-all` on hover?
6. [ ] **Did I use Shadcn UI components instead of raw HTML interactive tags?**
7. [ ] Did I use specific Model Selectors (built on `custom-select`) for relational dropdowns?
