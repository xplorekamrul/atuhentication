"use client";

import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import { Calendar } from "lucide-react";
import * as React from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { CustomSelect } from "./custom-select";

interface DatePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  minDate?: string;
  maxDate?: string;
  defaultToToday?: boolean;
}

function parseDateParts(val?: string): { year: number; month: number; day: number } | null {
  if (!val) return null;

  // If already in YYYY-MM-DD or starts with YYYY-MM-DD
  const isoMatch = val.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
      return { year: y, month: m - 1, day: d };
    }
  }

  // Parse strings like "14 Oct, 2026", "Oct 14, 2026", etc.
  const parsed = new Date(val);
  if (!isNaN(parsed.getTime())) {
    return {
      year: parsed.getFullYear(),
      month: parsed.getMonth(),
      day: parsed.getDate(),
    };
  }

  return null;
}

function normalizeDateToYMD(val?: string): string {
  const parts = parseDateParts(val);
  if (!parts) return "";
  return `${parts.year}-${String(parts.month + 1).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled = false,
  minDate,
  maxDate,
  defaultToToday = false,
}: DatePickerProps) {
  const today = new Date().toISOString().split("T")[0];
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState(() => {
    return normalizeDateToYMD(value) || (defaultToToday ? today : "");
  });
  const [displayMonth, setDisplayMonth] = React.useState(() => {
    const parts = parseDateParts(value);
    if (parts) {
      return { month: parts.month, year: parts.year };
    }
    const date = new Date();
    return { month: date.getMonth(), year: date.getFullYear() };
  });

  React.useEffect(() => {
    if (defaultToToday && !value && selectedDate === today) {
      onChange?.(today);
    }
  }, [defaultToToday, value, selectedDate, today, onChange]);

  // Sync selectedDate when value prop changes
  React.useEffect(() => {
    if (value !== undefined) {
      const normalized = normalizeDateToYMD(value);
      if (normalized !== selectedDate) {
        setSelectedDate(normalized);
        const parts = parseDateParts(value);
        if (parts) {
          setDisplayMonth({ month: parts.month, year: parts.year });
        }
      }
    }
  }, [value, selectedDate]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const formatDate = (date: string) => {
    const parts = parseDateParts(date);
    if (!parts) return "";
    const d = new Date(parts.year, parts.month, parts.day);
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const handleDateSelect = (day: number) => {
    const dateStr = `${displayMonth.year}-${String(displayMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    setSelectedDate(dateStr);
    onChange?.(dateStr);
    setIsOpen(false);
  };

  const handlePrevMonth = () => {
    setDisplayMonth((prev) => {
      if (prev.month === 0) {
        return { month: 11, year: prev.year - 1 };
      }
      return { month: prev.month - 1, year: prev.year };
    });
  };

  const handleNextMonth = () => {
    setDisplayMonth((prev) => {
      if (prev.month === 11) {
        return { month: 0, year: prev.year + 1 };
      }
      return { month: prev.month + 1, year: prev.year };
    });
  };



  const daysInMonth = getDaysInMonth(displayMonth.month, displayMonth.year);
  const firstDay = getFirstDayOfMonth(displayMonth.month, displayMonth.year);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const isDateDisabled = (day: number) => {
    const dateStr = `${displayMonth.year}-${String(displayMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (minDate && dateStr < minDate) return true;
    if (maxDate && dateStr > maxDate) return true;
    return false;
  };

  return (
    <Popover.Root open={isOpen} onOpenChange={(open) => !disabled && setIsOpen(open)}>
      <Popover.Trigger asChild disabled={disabled} className="w-full">
        <div className="relative">
          <Input
            type="text"
            value={selectedDate ? formatDate(selectedDate) : ""}
            placeholder={placeholder}
            readOnly
            disabled={disabled}
            className={cn("pr-10 cursor-pointer bg-background dark:bg-foreground/20 text-foreground h-9 rounded-md", className)}
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
            disabled={disabled}
          >
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="w-80 rounded-lg border border-border bg-popover text-popover-foreground shadow-lg z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          align="start"
          sideOffset={5}
        >
          <div className="p-3">
            {/* Month/Year Navigation */}
            <div className="flex items-center justify-between mb-4 gap-x-1">
              <Button
                type="button"
                variant="outline"
                // size=""
                onClick={handlePrevMonth}
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                ←
              </Button>
              <CustomSelect
                value={displayMonth.month.toString()}
                onValueChange={(val) => {
                  if (typeof val === 'string') {
                    setDisplayMonth((prev) => ({ ...prev, month: parseInt(val) }));
                  }
                }}
                options={months.map((month, idx) => ({ value: idx.toString(), label: month }))}
                className="w-32"
                searchable={true}
              />
              <CustomSelect
                value={displayMonth.year.toString()}
                onValueChange={(val) => {
                  if (typeof val === 'string') {
                    setDisplayMonth((prev) => ({ ...prev, year: parseInt(val) }));
                  }
                }}
                options={years.map((year) => ({ value: year.toString(), label: year.toString() }))}
                className="w-24"
                searchable={true}
                searchPlaceholder="Search year..."
              />
              <Button
                type="button"
                variant="outline"
                // size="sm"
                onClick={handleNextMonth}
                className="h-8 w-8 p-0 hover:bg-accent"
              >
                →
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                  {day}
                </div>
              ))}
              {emptyDays.map((_, idx) => (
                <div key={`empty-${idx}`} />
              ))}
              {days.map((day) => {
                const dateStr = `${displayMonth.year}-${String(displayMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isSelected = selectedDate === dateStr;
                const isDisabled = isDateDisabled(day);
                const isToday = dateStr === new Date().toISOString().split("T")[0];

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => !isDisabled && handleDateSelect(day)}
                    disabled={isDisabled}
                    className={cn(
                      "cursor-pointer h-9 w-9 text-sm rounded-md transition-colors",
                      !isSelected && !isDisabled && "hover:bg-accent hover:text-accent-foreground",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground",
                      isToday && !isSelected && "border border-primary",
                      isDisabled && "text-muted-foreground opacity-50 cursor-not-allowed hover:bg-transparent"
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
