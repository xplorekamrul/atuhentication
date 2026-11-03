"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface SimpleCalendarProps {
   // Called whenever green (work) dates change — full updated array
   onSelectedDatesChange: (dates: Date[]) => void;
   // Called whenever pink (weekend) dates change — full updated array
   onWeekendDatesChange?: (dates: Date[]) => void;

   // Edit-mode: pass dates loaded from DB once on open
   initialSelectedDates?: Date[];
   initialWeekendDates?: Date[];

   disablePastDates?: boolean;
   enableWeekendMarking?: boolean;

   // Change this value every time the calendar opens to fully reset state.
   // e.g. pass Date.now() on open, or a counter. Stable value = no reset.
   resetKey?: number | string;
}

const SimpleCalendar: React.FC<SimpleCalendarProps> = ({
   onSelectedDatesChange,
   onWeekendDatesChange,
   initialSelectedDates = [],
   initialWeekendDates = [],
   disablePastDates = false,
   enableWeekendMarking = false,
   resetKey,
}) => {
   const [currentDate, setCurrentDate] = useState(new Date());

   // Internal source-of-truth stored as "YYYY-MM-DD" string sets
   const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
   const [weekendSet, setWeekendSet] = useState<Set<string>>(new Set());

   // Range selection state
   const [rangeStart, setRangeStart] = useState<Date | null>(null);
   const [hoverDate, setHoverDate] = useState<Date | null>(null);

   // Double-click detection
   const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
   const clickCountRef = useRef<number>(0);
   const clickTargetRef = useRef<string>("");

   // ─── Reset + load DB dates on open (resetKey change) ────────────────────────
   useEffect(() => {
      setRangeStart(null);
      setHoverDate(null);
      clickCountRef.current = 0;
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);

      const newSelected = new Set<string>();
      initialSelectedDates.forEach(d => newSelected.add(dateToString(d)));

      const newWeekend = new Set<string>();
      initialWeekendDates.forEach(d => {
         const str = dateToString(d);
         // Mutual exclusion: weekend only if NOT in green
         if (!newSelected.has(str)) newWeekend.add(str);
      });

      setSelectedSet(newSelected);
      setWeekendSet(newWeekend);

      console.log(
         "🔄 Calendar reset. Green:", newSelected.size,
         "Pink:", newWeekend.size
      );
   // eslint-disable-next-line react-hooks/exhaustive-deps
   }, [resetKey]);

   // ─── Utility ─────────────────────────────────────────────────────────────────
   const dateToString = (date: Date): string =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

   const stringToDate = (str: string): Date => {
      const [y, m, d] = str.split("-").map(Number);
      const date = new Date(y, m - 1, d);
      date.setHours(0, 0, 0, 0);
      return date;
   };

   const isDateDisabled = (date: Date): boolean => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return disablePastDates ? d < today : d > today;
   };

   const isInHoverRange = (date: Date): boolean => {
      if (!rangeStart || !hoverDate) return false;
      const t = date.getTime();
      const s = Math.min(rangeStart.getTime(), hoverDate.getTime());
      const e = Math.max(rangeStart.getTime(), hoverDate.getTime());
      return t >= s && t <= e;
   };

   // ─── Parent notifications (full arrays) ──────────────────────────────────────
   const emitSelected = (next: Set<string>) => {
      const dates = Array.from(next).map(stringToDate);
      console.log("🟢 GREEN DATES:", dates.map(d => d.toDateString()));
      onSelectedDatesChange(dates);
   };

   const emitWeekend = (next: Set<string>) => {
      const dates = Array.from(next).map(stringToDate);
      console.log("🔴 PINK DATES:", dates.map(d => d.toDateString()));
      onWeekendDatesChange?.(dates);
   };

   // ─── Click handlers ───────────────────────────────────────────────────────────
   const handleDateClick = (day: number) => {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      if (isDateDisabled(date)) return;

      const dateStr = dateToString(date);

      // If click is on a different date than previous, reset counter
      if (clickTargetRef.current !== dateStr) {
         clickCountRef.current = 0;
         if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      }
      clickTargetRef.current = dateStr;
      clickCountRef.current += 1;

      if (clickCountRef.current === 1) {
         // Wait 300ms — if no second click, treat as single click
         clickTimerRef.current = setTimeout(() => {
            clickCountRef.current = 0;
            handleSingleClick(date, dateStr);
         }, 300);
      } else {
         // Double click
         if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
         clickCountRef.current = 0;
         handleDoubleClick(date, dateStr);
      }
   };

   const handleSingleClick = (date: Date, dateStr: string) => {
      // Single click on a weekend (pink) date does nothing for range selection
      if (weekendSet.has(dateStr)) return;

      if (!rangeStart) {
         console.log("🔵 Range start:", date.toDateString());
         setRangeStart(date);
         setHoverDate(null);
         return;
      }

      // Second click: complete range
      let start = rangeStart;
      let end = date;
      if (end < start) [start, end] = [end, start];

      console.log("✅ Range:", start.toDateString(), "→", end.toDateString());

      const nextSelected = new Set(selectedSet);
      const cur = new Date(start);
      while (cur <= end) {
         const str = dateToString(cur);
         // Mutual exclusion: only add green if NOT already pink
         if (!weekendSet.has(str)) {
            nextSelected.add(str);
         }
         cur.setDate(cur.getDate() + 1);
      }

      setSelectedSet(nextSelected);
      emitSelected(nextSelected);
      setRangeStart(null);
      setHoverDate(null);
   };

   const handleDoubleClick = (date: Date, dateStr: string) => {
      // Double-click always cancels any pending range
      setRangeStart(null);
      setHoverDate(null);

      if (weekendSet.has(dateStr)) {
         // Double-click pink → remove weekend
         const next = new Set(weekendSet);
         next.delete(dateStr);
         setWeekendSet(next);
         emitWeekend(next);
         console.log("❌ Removed weekend:", date.toDateString());
      } else if (selectedSet.has(dateStr)) {
         // Double-click green → deselect
         const next = new Set(selectedSet);
         next.delete(dateStr);
         setSelectedSet(next);
         emitSelected(next);
         console.log("❌ Deselected:", date.toDateString());
      } else {
         // Double-click empty → select single green date
         const next = new Set(selectedSet);
         next.add(dateStr);
         setSelectedSet(next);
         emitSelected(next);
         console.log("✅ Single selected:", date.toDateString());
      }
   };

   // ─── Right-click: toggle weekend (pink) ──────────────────────────────────────
   const handleDateRightClick = (e: React.MouseEvent, day: number) => {
      e.preventDefault();
      if (!enableWeekendMarking) return;

      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      if (isDateDisabled(date)) return;

      const dateStr = dateToString(date);

      if (weekendSet.has(dateStr)) {
         // Already pink → remove weekend
         const next = new Set(weekendSet);
         next.delete(dateStr);
         setWeekendSet(next);
         emitWeekend(next);
         console.log("🎯 Removed weekend:", date.toDateString());
      } else {
         // Mark as weekend: remove from green first (mutual exclusion)
         const nextSelected = new Set(selectedSet);
         if (nextSelected.has(dateStr)) {
            nextSelected.delete(dateStr);
            setSelectedSet(nextSelected);
            emitSelected(nextSelected);
         }
         const nextWeekend = new Set(weekendSet);
         nextWeekend.add(dateStr);
         setWeekendSet(nextWeekend);
         emitWeekend(nextWeekend);
         console.log("🎯 Marked weekend:", date.toDateString());
      }
   };

   const handleDateMouseEnter = (day: number) => {
      if (!rangeStart) return;
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      date.setHours(0, 0, 0, 0);
      if (!isDateDisabled(date)) setHoverDate(date);
   };

   // ─── Grid data ────────────────────────────────────────────────────────────────
   const getDaysInMonth = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
   const getFirstDayOfMonth = (d: Date) =>
      new Date(d.getFullYear(), d.getMonth(), 1).getDay();

   const daysInMonth = getDaysInMonth(currentDate);
   const firstDay = getFirstDayOfMonth(currentDate);
   const days: (number | null)[] = [
      ...Array(firstDay).fill(null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
   ];

   const monthName = currentDate.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
   });

   const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

   // ─── Render ───────────────────────────────────────────────────────────────────
   return (
      <div className="w-full">
         {/* Month Navigation */}
         <div className="flex items-center justify-between mb-4">
            <button
               onClick={() =>
                  setCurrentDate(
                     new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
                  )
               }
               className="p-1 hover:bg-gray-100 rounded transition-colors"
               aria-label="Previous month"
            >
               <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold">{monthName}</h2>
            <button
               onClick={() =>
                  setCurrentDate(
                     new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
                  )
               }
               className="p-1 hover:bg-gray-100 rounded transition-colors"
               aria-label="Next month"
            >
               <ChevronRight className="w-5 h-5" />
            </button>
         </div>

         {/* Weekday Headers */}
         <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
               <div
                  key={day}
                  className="text-center text-xs font-semibold text-gray-600 py-2"
               >
                  {day}
               </div>
            ))}
         </div>

         {/* Days Grid */}
         <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
               if (day === null) {
                  return <div key={`empty-${idx}`} className="aspect-square" />;
               }

               const date = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
               );
               date.setHours(0, 0, 0, 0);
               const dateStr = dateToString(date);

               const isSelected = selectedSet.has(dateStr);
               const isWeekend = weekendSet.has(dateStr);
               const isDisabled = isDateDisabled(date);
               const isToday = new Date().toDateString() === date.toDateString();
               const isPending = rangeStart
                  ? dateToString(rangeStart) === dateStr
                  : false;
               const inHoverRange = isInHoverRange(date);

               let bgClass = "";
               let borderClass = "border-2 border-gray-200";
               let textClass = "text-gray-700";

               if (isDisabled) {
                  bgClass = "bg-gray-50";
                  borderClass = "border-2 border-gray-200";
                  textClass = "text-gray-300 cursor-not-allowed";
               } else if (isWeekend && enableWeekendMarking) {
                  // Pink wins: weekend date
                  bgClass = "bg-pink-500 hover:bg-pink-600";
                  borderClass = "border-2 border-pink-600";
                  textClass = "text-white font-bold";
               } else if (isSelected || isPending) {
                  // Solid green: confirmed or pending range start
                  bgClass = "bg-primary hover:bg-primary/80";
                  borderClass = "border-2 border-primary";
                  textClass = "text-white font-bold";
               } else if (inHoverRange) {
                  // Hover preview
                  bgClass = "bg-primary/30";
                  borderClass = "border-2 border-dashed border-primary";
                  textClass = "text-primary font-semibold";
               } else if (isToday) {
                  bgClass = "hover:bg-primary/10";
                  borderClass = "border-2 border-primary";
                  textClass = "text-primary font-semibold";
               } else {
                  bgClass = "hover:bg-gray-100";
                  borderClass = "border-2 border-gray-500";
                  textClass = "text-gray-700";
               }

               return (
                  <button
                     key={day}
                     onClick={() => handleDateClick(day)}
                     onContextMenu={(e) => handleDateRightClick(e, day)}
                     onMouseEnter={() => handleDateMouseEnter(day)}
                     onMouseLeave={() => setHoverDate(null)}
                     disabled={isDisabled}
                     title={
                        enableWeekendMarking
                           ? "Click ×2 = range | Double-click = single select/deselect | Right-click = weekend toggle"
                           : "Click ×2 = range | Double-click = single select/deselect"
                     }
                     className={`aspect-square rounded-lg text-sm font-medium transition-colors cursor-pointer ${bgClass} ${borderClass} ${textClass}`}
                  >
                     {day}
                  </button>
               );
            })}
         </div>

         {/* Legend */}
         {enableWeekendMarking && (
            <div className="mt-4 space-y-2">
               <div className="p-2 bg-primary/10 border border-primary/80 rounded-lg flex items-start gap-2">
                  <div className="w-4 h-4 bg-primary rounded shrink-0 mt-0.5" />
                  <p className="text-xs text-primary">
                     <span className="font-semibold">Green dates:</span>{" "}
                     Click start → click end to select range. Double-click to select or deselect a single date.
                  </p>
               </div>
               <div className="p-2 bg-pink-50 border border-pink-200 rounded-lg flex items-start gap-2">
                  <div className="w-4 h-4 bg-pink-500 rounded shrink-0 mt-0.5" />
                  <p className="text-xs text-pink-800">
                     <span className="font-semibold">Pink dates:</span>{" "}
                     Right-click to mark/unmark as weekend. Double-click to remove a pink date.
                  </p>
               </div>
            </div>
         )}
      </div>
   );
};

export default SimpleCalendar;