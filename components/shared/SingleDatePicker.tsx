"use client"
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

interface SingleDatePickerProps {
   onDateChange?: (date: Date) => void;
   defaultDate?: Date;
   disableFutureDates?: boolean;
   placeholder?: string;
}

/**
 * SingleDatePicker Component
 * 
 * A simple single date picker component for selecting a single date.
 * 
 * Features:
 * - Select a single date
 * - Optional disable future dates
 * - Calendar navigation
 * - Year selector
 * 
 * @example
 * ```tsx
 * <SingleDatePicker
 *   onDateChange={handleDateChange}
 *   defaultDate={new Date()}
 *   disableFutureDates={true}
 * />
 * ```
 */
const SingleDatePicker: React.FC<SingleDatePickerProps> = ({
   onDateChange,
   defaultDate,
   disableFutureDates = true,
   placeholder = "--Select Date--",
}) => {
   const [isOpen, setIsOpen] = useState(false);
   const [selectedDate, setSelectedDate] = useState<Date | undefined>(defaultDate);
   const [currentMonth, setCurrentMonth] = useState<Date>(defaultDate || new Date());
   const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);
   const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');

   const dropdownRef = useRef<HTMLDivElement>(null);
   const buttonRef = useRef<HTMLButtonElement>(null);
   const yearDropdownRef = useRef<HTMLDivElement>(null);

   useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
         if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
            setIsOpen(false);
         }
         if (yearDropdownRef.current && !yearDropdownRef.current.contains(event.target as Node)) {
            setIsYearDropdownOpen(false);
         }
      };

      if (isOpen || isYearDropdownOpen) {
         document.addEventListener('mousedown', handleClickOutside);
         return () => document.removeEventListener('mousedown', handleClickOutside);
      }
   }, [isOpen, isYearDropdownOpen]);

   useEffect(() => {
      setSelectedDate(defaultDate);
      if (defaultDate) {
         setCurrentMonth(defaultDate);
      }
   }, [defaultDate?.getTime()]);

   useEffect(() => {
      if (isOpen && buttonRef.current) {
         const buttonRect = buttonRef.current.getBoundingClientRect();
         const dropdownWidth = 320;
         const windowWidth = window.innerWidth;

         const spaceOnRight = windowWidth - buttonRect.right;
         const spaceOnLeft = buttonRect.left;

         if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
            setDropdownPosition('right');
         } else {
            setDropdownPosition('left');
         }
      }
   }, [isOpen]);

   const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();

      return { daysInMonth, startingDayOfWeek, year, month };
   };

   const renderCalendar = () => {
      const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentMonth);
      const days = [];

      // Previous month's trailing days
      for (let i = 0; i < startingDayOfWeek; i++) {
         days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
      }

      // Current month's days
      for (let day = 1; day <= daysInMonth; day++) {
         const date = new Date(year, month, day);
         const dateStr = date.toDateString();
         const selectedDateStr = selectedDate ? selectedDate.toDateString() : "";
         const isSelected = dateStr === selectedDateStr;
         const isToday = dateStr === new Date().toDateString();
         const isFuture = disableFutureDates && date > new Date();

         let cellClasses = 'h-8 w-8 text-sm transition-colors relative ';

         if (isSelected) {
            cellClasses += 'bg-green-600 text-white font-semibold rounded';
         } else if (isToday) {
            cellClasses += 'font-semibold text-green-600 hover:bg-gray-100 rounded';
         } else if (isFuture) {
            cellClasses += 'text-gray-300 cursor-not-allowed';
         } else {
            cellClasses += 'hover:bg-gray-100 rounded cursor-pointer';
         }

         days.push(
            <button
               key={day}
               onClick={() => {
                  if (!isFuture) {
                     setSelectedDate(date);
                     setIsOpen(false);
                     onDateChange?.(date);
                  }
               }}
               disabled={isFuture}
               className={cellClasses}
            >
               {day}
            </button>
         );
      }

      return (
         <div className="w-full">
            <div className="flex items-center justify-between mb-3 px-2">
               <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                  className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                  aria-label="Previous month"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               <div className="font-semibold text-sm">
                  {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
               </div>
               <button
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                  className="p-1 hover:bg-gray-100 rounded cursor-pointer"
                  aria-label="Next month"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-2">
               {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div key={day} className="h-8 w-8 flex items-center justify-center text-xs font-medium text-gray-600">
                     {day}
                  </div>
               ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
               {days}
            </div>
         </div>
      );
   };

   const handleYearChange = (year: number) => {
      const newMonth = new Date(currentMonth);
      newMonth.setFullYear(year);
      setCurrentMonth(newMonth);
   };

   const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 10 + i);

   const positionClasses = dropdownPosition === 'right'
      ? 'right-0'
      : 'left-0';

   const formatDisplayDate = (date: Date): string => {
      return date.toLocaleDateString('en-GB', {
         day: '2-digit',
         month: 'short',
         year: 'numeric'
      });
   };

   return (
      <div className="relative w-full" ref={dropdownRef}>
         <button
            ref={buttonRef}
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center gap-2 px-3 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors shadow-sm text-sm md:text-base cursor-pointer"
         >
            <Calendar className="w-4 h-4 text-gray-600 shrink-0" />
            <span className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
               {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
            </span>
         </button>

         {isOpen && (
            <div className={`absolute top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 ${positionClasses}`} onClick={(e) => e.stopPropagation()}>
               <div className="p-4 min-w-70">
                  {/* Year selector */}
                  <div className="flex items-center justify-center gap-2 mb-4" ref={yearDropdownRef}>
                     <label className="text-xs font-medium text-gray-600">Year:</label>
                     <button
                        onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                        className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors cursor-pointer flex items-center gap-2 min-w-20"
                     >
                        {currentMonth.getFullYear()}
                        <ChevronLeft className={`w-4 h-4 transition-transform ${isYearDropdownOpen ? 'rotate-90' : '-rotate-90'}`} />
                     </button>

                     {isYearDropdownOpen && (
                        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 w-20 overflow-y-auto">
                           {years.map(year => (
                              <button
                                 key={year}
                                 onClick={() => {
                                    handleYearChange(year);
                                    setIsYearDropdownOpen(false);
                                 }}
                                 className={`w-full px-3 py-2 text-sm text-left transition-colors cursor-pointer ${currentMonth.getFullYear() === year
                                    ? 'bg-green-50 text-green-700 font-semibold'
                                    : 'hover:bg-gray-100 text-gray-700'
                                    }`}
                              >
                                 {year}
                              </button>
                           ))}
                        </div>
                     )}
                  </div>

                  {/* Calendar */}
                  <div className="mb-4">
                     {renderCalendar()}
                  </div>

                  {/* Selected date display */}
                  <div className="border-t border-gray-200 pt-3 text-center">
                     <div className="text-xs text-gray-500 mb-1">Selected Date</div>
                     <div className="font-semibold text-sm">
                        {selectedDate ? formatDisplayDate(selectedDate) : placeholder}
                     </div>
                  </div>
               </div>
            </div>
         )}
      </div>
   );
};

export default SingleDatePicker;
