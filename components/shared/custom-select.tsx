"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string | React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
  children?: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface OptionProps {
  value: string;
  children: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

export interface CustomSelectProps {
  // Core props
  value?: string;
  onValueChange: (value: string) => void;
  options?: SelectOption[];
  children?: React.ReactNode;

  // Display props
  placeholder?: string;
  className?: string;
  trigger?: React.ReactNode;
  hideChevron?: boolean;
  align?: "start" | "center" | "end";
  contentClassName?: string;

  // Search props
  searchable?: boolean;
  searchPlaceholder?: string;
  filterOption?: (input: string, option: SelectOption) => boolean;
  onSearchChange?: (searchQuery: string) => void; // For server-side search

  // Customization props
  optionRender?: (
    option: SelectOption,
    selected: boolean,
  ) => React.ReactNode;
  emptyMessage?: string;

  // Callbacks
  onOpen?: () => void;
  onClose?: () => void;
  onScrollEnd?: () => void; // For infinite scroll

  // Accessibility
  disabled?: boolean;
  name?: string;
}

export function Option({ children }: OptionProps) {
  return <>{children}</>;
}
Option.displayName = "Option";

function getLabelString(label: unknown): string {
  if (typeof label === "string") return label;
  if (typeof label === "number") return String(label);
  if (Array.isArray(label)) {
    return label
      .map((item) =>
        typeof item === "string" || typeof item === "number" ? item : "",
      )
      .join("");
  }
  return "";
}

function CustomSelectBase({
  value,
  onValueChange,
  options: optionsProp,
  children,
  placeholder = "Select an option",
  className,
  trigger,
  hideChevron = false,
  align = "start",
  contentClassName,
  searchable = false,
  searchPlaceholder = "Search...",
  filterOption,
  optionRender,
  emptyMessage = "No results found",
  disabled = false,
  name,
  onOpen,
  onClose,
  onScrollEnd,
  onSearchChange,
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false);

  // Handle open/close callbacks
  const handleOpenChange = React.useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        onOpen?.();
      } else {
        onClose?.();
      }
    },
    [onOpen, onClose],
  );

  const [searchQuery, setSearchQuery] = React.useState("");
  const [highlightedIndex, setHighlightedIndex] = React.useState(0);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const optionsRef = React.useRef<(HTMLDivElement | null)[]>([]);

  // Extract options from children if provided
  const optionsFromChildren = React.useMemo(() => {
    if (!children) return [];

    const childArray = React.Children.toArray(children);
    return childArray
      .filter(
        (child): child is React.ReactElement<OptionProps> =>
          React.isValidElement(child) &&
          (child.type === Option ||
            (child.type as unknown as { displayName?: string })
              ?.displayName === "Option"),
      )
      .map(
        (child): SelectOption => ({
          value: child.props.value,
          label: child.props.children,
          icon: child.props.icon,
          disabled: child.props.disabled,
          children: child.props.children,
        }),
      );
  }, [children]);

  // Use children options if available, otherwise fall back to options prop
  const options = React.useMemo(
    () => (optionsFromChildren.length > 0 ? optionsFromChildren : optionsProp || []),
    [optionsFromChildren, optionsProp],
  );

  // Default filter function
  const defaultFilterOption = (
    input: string,
    option: SelectOption,
  ): boolean => {
    const labelStr = getLabelString(option.label);
    return labelStr.toLowerCase().includes(input.toLowerCase());
  };

  // Get filtered options (only filter client-side if onSearchChange is not provided)
  const filteredOptions = React.useMemo(() => {
    // If onSearchChange is provided, don't filter client-side (server handles it)
    if (onSearchChange) return options;

    if (!searchQuery) return options;
    const filterFn = filterOption || defaultFilterOption;
    return options.filter((option) => filterFn(searchQuery, option));
  }, [options, searchQuery, filterOption, onSearchChange]);

  // Get selected option
  const selectedOption = React.useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  // Set highlighted index to selected option when dropdown opens or filtered options change
  React.useEffect(() => {
    if (open) {
      const selectedIndex = filteredOptions.findIndex(
        (option) => option.value === value,
      );
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  }, [filteredOptions, open, value]);

  // Focus input when dropdown opens and clear search when closed
  React.useEffect(() => {
    if (open && searchable && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    } else if (!open) {
      setSearchQuery("");
    }
  }, [open, searchable]);

  // Handle option selection
  const handleSelectOption = React.useCallback(
    (option: SelectOption) => {
      if (option.disabled) return;
      onValueChange(option.value);
      setOpen(false);
      setSearchQuery("");
    },
    [onValueChange],
  );

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (filteredOptions[highlightedIndex]) {
            handleSelectOption(filteredOptions[highlightedIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setSearchQuery("");
          break;
        case "Home":
          e.preventDefault();
          setHighlightedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setHighlightedIndex(filteredOptions.length - 1);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, filteredOptions, highlightedIndex, handleSelectOption]);

  // Scroll highlighted option into view
  React.useEffect(() => {
    if (open && optionsRef.current[highlightedIndex]) {
      optionsRef.current[highlightedIndex]?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }
  }, [highlightedIndex, open]);

  // Default option renderer
  const defaultOptionRender = (option: SelectOption) => (
    <div className="flex items-center gap-2">
      {option.icon && <option.icon className="w-4 h-4" />}
      {option.children ? option.children : <span>{option.label}</span>}
    </div>
  );

  const renderOption = optionRender || defaultOptionRender;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <div
          className={cn(
            "relative border dark:bg-foreground/20 focus-within:border-ring focus-within:ring-ring/50 aria-invalid:ring-destructive/20 aria-invalid:border-destructive flex w-full items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] h-9",
            disabled ? "cursor-not-allowed opacity-50 select-none" : "cursor-pointer",
            className,
          )}
        >
          {/* Hidden button for Radix trigger */}
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-haspopup="listbox"
            aria-controls="custom-select-content"
            aria-disabled={disabled}
            disabled={disabled}
            className={cn(
              "absolute inset-0 w-full h-full opacity-0",
              disabled ? "cursor-not-allowed pointer-events-none" : "cursor-pointer",
            )}
            tabIndex={-1}
          />

          {/* Display area with icon or custom trigger */}
          {trigger ? (
            <div className="flex items-center justify-center w-full h-full">
              {trigger}
            </div>
          ) : (
            <>
              {selectedOption?.icon && !open && (
                <selectedOption.icon className="w-4 h-4 shrink-0" />
              )}

              {/* Input field (visible when open) or selected value (when closed) */}
              {searchable ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={
                    open
                      ? searchQuery
                      : selectedOption
                        ? getLabelString(selectedOption.label)
                        : ""
                  }
                  onChange={(e) => {
                    const newQuery = e.target.value;
                    setSearchQuery(newQuery);
                    onSearchChange?.(newQuery);
                  }}
                  placeholder={
                    !open && !selectedOption ? placeholder : searchPlaceholder
                  }
                  disabled={disabled}
                  name={name}
                  className={cn(
                    "flex-1 bg-transparent outline-none placeholder:text-muted-foreground w-full",
                    !open && !selectedOption && "text-muted-foreground",
                    disabled ? "cursor-not-allowed pointer-events-none" : "cursor-pointer",
                  )}
                  readOnly={!open}
                />
              ) : (
                <span className="flex-1 truncate">
                  {selectedOption ? (
                    selectedOption.children || <span>{selectedOption.label}</span>
                  ) : (
                    <span className="text-muted-foreground">{placeholder}</span>
                  )}
                </span>
              )}

              {!hideChevron && (
                <ChevronDown
                  className={cn(
                    "w-4 h-4 shrink-0 opacity-50 transition-transform pointer-events-none",
                    open && "rotate-180",
                  )}
                />
              )}
            </>
          )}
        </div>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          id="custom-select-content"
          role="listbox"
          align={align}
          sideOffset={4}
          className={cn(
            "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-(--radix-popover-trigger-width) min-w-36 rounded-md border shadow-md outline-none",
            contentClassName,
          )}
          onOpenAutoFocus={(e: Event) => {
            e.preventDefault();
          }}
        >
          <div
            className="max-h-75 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent hover:scrollbar-thumb-accent/80 space-y-0.5"
            onScroll={(e) => {
              if (!onScrollEnd) return;
              const target = e.currentTarget;
              const isNearBottom =
                target.scrollHeight -
                  target.scrollTop -
                  target.clientHeight <
                50;
              if (isNearBottom) {
                onScrollEnd();
              }
            }}
          >
            {filteredOptions.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <div
                    key={option.value}
                    ref={(el) => {
                      optionsRef.current[index] = el;
                    }}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled}
                    data-highlighted={isHighlighted}
                    onClick={() => handleSelectOption(option)}
                    className={cn(
                      "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none select-none transition-colors",
                      isHighlighted && "bg-accent text-accent-foreground",
                      !isHighlighted && "hover:bg-accent/50",
                      option.disabled &&
                        "pointer-events-none opacity-50 cursor-not-allowed",
                      isSelected && "pr-8",
                    )}
                  >
                    {renderOption(option, isSelected)}
                    {isSelected && (
                      <Check className="absolute right-2 w-4 h-4" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

export const CustomSelect = Object.assign(CustomSelectBase, {
  Option,
});
