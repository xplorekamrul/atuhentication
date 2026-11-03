"use client";

import { cn } from "@/lib/utils";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown } from "lucide-react";
import * as React from "react";

export interface CheckboxOption {
   value: string;
   label: string;
   disabled?: boolean;
   /** Optional data payload passed to renderOption */
   data?: Record<string, unknown>;
}

export interface CheckboxDropdownProps {
   value: string[];
   onValueChange: (values: string[]) => void;
   options: CheckboxOption[];
   placeholder?: string;
   searchPlaceholder?: string;
   maxSelections?: number;
   className?: string;
   disabled?: boolean;
   searchable?: boolean;
   emptyMessage?: string;
   onOpen?: () => void;
   onClose?: () => void;
   /** Custom renderer for each option. Receives the option and whether it is selected. */
   renderOption?: (option: CheckboxOption, isSelected: boolean) => React.ReactNode;
   /** Min width of the dropdown panel (e.g. "320px"). Defaults to trigger width. */
   dropdownMinWidth?: string;
   dropdownClassName?: string;
   listClassName?: string;
   showSetButton?: boolean;
}

export function CheckboxDropdown({
   value,
   onValueChange,
   options,
   placeholder = "Select options",
   searchPlaceholder = "Search...",
   maxSelections,
   className,
   disabled = false,
   searchable = true,
   emptyMessage = "No results found",
   onOpen,
   onClose,
   renderOption,
   dropdownMinWidth,
   dropdownClassName,
   listClassName,
   showSetButton = false,
}: CheckboxDropdownProps) {
   const [open, setOpen] = React.useState(false);
   const [searchQuery, setSearchQuery] = React.useState("");
   const inputRef = React.useRef<HTMLInputElement>(null);

   // When showSetButton is true, we track a pending local selection
   const [pendingValue, setPendingValue] = React.useState<string[]>(value);

   // Keep pendingValue in sync with external value when dropdown opens
   React.useEffect(() => {
      if (open) {
         setPendingValue(value);
      }
   }, [open, value]);

   const handleOpenChange = React.useCallback(
      (isOpen: boolean) => {
         setOpen(isOpen);
         if (isOpen) {
            onOpen?.();
         } else {
            setSearchQuery("");
            if (!showSetButton) {
               // Without Set button: fire onClose which caller uses to apply changes
               onClose?.();
            } else {
               // With Set button: discard pending changes on close-without-set
               setPendingValue(value);
               onClose?.();
            }
         }
      },
      [onOpen, onClose, showSetButton, value],
   );

   // Focus input when dropdown opens
   React.useEffect(() => {
      if (open && searchable && inputRef.current) {
         setTimeout(() => {
            inputRef.current?.focus();
         }, 0);
      }
   }, [open, searchable]);

   // Keyboard close on Escape
   React.useEffect(() => {
      if (!open) return;
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
         }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
   }, [open]);

   // Filter options based on search
   const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      return options.filter((option) =>
         option.label.toLowerCase().includes(searchQuery.toLowerCase()),
      );
   }, [options, searchQuery]);

   // The "active" selection — pending when showSetButton, otherwise external value
   const activeValue = showSetButton ? pendingValue : value;

   // Handle checkbox toggle
   const handleToggle = (optionValue: string) => {
      if (showSetButton) {
         const next = pendingValue.includes(optionValue)
            ? pendingValue.filter((v) => v !== optionValue)
            : maxSelections && pendingValue.length >= maxSelections
               ? pendingValue
               : [...pendingValue, optionValue];
         setPendingValue(next);
      } else {
         const next = value.includes(optionValue)
            ? value.filter((v) => v !== optionValue)
            : maxSelections && value.length >= maxSelections
               ? value
               : [...value, optionValue];
         onValueChange(next);
      }
   };

   const handleSet = () => {
      onValueChange(pendingValue);
      setOpen(false);
      setSearchQuery("");
   };

   const handleCancel = () => {
      setPendingValue(value);
      setOpen(false);
      setSearchQuery("");
   };

   // Display text in trigger
   const selectedCount = value.length;
   const selectedLabels = React.useMemo(
      () => options.filter((opt) => value.includes(opt.value)).map((opt) => opt.label),
      [options, value],
   );

   return (
      <PopoverPrimitive.Root open={open} onOpenChange={handleOpenChange}>
         <PopoverPrimitive.Trigger asChild disabled={disabled}>
            {/* Trigger mirrors custom-select.tsx: search input lives inside the trigger */}
            <div
               className={cn(
                  "relative border focus-within:border-ring focus-within:ring-ring/50 flex w-full items-center justify-between gap-2 rounded-md bg-background px-3 text-sm shadow-xs transition-[color,box-shadow] focus-within:ring-[3px] h-9",
                  disabled && "cursor-not-allowed opacity-50",
                  className,
               )}
            >
               {/* Hidden button for Radix trigger */}
               <button
                  type="button"
                  role="combobox"
                  aria-expanded={open}
                  aria-haspopup="listbox"
                  aria-disabled={disabled}
                  disabled={disabled}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  tabIndex={-1}
               />

               {/* Search input (when open) or placeholder/selection display (when closed) */}
               {searchable ? (
                  <input
                     ref={inputRef}
                     type="text"
                     value={open ? searchQuery : ""}
                     onChange={(e) => setSearchQuery(e.target.value)}
                     placeholder={
                        open
                           ? searchPlaceholder
                           : selectedCount > 0
                              ? selectedLabels.join(", ")
                              : placeholder
                     }
                     disabled={disabled}
                     className={cn(
                        "flex-1 bg-transparent outline-none text-sm w-full min-w-0",
                        !open && selectedCount > 0
                           ? "placeholder:text-foreground truncate"
                           : "placeholder:text-muted-foreground",
                        disabled && "cursor-not-allowed pointer-events-none",
                        open && "cursor-text",
                        !open && "cursor-pointer",
                     )}
                     readOnly={!open}
                  />
               ) : (
                  <span className="flex-1 truncate text-sm">
                     {selectedCount > 0 ? (
                        <span>{selectedLabels.join(", ")}</span>
                     ) : (
                        <span className="text-muted-foreground">{placeholder}</span>
                     )}
                  </span>
               )}

               <ChevronDown
                  className={cn(
                     "w-4 h-4 shrink-0 opacity-50 transition-transform pointer-events-none",
                     open && "rotate-180",
                  )}
               />
            </div>
         </PopoverPrimitive.Trigger>

         <PopoverPrimitive.Portal>
            <PopoverPrimitive.Content
               role="listbox"
               align="start"
               sideOffset={4}
               style={dropdownMinWidth ? { minWidth: dropdownMinWidth } : undefined}
               className={cn(
                  "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 rounded-md border shadow-md outline-none flex flex-col",
                  !dropdownMinWidth && !dropdownClassName?.includes("w-") && "w-(--radix-popover-trigger-width)",
                  dropdownClassName,
               )}
               onOpenAutoFocus={(e: Event) => {
                  e.preventDefault();
               }}
            >
               {/* Options List — scrollable, capped so buttons always show */}
               <div
                  className={cn(
                     "overflow-y-auto space-y-0.5 py-1 scrollbar-thin scrollbar-thumb-accent scrollbar-track-transparent hover:scrollbar-thumb-accent/80",
                     showSetButton ? "max-h-55" : "max-h-75",
                     listClassName,
                  )}
               >
                  {filteredOptions.length === 0 ? (
                     <div className="py-6 text-center text-sm text-muted-foreground">
                        {emptyMessage}
                     </div>
                  ) : (
                     filteredOptions.map((option) => {
                        const isSelected = activeValue.includes(option.value);
                        const isDisabled =
                           option.disabled ||
                           !!(
                              maxSelections &&
                              activeValue.length >= maxSelections &&
                              !isSelected
                           );

                        return (
                           <label
                              key={option.value}
                              className={cn(
                                 "flex items-center gap-3 px-3 py-2 rounded-sm cursor-pointer hover:bg-accent/50 transition-colors select-none",
                                 isSelected && "bg-accent/20",
                                 isDisabled && "opacity-50 cursor-not-allowed",
                              )}
                           >
                              <input
                                 type="checkbox"
                                 checked={isSelected}
                                 onChange={() => handleToggle(option.value)}
                                 disabled={isDisabled}
                                 className="w-4 h-4 accent-primary cursor-pointer shrink-0"
                              />
                              {renderOption ? (
                                 <span className="flex-1 min-w-0">
                                    {renderOption(option, isSelected)}
                                 </span>
                              ) : (
                                 <span className="text-sm flex-1 truncate">{option.label}</span>
                              )}
                           </label>
                        );
                     })
                  )}
               </div>

               {/* Set & Cancel buttons — always pinned at bottom when showSetButton=true */}
               {showSetButton && (
                  <div className="flex items-center gap-2 px-3 py-2 border-t shrink-0">
                     <button
                        type="button"
                        onClick={handleCancel}
                        className="flex-1 h-7 rounded-md border border-border hover:bg-accent/50 hover:text-foreground text-muted-foreground text-xs font-medium transition-colors cursor-pointer"
                     >
                        Cancel
                     </button>
                     <button
                        type="button"
                        onClick={handleSet}
                        className="flex-1 h-7 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-semibold transition-colors cursor-pointer"
                     >
                        {pendingValue.length > 0 ? `Set (${pendingValue.length})` : "Set"}
                     </button>
                  </div>
               )}

               {/* Selection counter — shown when no Set button */}
               {!showSetButton && value.length > 0 && (
                  <div className="pt-1 pb-2 border-t text-xs text-muted-foreground text-center shrink-0">
                     {value.length} selected
                     {maxSelections && ` / ${maxSelections}`}
                  </div>
               )}
            </PopoverPrimitive.Content>
         </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
   );
}
