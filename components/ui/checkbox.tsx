import * as React from "react";

export interface CheckboxProps
   extends React.InputHTMLAttributes<HTMLInputElement> {
   onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
   ({ className, onCheckedChange, onChange, ...props }, ref) => (
      <input
         type="checkbox"
         ref={ref}
         className={`h-4 w-4 rounded border border-border bg-background cursor-pointer ${className || ""}`}
         onChange={(e) => {
            onCheckedChange?.(e.target.checked);
            onChange?.(e);
         }}
         {...props}
      />
   )
)
Checkbox.displayName = "Checkbox"

export { Checkbox };

