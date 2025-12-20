

"use client";

import { useState, useEffect, useMemo, useRef, Fragment, memo } from 'react';
import { events, GameEvent } from '@/lib/events';
import { getGameTime, toLocalTime, formatDuration, getGameDate, DAILY_RESET_HOUR_UTC, getWeekPeriod } from '@/lib/time';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Star, Swords, Crown, Gamepad2, Users, Footprints, ShieldAlert, HeartHandshake, ShieldCheck, KeySquare, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { TimeDisplayMode, TimeFormat } from '@/app/page';
import { format } from 'date-fns';

const checkDateInRange = (event: GameEvent, date: Date) => {
    // Check availability for permanent events
    if (event.availability) {
        const { added, removed } = event.availability;
        if (added) {
            const addedDate = new Date(added + 'T00:00:00Z');
            addedDate.setUTCHours(0, 0, 0, 0);
            if (date < addedDate) return false;
        }
        if (removed) {
            const removedDate = new Date(removed + 'T00:00:00Z');
            removedDate.setUTCHours(23, 59, 59, 999);
            if (date > removedDate) return false;
        }
        return true; // Permanent event is available if it passes added/removed checks
    }

    // Check dateRange/dateRanges for time-limited events
    const checkSingleRange = (range: { start: string; end: string }) => {
        const startDate = new Date(range.start + 'T00:00:00Z');
        startDate.setUTCHours(0,0,0,0);
        
        if (date < startDate) return false;

        const endDate = new Date(range.end + 'T00:00:00Z');
        endDate.setUTCHours(23,59,59,999);
        return date <= endDate;
    }

    if (event.dateRanges) {
        return event.dateRanges.some(range => checkSingleRange(range));
    }
    if (event.dateRange) {
        return checkSingleRange(event.dateRange);
    }
    return true; // No date range or availability specified - assume always available
}


const getDayOccurrences = (event: GameEvent, gameDay: Date): {start: Date, end?: Date}[] => {
    const { schedule } = event;
    const occurrences: {start: Date, end?: Date}[] = [];
    
    // We do all calculations in game time first
    const gameDayStart = new Date(gameDay);
    gameDayStart.setUTCHours(5, 0, 0, 0);

    const gameDayEnd = new Date(gameDayStart);
    gameDayEnd.setUTCDate(gameDayEnd.getUTCDate() + 1);

    if (!checkDateInRange(event, gameDay)) return [];

    if (event.biWeeklyRotation) {
      const period = getWeekPeriod(gameDay);
      if (period !== event.biWeeklyRotation) {
        return [];
      }
    }

    // Check occurrences for the current calendar day and the next one, then filter by game day range
    for (let dayOffset = -1; dayOffset <= 1; dayOffset++) {
        const currentCalendarDate = new Date(gameDay);
        currentCalendarDate.setUTCDate(currentCalendarDate.getUTCDate() + dayOffset);
        
        switch (schedule.type) {
            case 'hourly':
                for (let i = 0; i < 24; i++) {
                    const start = new Date(currentCalendarDate);
                    start.setUTCHours(i, schedule.minute);
                    const end = event.durationMinutes ? new Date(start.getTime() + event.durationMinutes * 60 * 1000) : undefined;
                    occurrences.push({ start, end });
                }
                break;
            case 'multi-hourly':
                for (let i = 0; i < 24; i += schedule.hours) {
                    const start = new Date(currentCalendarDate);
                    start.setUTCHours(i + (schedule.offsetHours || 0), schedule.minute);
                    const end = event.durationMinutes ? new Date(start.getTime() + event.durationMinutes * 60 * 1000) : undefined;
                    occurrences.push({ start, end });
                }
                break;
            case 'daily-specific':
                if (schedule.days.includes(currentCalendarDate.getUTCDay())) {
                    schedule.times.forEach(time => {
                        const start = new Date(currentCalendarDate);
                        start.setUTCHours(time.hour, time.minute);
                        const end = event.durationMinutes ? new Date(start.getTime() + event.durationMinutes * 60 * 1000) : undefined;
                        occurrences.push({ start, end });
                    });
                }
                break;
            case 'daily-intervals':
                 schedule.intervals.forEach(interval => {
                    const start = new Date(currentCalendarDate);
                    start.setUTCHours(interval.start.hour, interval.start.minute);
                    
                    const end = new Date(currentCalendarDate);
                    end.setUTCHours(interval.end.hour, interval.end.minute);
                    
                    if (end < start) { // interval crosses midnight
                         end.setUTCDate(end.getUTCDate() + 1);
                    }
                    occurrences.push({ start, end });
                });
                break;
            case 'daily-intervals-specific':
                if (schedule.days.includes(currentCalendarDate.getUTCDay())) {
                    schedule.intervals.forEach(interval => {
                        const start = new Date(currentCalendarDate);
                        start.setUTCHours(interval.start.hour, interval.start.minute);
                        
                        const end = new Date(currentCalendarDate);
                        end.setUTCHours(interval.end.hour, interval.end.minute);
                        
                        if (end < start) { // interval crosses midnight
                            end.setUTCDate(end.getUTCDate() + 1);
                        }
                        occurrences.push({ start, end });
                    });
                }
                break;
            case 'none':
                break;
        }
    }
    
    // Filter occurrences to be within the game day window (5am to 5am)
    const uniqueOccurrences = occurrences.filter((occ, index, self) => 
        occ.start >= gameDayStart && occ.start < gameDayEnd &&
        index === self.findIndex(o => o.start.getTime() === occ.start.getTime())
    );

    return uniqueOccurrences;
}

