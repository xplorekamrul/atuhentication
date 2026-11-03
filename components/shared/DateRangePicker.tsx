"use client"
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useRef, useState, } from 'react';

interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
  label: string;
}

interface CustomDateRangePickerProps {
  onRangeChange?: (range: DateRange) => void;
  defaultRange?: DateRange;
  presetsOnly?: boolean; // If true, only show custom range picker, hide presets
  hidePresets?: string[]; // Array of preset keys to hide (e.g., ['thisYear', 'lastYear'])
  showPresets?: string[]; // If provided, only show these presets in this order
  maxDayRange?: number; // Maximum number of days allowed in range (e.g., 31)
}

const allPresets = [
  { key: 'noFilter', label: 'No Date Filter' },
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'next7days', label: 'Next 7 Days' },
  { key: 'last7days', label: 'Last 7 Days' },
  { key: 'last30days', label: 'Last 30 Days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'nextMonth', label: 'Next Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'thisYear', label: 'This Year' },
  { key: 'nextYear', label: 'Next Year' },
  { key: 'lastYear', label: 'Last Year' },
  { key: 'custom', label: 'Custom Range' }
];

const CustomDateRangePicker: React.FC<CustomDateRangePickerProps> = ({
  onRangeChange,
  defaultRange,
  presetsOnly = false,
  hidePresets = [],
  showPresets,
  maxDayRange = undefined
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with default range or null as default
  const getDefaultRange = (): DateRange => {
    if (defaultRange && defaultRange.startDate && defaultRange.endDate) {
      return defaultRange;
    }
    if (defaultRange && defaultRange.startDate === null && defaultRange.endDate === null) {
      return defaultRange;
    }
    // Default to "Today"
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      startDate: today,
      endDate: today,
      label: 'Today'
    };
  };

  const [selectedRange, setSelectedRange] = useState<DateRange>(getDefaultRange());
  const [activePreset, setActivePreset] = useState<string>('thisMonth');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dropdownPosition, setDropdownPosition] = useState<'left' | 'right'>('left');
  const [dateRangeError, setDateRangeError] = useState<string>('');
  const [isYearDropdownOpen, setIsYearDropdownOpen] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const yearDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (defaultRange) {
      setSelectedRange(prev => {
        const isStartSame = prev.startDate?.getTime() === defaultRange.startDate?.getTime();
        const isEndSame = prev.endDate?.getTime() === defaultRange.endDate?.getTime();
        const isLabelSame = prev.label === defaultRange.label;
        if (isStartSame && isEndSame && isLabelSame) {
          return prev;
        }
        return defaultRange;
      });

      // Update activePreset
      const matchedPreset = allPresets.find(p => p.label === defaultRange.label);
      if (matchedPreset) {
        setActivePreset(matchedPreset.key);
      } else {
        if (defaultRange.startDate === null && defaultRange.endDate === null) {
          setActivePreset('noFilter');
        } else {
          setActivePreset('custom');
        }
      }

      setCustomStartDate(defaultRange.startDate);
      setCustomEndDate(defaultRange.endDate);
    }
  }, [defaultRange?.startDate, defaultRange?.endDate, defaultRange?.label]);

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
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect();
      const dropdownWidth = 750; // Approximate width of dropdown
      const windowWidth = window.innerWidth;

      // Check if there's enough space on the right
      const spaceOnRight = windowWidth - buttonRect.right;
      const spaceOnLeft = buttonRect.left;

      if (spaceOnRight < dropdownWidth && spaceOnLeft > spaceOnRight) {
        setDropdownPosition('right');
      } else {
        setDropdownPosition('left');
      }
    }
  }, [isOpen]);



  const presetsToDisplay = showPresets 
    ? showPresets.map(k => allPresets.find(p => p.key === k)).filter(Boolean) as typeof allPresets
    : allPresets;

  const getPresetRange = (key: string): DateRange | null => {
    const today = new Date();
    const startOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const endOfDay = (date: Date) => {
      const d = new Date(date);
      d.setHours(23, 59, 59, 999);
      return d;
    };

    switch (key) {
      case 'noFilter':
        return { startDate: null, endDate: null, label: 'No Date Filter' };
      case 'today':
        return { startDate: startOfDay(today), endDate: endOfDay(today), label: 'Today' };
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { startDate: startOfDay(tomorrow), endDate: endOfDay(tomorrow), label: 'Tomorrow' };
      }
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { startDate: startOfDay(yesterday), endDate: endOfDay(yesterday), label: 'Yesterday' };
      }
      case 'next7days': {
        const end = new Date(today);
        end.setDate(end.getDate() + 6);
        return { startDate: startOfDay(today), endDate: endOfDay(end), label: 'Next 7 Days' };
      }
      case 'last7days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 6);
        return { startDate: startOfDay(start), endDate: endOfDay(today), label: 'Last 7 Days' };
      }
      case 'last30days': {
        const start = new Date(today);
        start.setDate(start.getDate() - 29);
        return { startDate: startOfDay(start), endDate: endOfDay(today), label: 'Last 30 Days' };
      }
      case 'thisMonth': {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return { startDate: startOfDay(start), endDate: endOfDay(end), label: 'This Month' };
      }
      case 'nextMonth': {
        const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 2, 0);
        return { startDate: startOfDay(start), endDate: endOfDay(end), label: 'Next Month' };
      }
      case 'lastMonth': {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        end.setHours(23, 59, 59, 999);
        return { startDate: startOfDay(start), endDate: end, label: 'Last Month' };
      }
      case 'thisYear': {
        const start = new Date(today.getFullYear(), 0, 1);
        return { startDate: startOfDay(start), endDate: endOfDay(today), label: 'This Year' };
      }
      case 'nextYear': {
        const start = new Date(today.getFullYear() + 1, 0, 1);
        const end = new Date(today.getFullYear() + 1, 11, 31);
        return { startDate: startOfDay(start), endDate: endOfDay(end), label: 'Next Year' };
      }
      case 'lastYear': {
        const start = new Date(today.getFullYear() - 1, 0, 1);
        const end = new Date(today.getFullYear() - 1, 11, 31);
        return { startDate: startOfDay(start), endDate: endOfDay(end), label: 'Last Year' };
      }
      default:
        return null;
    }
  };

  const handlePresetClick = (key: string) => {
    if (key === 'custom') {
      setActivePreset('custom');
      setCustomStartDate(null);
      setCustomEndDate(null);
      // If presetsOnly is true, open immediately without showing preset list
      if (presetsOnly) {
        // Already in custom mode, will show custom picker
      }
      return;
    }

    if (key === 'noFilter') {
      setActivePreset('noFilter');
      setCustomStartDate(null);
      setCustomEndDate(null);
      setSelectedRange({ startDate: null, endDate: null, label: 'No Date Filter' });
      setIsOpen(false);
      if (onRangeChange) {
        onRangeChange({ startDate: null, endDate: null, label: 'No Date Filter' });
      }
      return;
    }

    const range = getPresetRange(key);
    if (range) {
      setActivePreset(key);
      setCustomStartDate(null);
      setCustomEndDate(null);

      // Auto apply for non-custom ranges
      setSelectedRange(range);
      setIsOpen(false);
      if (onRangeChange) {
        onRangeChange(range);
      }
    }
  };

  const formatDisplayDate = (range: DateRange): string => {
    if (!range.startDate || !range.endDate) {
      return 'Select Dates';
    }

    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0');
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      return `${day} ${month}, ${year}`;
    };

    if (range.label && range.label !== 'Custom Range') {
      return range.label;
    }

    return `${formatDate(range.startDate)} - ${formatDate(range.endDate)}`;
  };

  const formatDateDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const isDateInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
    if (!start || !end) return false;
    const dateTime = date.getTime();
    return dateTime >= start.getTime() && dateTime <= end.getTime();
  };

  const renderCalendar = (monthOffset: number = 0) => {
    const displayMonth = new Date(currentMonth);
    displayMonth.setMonth(displayMonth.getMonth() + monthOffset);

    const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(displayMonth);
    const days = [];

    // Previous month's trailing days
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8" />);
    }

    // Current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toDateString();

      const isStartDate = customStartDate && dateStr === customStartDate.toDateString();
      const isEndDate = customEndDate && dateStr === customEndDate.toDateString();
      const isInSelectedRange = customStartDate && customEndDate && isDateInRange(date, customStartDate, customEndDate);

      // For hover preview
      const isInHoverRange = customStartDate && !customEndDate && hoverDate &&
        date >= customStartDate && date <= hoverDate;

      const isToday = dateStr === new Date().toDateString();

      let cellClasses = 'h-8 w-8 text-sm transition-colors relative ';

      if (isStartDate || isEndDate) {
        cellClasses += 'bg-green-600 text-white font-semibold rounded';
      } else if (isInSelectedRange) {
        cellClasses += 'bg-green-100 text-green-900';
      } else if (isInHoverRange) {
        cellClasses += 'bg-green-50 text-green-700 border-2 border-dashed border-green-400 rounded';
      } else if (isToday) {
        cellClasses += 'font-semibold text-green-600 hover:bg-gray-100 rounded';
      } else {
        cellClasses += 'hover:bg-gray-100 rounded';
      }

      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(date)}
          onMouseEnter={() => setHoverDate(date)}
          onMouseLeave={() => setHoverDate(null)}
          className={`cursor-pointer ${cellClasses}`}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="flex-1 min-w-60 sm:min-w-65">
        <div className="flex items-center justify-between mb-3 px-2">
          {monthOffset === 0 && (
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {monthOffset === 1 && <div className="w-6" />}
          <div className="font-semibold text-sm">
            {displayMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          {monthOffset === 0 && <div className="w-6" />}
          {monthOffset === 1 && (
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="p-1 hover:bg-gray-100 rounded cursor-pointer"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
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

  const handleDateClick = (date: Date) => {
    if (!customStartDate || (customStartDate && customEndDate)) {
      setCustomStartDate(date);
      setCustomEndDate(null);
      setDateRangeError('');
    } else if (date >= customStartDate) {
      // Check if range exceeds max days
      if (maxDayRange) {
        // Calculate days difference correctly (inclusive of both start and end dates)
        const daysDiff = Math.floor((date.getTime() - customStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > maxDayRange) {
          setDateRangeError(`Date selection limit is ${maxDayRange} days only`);
          return;
        }
      }
      setCustomEndDate(date);
      setDateRangeError('');
    } else {
      // Check if range exceeds max days
      if (maxDayRange) {
        // Calculate days difference correctly (inclusive of both start and end dates)
        const daysDiff = Math.floor((customStartDate.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        if (daysDiff > maxDayRange) {
          setDateRangeError(`Date selection limit is ${maxDayRange} days only`);
          return;
        }
      }
      setCustomEndDate(customStartDate);
      setCustomStartDate(date);
      setDateRangeError('');
    }
  };

  const handleYearChange = (year: number) => {
    const newMonth = new Date(currentMonth);
    newMonth.setFullYear(year);
    setCurrentMonth(newMonth);
  };

  const handleApply = () => {
    let finalRange: DateRange;

    if (activePreset === 'custom') {
      if (customStartDate && customEndDate) {
        finalRange = {
          startDate: customStartDate,
          endDate: customEndDate,
          label: 'Custom Range'
        };
      } else {
        return;
      }
    } else {
      const range = getPresetRange(activePreset);
      if (!range) return;
      finalRange = range;
    }

    setSelectedRange(finalRange);
    setIsOpen(false);
    if (onRangeChange) {
      onRangeChange(finalRange);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setActivePreset('');
    setCustomStartDate(null);
    setCustomEndDate(null);
    setHoverDate(null);
  };

  const years = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 10 + i);

  const positionClasses = dropdownPosition === 'right'
    ? 'left-1/2 -translate-x-1/2 right-auto sm:right-0 sm:left-auto sm:translate-x-0'
    : 'left-1/2 -translate-x-1/2 right-auto sm:left-0 sm:right-auto sm:translate-x-0';

  // If presetsOnly is true, always open in custom mode
  React.useEffect(() => {
    if (presetsOnly && isOpen && activePreset !== 'custom') {
      setActivePreset('custom');
    }
  }, [presetsOnly, isOpen, activePreset]);

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={() => {
          if (presetsOnly && !isOpen) {
            setIsOpen(true);
            setActivePreset('custom');
          } else {
            setIsOpen(!isOpen);
          }
        }}
        className="w-full flex items-center justify-center sm:justify-start gap-1.5 px-2 py-1 border border-gray-300 rounded-md bg-white hover:bg-gray-50 transition-colors shadow-sm text-xs sm:text-sm cursor-pointer"
      >
        <Calendar className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        <span className="font-medium truncate max-w-25 sm:max-w-none">
          {formatDisplayDate(selectedRange)}
        </span>
      </button>

      {isOpen && activePreset === 'custom' && (
        <div className={`absolute top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-w-[92vw] sm:max-w-none ${positionClasses}`} onClick={(e) => e.stopPropagation()}>
          <div className="p-3 sm:p-4 w-70 sm:w-auto sm:min-w-150">
            {/* Year selector horizontally positioned between calendars */}
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="flex items-center gap-2 relative" ref={yearDropdownRef}>
                <label className="text-xs font-medium text-gray-600">Year:</label>
                <button
                  onClick={() => setIsYearDropdownOpen(!isYearDropdownOpen)}
                  className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors cursor-pointer flex items-center gap-2 min-w-20"
                >
                  {currentMonth.getFullYear()}
                  <ChevronLeft className={`w-4 h-4 transition-transform ${isYearDropdownOpen ? 'rotate-90' : '-rotate-90'}`} />
                </button>

                {isYearDropdownOpen && (
                  <div className="absolute top-full mt-1 left-0 bg-white border border-gray-300 rounded-md shadow-lg z-50 max-h-48 w-20 overflow-y-auto ">
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
            </div>

            {/* Calendars side by side horizontally or stacked vertically */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 mb-4">
              {renderCalendar(0)}
              {renderCalendar(1)}
            </div>

            {/* Date display at bottom */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 border-t border-gray-200 pt-3 sm:pt-4 mt-3 sm:mt-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Start Date</div>
                <div className="font-semibold text-sm">
                  {customStartDate ? (() => {
                    const day = String(customStartDate.getDate()).padStart(2, '0');
                    const month = customStartDate.toLocaleDateString('en-US', { month: 'short' });
                    const year = customStartDate.getFullYear();
                    return `${day} ${month}, ${year}`;
                  })() : '-'}
                </div>
              </div>
              <div className="text-gray-400">-</div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">End Date</div>
                <div className="font-semibold text-sm">
                  {customEndDate ? (() => {
                    const day = String(customEndDate.getDate()).padStart(2, '0');
                    const month = customEndDate.toLocaleDateString('en-US', { month: 'short' });
                    const year = customEndDate.getFullYear();
                    return `${day} ${month}, ${year}`;
                  })() : '-'}
                </div>
              </div>
            </div>

            {/* Action buttons - Only show for custom range */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-200">
              {dateRangeError && (
                <div className="text-red-600 text-sm font-medium mr-auto">
                  {dateRangeError}
                </div>
              )}
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={!customStartDate || !customEndDate || !!dateRangeError}
                className={`px-4 py-2 text-sm font-medium text-white rounded transition-colors cursor-pointer ${!customStartDate || !customEndDate || dateRangeError
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {isOpen && activePreset !== 'custom' && !presetsOnly && (
        <div className={`absolute top-full mt-2 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 ${positionClasses}`}>
          <div className="w-44 p-2">
            {presetsToDisplay.map(preset => {
              // Hide presets based on hidePresets array
              if (hidePresets.includes(preset.key)) {
                return null;
              }
              return (
                <button
                  key={preset.key}
                  onClick={() => handlePresetClick(preset.key)}
                  className={`w-full text-left px-3 py-2 text-sm rounded transition-colors cursor-pointer ${activePreset === preset.key
                    ? 'bg-green-50 text-green-700 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDateRangePicker
