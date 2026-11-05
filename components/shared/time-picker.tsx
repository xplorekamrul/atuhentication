"use client";
import { Clock, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

type Period = "AM" | "PM";
type ActiveDropdown = "hour" | "minute" | null;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function to24(h: string, m: string, p: Period): string {
  let h24 = parseInt(h, 10) || 0;
  if (p === "AM" && h24 === 12) h24 = 0;
  if (p === "PM" && h24 !== 12) h24 += 12;
  return `${pad(h24)}:${pad(parseInt(m, 10) || 0)}`;
}

const HOUR_OPTIONS = Array.from({ length: 12 }, (_, i) => pad(i + 1));
const MINUTE_OPTIONS = Array.from({ length: 60 }, (_, i) => pad(i));

export function TimePicker({
  value = "",
  onChange,
  onBlur,
  placeholder = "Select Time",
  disabled = false,
  className = "",
}: TimePickerProps) {
  const [isEditing, setIsEditing] = useState(false);

  const initialParse = () => {
    if (!value) return { h: "", m: "", p: "AM" as Period };
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10);
    if (isNaN(h24)) return { h: "", m: "", p: "AM" as Period };
    const p: Period = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    return {
      h: pad(h12),
      m: pad(parseInt(mStr, 10) || 0),
      p,
    };
  };

  const init = initialParse();

  // Committed (always-valid, 2-digit) values — what the parent sees.
  const [hour, setHour] = useState(init.h);
  const [minute, setMinute] = useState(init.m);
  const [period, setPeriod] = useState<Period>(init.p);

  // Raw, in-progress typing state — allowed to be empty/partial while typing.
  const [hourDraft, setHourDraft] = useState(init.h);
  const [minuteDraft, setMinuteDraft] = useState(init.m);

  const [activeDropdown, setActiveDropdown] = useState<ActiveDropdown>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const hourInputRef = useRef<HTMLInputElement>(null);
  const minuteInputRef = useRef<HTMLInputElement>(null);
  const periodButtonRef = useRef<HTMLButtonElement>(null);

  // Always holds the newest state, so async handlers (blur, outside click)
  // never read stale values from an old render's closure.
  const latest = useRef({ hour, minute, period, hourDraft, minuteDraft, isEditing });
  latest.current = { hour, minute, period, hourDraft, minuteDraft, isEditing };

  // Sync external 24h value to internal state
  useEffect(() => {
    if (!value) {
      setHour("");
      setMinute("");
      setPeriod("AM");
      setHourDraft("");
      setMinuteDraft("");
      return;
    }
    const [hStr, mStr] = value.split(":");
    const h24 = parseInt(hStr, 10);
    if (isNaN(h24)) return;

    const p: Period = h24 >= 12 ? "PM" : "AM";
    let h12 = h24 % 12;
    if (h12 === 0) h12 = 12;
    const paddedH = pad(h12);
    const paddedM = pad(parseInt(mStr, 10) || 0);

    setHour(paddedH);
    setMinute(paddedM);
    setPeriod(p);

    // Don't stomp on drafts while the person is actively editing that field.
    if (activeDropdown !== "hour" && document.activeElement !== hourInputRef.current) {
      setHourDraft(paddedH);
    }
    if (activeDropdown !== "minute" && document.activeElement !== minuteInputRef.current) {
      setMinuteDraft(paddedM);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Clamp + pad a raw hour draft into a valid 2-digit hour (1-12).
  // Empty/garbage falls back to the last committed hour.
  const commitHourDraft = (raw: string): string => {
    let num = parseInt(raw, 10);
    let finalH: string;
    if (isNaN(num) || raw === "") {
      finalH = latest.current.hour || "12";
    } else {
      if (num < 1) num = 1;
      if (num > 12) num = 12;
      finalH = pad(num);
    }
    setHour(finalH);
    setHourDraft(finalH);
    latest.current.hour = finalH;
    return finalH;
  };

  const commitMinuteDraft = (raw: string): string => {
    let num = parseInt(raw, 10);
    let finalM: string;
    if (isNaN(num) || raw === "") {
      finalM = latest.current.minute || "00";
    } else {
      if (num < 0) num = 0;
      if (num > 59) num = 59;
      finalM = pad(num);
    }
    setMinute(finalM);
    setMinuteDraft(finalM);
    latest.current.minute = finalM;
    return finalM;
  };

  // Handle outside click to exit edit mode and commit whatever was typed
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        if (latest.current.isEditing) {
          const { hourDraft, minuteDraft, period } = latest.current;
          const finalH = commitHourDraft(hourDraft);
          const finalM = commitMinuteDraft(minuteDraft);
          setIsEditing(false);
          setActiveDropdown(null);
          onChange(to24(finalH, finalM, period));
          onBlur?.();
        }
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onChange, onBlur]);

  // Free typing: take digits only, cap at 2 chars.
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "").slice(0, 2);
    // Live-clamp once 2 digits are in, so "1" -> "10/11/12" can still be typed.
    if (val.length === 2) {
      const num = parseInt(val, 10);
      if (num > 12) val = "12";
      if (num === 0) val = "01";
    }
    setHourDraft(val);
    setActiveDropdown("hour");
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 2);
    setMinuteDraft(val);
    setActiveDropdown("minute");
  };

  const handleHourBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Focus moving to the AM/PM button: togglePeriod commits the drafts itself.
    if (e.relatedTarget && e.relatedTarget === periodButtonRef.current) return;
    const { hourDraft, minute, period } = latest.current;
    const finalH = commitHourDraft(hourDraft);
    onChange(to24(finalH, minute, period));
  };

  const handleMinuteBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (e.relatedTarget && e.relatedTarget === periodButtonRef.current) return;
    const { minuteDraft, hour, period } = latest.current;
    const finalM = commitMinuteDraft(minuteDraft);
    onChange(to24(hour, finalM, period));
  };

  const handleHourKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const { hourDraft, minute, period } = latest.current;
      const finalH = commitHourDraft(hourDraft);
      setActiveDropdown(null);
      onChange(to24(finalH, minute, period));
      minuteInputRef.current?.focus();
      minuteInputRef.current?.select();
    }
  };

  const handleMinuteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const { minuteDraft, hour, period } = latest.current;
      const finalM = commitMinuteDraft(minuteDraft);
      setActiveDropdown(null);
      onChange(to24(hour, finalM, period));
    }
  };

  const selectHourOption = (h: string) => {
    setHour(h);
    setHourDraft(h);
    latest.current.hour = h;
    setActiveDropdown(null);
    onChange(to24(h, latest.current.minute, latest.current.period));
  };

  const selectMinuteOption = (m: string) => {
    setMinute(m);
    setMinuteDraft(m);
    latest.current.minute = m;
    setActiveDropdown(null);
    onChange(to24(latest.current.hour, m, latest.current.period));
  };

  const togglePeriod = () => {
    const { hourDraft, minuteDraft, period } = latest.current;
    // Commit anything still being typed, then flip AM/PM using the latest period.
    const finalH = commitHourDraft(hourDraft);
    const finalM = commitMinuteDraft(minuteDraft);
    const nextPeriod: Period = period === "AM" ? "PM" : "AM";
    setPeriod(nextPeriod);
    latest.current.period = nextPeriod;
    setActiveDropdown(null);
    onChange(to24(finalH, finalM, nextPeriod));
  };

  // Live-filtered options: only show options that start with what's typed.
  const filteredHourOptions = hourDraft
    ? HOUR_OPTIONS.filter(
        (h) => h.startsWith(hourDraft) || h.replace(/^0/, "").startsWith(hourDraft)
      )
    : HOUR_OPTIONS;
  const hourOptionsToShow = filteredHourOptions.length ? filteredHourOptions : HOUR_OPTIONS;

  const filteredMinuteOptions = minuteDraft
    ? MINUTE_OPTIONS.filter((m) => m.startsWith(minuteDraft))
    : MINUTE_OPTIONS;
  const minuteOptionsToShow = filteredMinuteOptions.length ? filteredMinuteOptions : MINUTE_OPTIONS;

  const hasValue = Boolean(value);

  return (
    <div
      ref={containerRef}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          onBlur?.();
        }
      }}
      className={`relative w-full max-w-sm ${className}`}
    >
      <div
        onClick={() => {
          if (!disabled && !isEditing) {
            setIsEditing(true);
            setHourDraft(hour);
            setMinuteDraft(minute);
            setTimeout(() => {
              hourInputRef.current?.focus();
              hourInputRef.current?.select();
            }, 0);
          }
        }}
        className={[
          "w-full flex items-center gap-3 px-4 py-2",
          "bg-background border rounded-md transition-all duration-150 text-left cursor-pointer shadow-sm",
          isEditing
            ? "border-primary ring-2 ring-primary/25"
            : "border-border hover:border-primary/50",
          disabled ? "opacity-50 cursor-not-allowed bg-muted" : "",
        ].join(" ")}
      >
        {!isEditing && <Clock size={20} className="text-primary shrink-0" aria-hidden />}

        {!isEditing ? (
          <span
            className={`flex-1 text-[16px] font-medium tracking-wide ${
              hasValue ? "text-foreground font-semibold" : "text-muted-foreground"
            }`}
          >
            {hasValue ? `${hour} : ${minute} ${period}` : placeholder}
          </span>
        ) : (
          <div className="flex items-center gap-1.5 flex-1" onClick={(e) => e.stopPropagation()}>
            {/* Hour Input with live-filtered dropdown */}
            <div className="relative flex-1">
              <div
                onClick={() => {
                  setActiveDropdown(activeDropdown === "hour" ? null : "hour");
                  hourInputRef.current?.focus();
                }}
                className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={hourInputRef}
                  type="text"
                  inputMode="numeric"
                  value={hourDraft}
                  onChange={handleHourChange}
                  onFocus={(e) => {
                    setActiveDropdown("hour");
                    e.target.select();
                  }}
                  onBlur={handleHourBlur}
                  onKeyDown={handleHourKeyDown}
                  placeholder="HH"
                  className="w-full bg-transparent text-center text-[15px] font-semibold text-foreground outline-none p-0 cursor-text"
                />
                <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-1" />
              </div>
              {activeDropdown === "hour" && (
                <div className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-50 p-1 space-y-0.5">
                  {hourOptionsToShow.map((h) => (
                    <div
                      key={h}
                      onMouseDown={(e) => e.preventDefault()} // keep input focus so onBlur doesn't fire first
                      onClick={() => selectHourOption(h)}
                      className={`px-3 py-1 text-sm rounded-md cursor-pointer transition-colors text-center font-medium ${
                        hour === h ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {h}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-muted-foreground font-bold">:</span>

            {/* Minute Input with live-filtered dropdown */}
            <div className="relative flex-1">
              <div
                onClick={() => {
                  setActiveDropdown(activeDropdown === "minute" ? null : "minute");
                  minuteInputRef.current?.focus();
                }}
                className="flex items-center justify-between bg-muted/50 border border-border rounded-lg px-1 py-1 cursor-pointer hover:border-primary/50 transition-colors"
              >
                <input
                  ref={minuteInputRef}
                  type="text"
                  inputMode="numeric"
                  value={minuteDraft}
                  onChange={handleMinuteChange}
                  onFocus={(e) => {
                    setActiveDropdown("minute");
                    e.target.select();
                  }}
                  onBlur={handleMinuteBlur}
                  onKeyDown={handleMinuteKeyDown}
                  placeholder="MM"
                  className="w-full bg-transparent text-center text-[15px] font-semibold text-foreground outline-none p-0 cursor-text"
                />
                <ChevronDown size={14} className="text-muted-foreground shrink-0 ml-1" />
              </div>
              {activeDropdown === "minute" && (
                <div className="absolute left-0 right-0 mt-1 max-h-44 overflow-y-auto bg-background border border-border rounded-lg shadow-xl z-50 p-1 space-y-0.5">
                  {minuteOptionsToShow.map((m) => (
                    <div
                      key={m}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectMinuteOption(m)}
                      className={`px-3 py-1 text-sm rounded-md cursor-pointer transition-colors text-center font-medium ${
                        minute === m ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted"
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Period Toggle Button */}
            <button
              ref={periodButtonRef}
              type="button"
              onMouseDown={(e) => e.preventDefault()} // don't steal focus -> no blur fires
              onClick={togglePeriod}
              className="px-3 py-1 bg-muted/50 border border-border hover:border-primary/50 rounded-lg text-[15px] font-semibold text-foreground transition-colors cursor-pointer"
            >
              {period}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}