const PIXELS_PER_MINUTE = 2;
const PIXELS_PER_HOUR = PIXELS_PER_MINUTE * 60;
const TOTAL_WIDTH = PIXELS_PER_HOUR * 24;

const minutesToPixels = (minutes: number) => minutes * PIXELS_PER_MINUTE;


const CategoryIcons: Record<GameEvent['category'], React.ElementType> = {
    'Boss': Swords,
    'World Boss Crusade': Crown,
    'Event': Star,
    'Social': HeartHandshake,
    'Mini-game': Gamepad2,
    'Patrol': Footprints,
    'Guild': Users,
    'Buff': ShieldCheck,
    'Dungeon Unlock': KeySquare,
    'Raid Unlock': ShieldAlert,
    'Roguelike': Star,
};

const CategoryColors: Record<GameEvent['category'], string> = {
    'Boss': 'border-destructive bg-destructive/20 text-destructive-foreground',
    'World Boss Crusade': 'border-amber-400 bg-amber-400/20 text-amber-500',
    'Event': 'border-purple-400 bg-purple-400/20 text-purple-500',
    'Social': 'border-sky-400 bg-sky-400/20 text-sky-500',
    'Mini-game': 'border-lime-400 bg-lime-400/20 text-lime-500',
    'Patrol': 'border-neutral-400 bg-neutral-400/20 text-neutral-400',
    'Guild': 'border-purple-400 bg-purple-400/20 text-purple-500',
    'Buff': 'border-emerald-400 bg-emerald-400/20 text-emerald-500',
    'Dungeon Unlock': 'border-cyan-400 bg-cyan-400/20 text-cyan-500',
    'Raid Unlock': 'border-teal-400 bg-teal-400/20 text-teal-500',
    'Roguelike': 'border-yellow-400 bg-yellow-400/20 text-yellow-500',
};


const DynamicStatus = ({ isToday, occurrenceStart, effectiveEndDate, hasDuration }: { isToday: boolean, occurrenceStart: Date, effectiveEndDate: Date, hasDuration: boolean }) => {
    const [status, setStatus] = useState('');

    useEffect(() => {
        if (!isToday) {
            setStatus('');
            return;
        };

        const updateStatus = () => {
            const realNow = new Date();
            const start = toLocalTime(occurrenceStart);
            const end = toLocalTime(effectiveEndDate);

            if (hasDuration) {
                // Events with duration (start and end times)
                if (realNow >= start && realNow < end) { // Active
                    const remaining = end.getTime() - realNow.getTime();
                    setStatus(`Active (${formatDuration(remaining)} left)`);
                } else if (realNow > end) { // Past
                    const since = realNow.getTime() - end.getTime();
                    setStatus(`Ended ${formatDuration(since)} ago`);
                } else { // Future
                    const until = start.getTime() - realNow.getTime();
                    setStatus(`Starts in ${formatDuration(until)}`);
                }
            } else {
                // Instant events (like boarlets) - no duration
                if (realNow >= start) { // Happened
                    const since = realNow.getTime() - start.getTime();
                    setStatus(`Happened ${formatDuration(since)} ago`);
                } else { // Future
                    const until = start.getTime() - realNow.getTime();
                    setStatus(`Happens in ${formatDuration(until)}`);
                }
            }
        };

        updateStatus();
        const timerId = setInterval(updateStatus, 1000);
        return () => clearInterval(timerId);
    }, [isToday, occurrenceStart, effectiveEndDate, hasDuration]);

    // Reserve space to prevent layout shifts - always render with min-height
    return (
        <p className="text-sm font-semibold min-h-[1.25rem]">
            {isToday && status ? status : '\u00A0'}
        </p>
    );
}


const TimelineEvent = ({ event, occurrence, timeMode, timeFormat, isToday, gameDayStart }: { event: GameEvent, occurrence: {start: Date, end?: Date}, timeMode: TimeDisplayMode, timeFormat: TimeFormat, isToday: boolean, gameDayStart: Date }) => {
    
    const localOccurrence = useMemo(() => ({
        start: toLocalTime(occurrence.start),
        end: occurrence.end ? toLocalTime(occurrence.end) : undefined
    }), [occurrence]);

    const displayOccurrence = timeMode === 'local' ? localOccurrence : occurrence;
    
    const startMinutesSinceGameDayStart = (occurrence.start.getTime() - gameDayStart.getTime()) / (1000 * 60);

    const left = minutesToPixels(startMinutesSinceGameDayStart);
    
    let width = 0;
    
    if (occurrence.end) {
        let durationMinutes = (occurrence.end.getTime() - occurrence.start.getTime()) / (1000 * 60);
        width = minutesToPixels(durationMinutes);
    } else if (event.durationMinutes) {
        width = minutesToPixels(event.durationMinutes);
    }

    const Icon = CategoryIcons[event.category] || Star;
    const timeZone = timeMode === 'game' ? 'UTC' : undefined;

    const effectiveEndDate = useMemo(() => {
        if (occurrence.end) return occurrence.end;
        if (event.durationMinutes) return new Date(occurrence.start.getTime() + event.durationMinutes * 60 * 1000);
        return occurrence.start;
    }, [occurrence, event.durationMinutes]);
    
    const displayEffectiveEndDate = timeMode === 'local' ? toLocalTime(effectiveEndDate) : effectiveEndDate;
    
    const [isPast, setIsPast] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [tooltipOpen, setTooltipOpen] = useState(false);
    
    useEffect(() => {
        if (!isToday) {
            setIsPast(new Date() > toLocalTime(effectiveEndDate));
            setIsActive(false);
            return;
        }

        const checkStatus = () => {
            const realNow = new Date();
            const start = toLocalTime(occurrence.start);
            const end = toLocalTime(effectiveEndDate);
            setIsActive(realNow >= start && realNow < end);
            setIsPast(realNow > end);
        };

        checkStatus();
        const timerId = setInterval(checkStatus, 10000); // Only check every 10s is fine
        return () => clearInterval(timerId);

    }, [isToday, occurrence.start, effectiveEndDate]);


    const timeOptions: Intl.DateTimeFormatOptions = {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: timeFormat === '12h'
    };

    const barStyle = {
        left: `${left}px`, 
        width: `${width}px`,
    };

    const dateFormat = 'MMM d, yyyy';
    
    let colorClass = CategoryColors[event.category] || 'bg-secondary';
    let lineColor = 'bg-destructive';

    if (event.name === 'Lovely Boarlet') {
        colorClass = 'border-pink-400 bg-pink-400/20 text-pink-300';
        lineColor = 'bg-pink-400';
    } else if (event.name === 'Breezy Boarlet') {
        colorClass = 'border-green-400 bg-green-400/20 text-green-300';
        lineColor = 'bg-green-400';
    }

    // Memoize static parts to prevent tooltip from closing on status updates
    const staticTooltipContent = useMemo(() => (
        <>
            <p className="font-bold">{event.name}</p>
            <p className="text-sm text-muted-foreground">
                {displayOccurrence.start.toLocaleTimeString([], timeOptions)}
                {displayOccurrence.end && ` - ${displayOccurrence.end.toLocaleTimeString([], timeOptions)}`}
                {timeMode === 'game' && ' (UTC-2)'}
            </p>
            {event.durationMinutes && <p className="text-xs">Duration: {event.durationMinutes}m</p>}
            <p className="text-xs italic text-muted-foreground max-w-xs">{event.description}</p>
            {event.dateRange && (
                <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                    <p>Runs from {format(event.dateRange.start, dateFormat)} until {format(event.dateRange.end, dateFormat)}</p>
                </div>
            )}
            {event.availability && (
                <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                    {event.availability.added && !event.availability.removed && (
                        <p>Added to game on {format(event.availability.added, dateFormat)}</p>
                    )}
                    {event.availability.added && event.availability.removed && (
                        <p>Available from {format(event.availability.added, dateFormat)} until {format(event.availability.removed, dateFormat)}</p>
                    )}
                    {!event.availability.added && event.availability.removed && (
                        <p>Removed from game on {format(event.availability.removed, dateFormat)}</p>
                    )}
                </div>
            )}
        </>
    ), [event.name, displayOccurrence.start, displayOccurrence.end, timeMode, event.durationMinutes, event.description, event.dateRange, event.availability, timeOptions, dateFormat]);

    // Check if event has duration (not an instant event like boarlets)
    const hasDuration = width > 0 || (occurrence.end !== undefined) || (event.durationMinutes !== undefined);
    
    // Render tooltip content directly - DynamicStatus will update internally without causing tooltip to close
    const TooltipContentComponent = () => (
        <TooltipContent className="min-w-[200px]">
            {staticTooltipContent}
            <DynamicStatus isToday={isToday} occurrenceStart={occurrence.start} effectiveEndDate={effectiveEndDate} hasDuration={hasDuration} />
        </TooltipContent>
    );

    if (width === 0) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className="absolute flex flex-col items-center -top-6 h-12"
                        style={{ left: `${left}px`, transform: 'translateX(-50%)' }}
                    >
                        <div className={cn("text-xs font-bold whitespace-nowrap px-2 py-0.5 rounded-full border", colorClass, isPast ? 'opacity-50' : '')}>
                          {event.name}
                        </div>
                        <div className={cn("w-0.5 grow", isPast ? "bg-muted" : lineColor)} />
                    </div>
                </TooltipTrigger>
                <TooltipContentComponent />
            </Tooltip>
        );
    }
    
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div
                    className={cn(
                        "absolute rounded-md px-2 py-1 flex items-center gap-2 text-xs font-semibold z-10 h-8 border transition-all duration-200", 
                        colorClass,
                        isPast && "opacity-50 bg-card/50",
                        isActive && "ring-2 ring-white shadow-lg shadow-white/20"
                    )}
                    style={barStyle}
                >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{event.name}</span>
                </div>
            </TooltipTrigger>
            <TooltipContentComponent />
        </Tooltip>
    );
};


export default function DailyTimeline({ timeMode, timeFormat }: { timeMode: TimeDisplayMode, timeFormat: TimeFormat }) {
    const [selectedGameDate, setSelectedGameDate] = useState(() => getGameDate(new Date()));
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const hasScrolledRef = useRef(false);
    const [now, setNow] = useState<Date | null>(null);
    
     useEffect(() => {
        setNow(new Date());
        const timerId = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    const gameDayStart = useMemo(() => {
        const start = new Date(selectedGameDate);
        start.setUTCHours(5, 0, 0, 0); 
        return start;
    }, [selectedGameDate]);
    
    const localDayStart = useMemo(() => toLocalTime(gameDayStart), [gameDayStart]);

    const displayDate = timeMode === 'game' ? selectedGameDate : localDayStart;
    
    const isToday = useMemo(() => {
        const todayGameDate = getGameDate(new Date());
        return selectedGameDate.getUTCFullYear() === todayGameDate.getUTCFullYear() &&
               selectedGameDate.getUTCMonth() === todayGameDate.getUTCMonth() &&
               selectedGameDate.getUTCDate() === todayGameDate.getUTCDate();
    }, [selectedGameDate]);
    
    const currentTimePosition = useMemo(() => {
        if (!isToday || !now) return -1;
        const gameNow = getGameTime(now);
        
        let minutesSinceGameDayStart = (gameNow.getTime() - gameDayStart.getTime()) / (1000 * 60);
        if (minutesSinceGameDayStart < 0 || minutesSinceGameDayStart > 24 * 60) {
            return -1;
        }
        
        return minutesToPixels(minutesSinceGameDayStart);
    }, [isToday, gameDayStart, now]);

    
    useEffect(() => {
        if (isToday && timelineContainerRef.current && !hasScrolledRef.current && currentTimePosition > 0) {
            const scrollPosition = currentTimePosition - timelineContainerRef.current.offsetWidth / 2;
            timelineContainerRef.current.scrollTo({ left: scrollPosition, behavior: 'smooth' });
            hasScrolledRef.current = true;
        }
    }, [currentTimePosition, isToday]);
    
    const { boarletEvents, otherEvents } = useMemo(() => {
        const allEvents = events
            .filter(event => event.schedule.type !== 'none')
            .map(event => ({
                event,
                occurrences: getDayOccurrences(event, selectedGameDate)
            }))
            .filter(item => item.occurrences.length > 0);

        const boarlets = allEvents.filter(({ event }) => event.name.includes('Boarlet'));
        const others = allEvents
            .filter(({ event }) => !event.name.includes('Boarlet'))
            .sort((a, b) => {
                const categoryOrder: GameEvent['category'][] = ['World Boss Crusade', 'Dungeon Unlock', 'Raid Unlock', 'Event', 'Guild', 'Patrol', 'Social', 'Mini-game', 'Buff', 'Roguelike'];
                const indexA = categoryOrder.indexOf(a.event.category);
                const indexB = categoryOrder.indexOf(b.event.category);
                if (indexA !== indexB) {
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                }
                return a.event.name.localeCompare(b.event.name);
            });
        
        return { boarletEvents: boarlets, otherEvents: others };
    }, [selectedGameDate]);

    const changeDay = (amount: number) => {
        hasScrolledRef.current = false; // Allow scrolling on day change
        setSelectedGameDate(prev => {
            const newDate = new Date(prev);
            newDate.setUTCDate(newDate.getUTCDate() + amount);
            return getGameDate(newDate);
        });
    };
    
    const timeMarkers = useMemo(() => {
        const markers = [];
        const timeZone = timeMode === 'game' ? 'UTC' : undefined;
        
        const hourFormat: Intl.DateTimeFormatOptions = { hour: 'numeric', hour12: timeFormat === '12h', timeZone };
        const minuteFormat: Intl.DateTimeFormatOptions = { minute: '2-digit', timeZone };

        // Start from 5 AM game time
        const baseTime = new Date(gameDayStart);

        for (let i = 0; i < 96; i++) { // 96 intervals of 15 minutes in 24 hours
            const intervalType = i % 4; // 0 for hour, 1 for :15, 2 for :30, 3 for :45
            const currentTime = new Date(baseTime.getTime() + i * 15 * 60 * 1000);
            
            let displayTime = currentTime;
            if (timeMode === 'local') {
                displayTime = toLocalTime(currentTime);
            }

            let label = '';
            let height = 'h-1';
            let labelClass = 'text-[9px]';

            if (intervalType === 0) { // Hour
                label = displayTime.toLocaleTimeString([], hourFormat);
                height = 'h-3';
                labelClass = 'text-xs';
            } else if (intervalType === 2) { // Half-hour
                label = `:${displayTime.toLocaleTimeString([], minuteFormat)}`;
                height = 'h-2';
                labelClass = 'text-[10px]';
            } else { // 15 and 45 minute marks
                label = `:${displayTime.toLocaleTimeString([], minuteFormat)}`;
            }

            markers.push({
                intervalType,
                label,
                height,
                labelClass,
                left: i * 15 * PIXELS_PER_MINUTE,
            });
        }
        return markers;
    }, [timeMode, timeFormat, gameDayStart]);

    const legendItems = useMemo(() => {
        const items = new Map<string, { icon: React.ElementType, color: string }>();
        const categoryOrder: GameEvent['category'][] = ['World Boss Crusade', 'Dungeon Unlock', 'Raid Unlock', 'Event', 'Guild', 'Patrol', 'Social', 'Mini-game', 'Buff', 'Roguelike'];
        
        for (const category of categoryOrder) {
            if (CategoryIcons[category] && CategoryColors[category]) {
                items.set(category, {
                    icon: CategoryIcons[category],
                    color: CategoryColors[category],
                });
            }
        }
        
        return Array.from(items.entries());
    }, []);


    return (
        <TooltipProvider delayDuration={100} skipDelayDuration={0}>
            <Card className="p-4 space-y-4 w-full">
                 <div className="flex justify-between items-center">
                    <Button variant="outline" size="icon" onClick={() => changeDay(-1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <h3 className="text-lg font-semibold text-center">
                        Game Day: {displayDate.toLocaleDateString(timeMode === 'game' ? 'en-CA' : undefined, { 
                            weekday: 'long',
                            timeZone: timeMode === 'game' ? 'UTC' : undefined,
                            year: 'numeric', month: 'long', day: 'numeric' 
                        })} ({timeMode === 'game' ? 'Game Time' : 'Your Time'})
                    </h3>
                    <Button variant="outline" size="icon" onClick={() => changeDay(1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>

                <div ref={timelineContainerRef} className="w-full overflow-x-auto pb-4 relative">
                    <div className="flex sticky top-0 bg-card z-30 pt-8">
                        <div className="relative flex-1" style={{ minWidth: `${TOTAL_WIDTH}px` }}>
                            {timeMarkers.map(({intervalType, label, left, height, labelClass}, index) => (
                                <div
                                    key={index}
                                    className="absolute top-0 -translate-x-1/2 h-full"
                                    style={{ left: `${left}px` }}
                                >
                                    <div className={cn("w-0.5 bg-border", height, intervalType > 0 && "opacity-50")} />
                                     <span className={cn("absolute top-3 text-muted-foreground whitespace-nowrap", labelClass)}>
                                        {label}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="relative">
                         <div className="space-y-2 pt-20" style={{ minWidth: `${TOTAL_WIDTH}px` }}>
                            <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(24, ${PIXELS_PER_HOUR}px)`}}>
                                {Array.from({ length: 24 }).map((_, i) => (
                                    <div key={i} className="h-full border-r border-border/50" />
                                ))}
                            </div>

                            {/* Boarlets Row */}
                            {boarletEvents.length > 0 && (
                                <div className="relative h-14" style={{ zIndex: 20 }}>
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted/20 rounded-full" />
                                    {boarletEvents.map(({ event, occurrences }) => (
                                        <Fragment key={event.name}>
                                            {occurrences.map((occurrence) => (
                                                <TimelineEvent key={event.name + occurrence.start.toISOString()} event={event} occurrence={occurrence} timeMode={timeMode} timeFormat={timeFormat} isToday={isToday} gameDayStart={gameDayStart} />
                                            ))}
                                        </Fragment>
                                    ))}
                                </div>
                            )}

                            {/* Other Event Rows */}
                            {otherEvents.map(({ event, occurrences }, i) => (
                                <div key={event.name} className="relative h-14" style={{ zIndex: 10 + i}}>
                                    <div className="absolute top-1/2 -translate-y-1/2 w-full h-0.5 bg-muted/20 rounded-full" />
                                    {occurrences.map((occurrence) => (
                                        <TimelineEvent key={event.name + occurrence.start.toISOString()} event={event} occurrence={occurrence} timeMode={timeMode} timeFormat={timeFormat} isToday={isToday} gameDayStart={gameDayStart} />
                                    ))}
                                </div>
                            ))}
                        </div>

                        {isToday && currentTimePosition >= 0 && (
                            <div 
                                className="absolute top-0 h-full w-0.5 bg-accent z-40"
                                style={{ left: `${currentTimePosition}px` }}
                            >
                                <div className="absolute -top-4 -translate-x-1/2 text-xs font-bold text-accent bg-background px-1 rounded">NOW</div>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="border-t pt-4">
                    <h4 className="text-sm font-semibold mb-2">Legend</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-2">
                        {legendItems.map(([name, { icon: Icon, color }]) => (
                            <div key={name} className="flex items-center gap-2 text-xs">
                                <div className={cn("h-5 w-5 rounded-sm border flex items-center justify-center", color.replace(/bg-\w+\/\d+/, ''))}>
                                     <Icon className={cn("h-3 w-3", color.replace(/border-\w+/, '').replace(/bg-\w+\/\d+/, ''))} />
                                </div>
                                <span className="font-semibold">{name.replace(/([A-Z])/g, ' $1').trim()}</span>
                            </div>
                        ))}
                    </div>
                </div>


                 {!isToday && (
                    <Button onClick={() => {
                        hasScrolledRef.current = false;
                        setSelectedGameDate(getGameDate(new Date()));
                    }} className="w-full">
                        Jump to Today
                    </Button>
                 )}
            </Card>
        </TooltipProvider>
    );
}

    

    

    
