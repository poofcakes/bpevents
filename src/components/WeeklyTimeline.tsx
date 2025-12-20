

"use client";

import { useMemo, Fragment, useState, useEffect } from 'react';
import { events, GameEvent } from '@/lib/events';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from '@/lib/utils';
import { Star, Swords, Zap, Crown, Gamepad2, Footprints, Users, Gift, UtensilsCrossed, HeartHandshake, ShieldCheck, Clock, KeySquare, Trophy, ChevronLeft, ChevronRight, BrainCircuit, ShieldAlert } from 'lucide-react';
import { getGameTime, getWeekPeriod, getGameDate } from '@/lib/time';
import { format, getWeek, isSameDay, startOfDay, differenceInCalendarWeeks, addDays } from 'date-fns';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Label } from './ui/label';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GAME_LAUNCH_DATE = new Date('2025-10-09T05:00:00Z'); // Game launches at reset time on Thursday Oct 9th.
// The ISO week for Oct 9, 2025 starts on Monday, Oct 6, 2025
const GAME_LAUNCH_WEEK_START = new Date('2025-10-06T00:00:00Z');

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
    'Roguelike': BrainCircuit,
};

const CategoryColors: Record<GameEvent['category'], string> = {
    'Boss': 'bg-destructive/20 text-destructive-foreground',
    'World Boss Crusade': 'bg-amber-400/20 text-amber-500',
    'Event': 'bg-purple-400/20 text-purple-500',
    'Social': 'bg-sky-400/20 text-sky-500',
    'Mini-game': 'bg-lime-400/20 text-lime-500',
    'Patrol': 'bg-neutral-400/20 text-neutral-400',
    'Guild': 'bg-purple-400/20 text-purple-500',
    'Buff': 'bg-emerald-400/20 text-emerald-500',
    'Dungeon Unlock': 'border-cyan-400 bg-cyan-400/20 text-cyan-500',
    'Raid Unlock': 'border-teal-400 bg-teal-400/20 text-teal-500',
    'Roguelike': 'border-yellow-400 bg-yellow-400/20 text-yellow-500',
};


const isDailyEvent = (event: GameEvent) => {
    const { schedule } = event;
    if (schedule.type === 'hourly' || schedule.type === 'multi-hourly' || schedule.type === 'daily-intervals') {
        return true;
    }
    if ((schedule.type === 'daily-specific' || schedule.type === 'daily-intervals-specific') && schedule.days.length === 7) {
        return true;
    }
    return false;
}

const WeeklyEvent = ({ event }: { event: GameEvent }) => {
    const Icon = CategoryIcons[event.category] || Star;
    const colorClass = CategoryColors[event.category] || 'bg-secondary';
    const timeZone = 'UTC'; // Weekly is always game time

    let timeSummary = '';
    const schedule = event.schedule;
    const dateFormat = 'MMM d, yyyy';
    
    if (schedule.type === 'daily-specific') {
        const uniqueTimes = [...new Set(schedule.times.map(t => {
            const d = new Date();
            d.setUTCHours(t.hour, t.minute);
            return d.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
        }))];
        timeSummary = uniqueTimes.slice(0, 2).join(', ') + (uniqueTimes.length > 2 ? '...' : '');
    } else if (schedule.type === 'multi-hourly') {
        timeSummary = `Every ${schedule.hours}h`;
    } else if (schedule.type === 'hourly') {
        timeSummary = `Every hour at :${String(schedule.minute).padStart(2, '0')}`;
    } else if (schedule.type === 'daily-intervals' || schedule.type === 'daily-intervals-specific') {
         const uniqueTimes = [...new Set(schedule.intervals.map(t => {
            const d = new Date();
            d.setUTCHours(t.start.hour, t.start.minute);
            return d.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
        }))];
        timeSummary = uniqueTimes.slice(0, 2).join(', ') + (uniqueTimes.length > 2 ? '...' : '');
    }

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className={cn(
                    "rounded-md px-2 py-1 flex items-center gap-2 text-xs font-semibold cursor-default h-7", 
                    colorClass
                )}>
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate flex-1">{event.name}</span>
                    {(event.dateRange || event.dateRanges) && (
                         <Tooltip>
                            <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                                <Clock className="h-3 w-3 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Time-Limited Event</p>
                            </TooltipContent>
                        </Tooltip>
                    )}
                </div>
            </TooltipTrigger>
            <TooltipContent>
                <p className="font-bold">{event.name}</p>
                {timeSummary && <p className="text-sm text-muted-foreground">{timeSummary}</p>}
                {event.dateRange && (
                    <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                        <p>Runs from {format(new Date(event.dateRange.start + 'T00:00:00Z'), dateFormat)} until {format(new Date(event.dateRange.end + 'T00:00:00Z'), dateFormat)}</p>
                    </div>
                )}
                {event.availability && (
                    <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                        {event.availability.added && !event.availability.removed && (
                            <p>Added to game on {format(new Date(event.availability.added + 'T00:00:00Z'), dateFormat)}</p>
                        )}
                        {event.availability.added && event.availability.removed && (
                            <p>Available from {format(new Date(event.availability.added + 'T00:00:00Z'), dateFormat)} until {format(new Date(event.availability.removed + 'T00:00:00Z'), dateFormat)}</p>
                        )}
                        {!event.availability.added && event.availability.removed && (
                            <p>Removed from game on {format(new Date(event.availability.removed + 'T00:00:00Z'), dateFormat)}</p>
                        )}
                    </div>
                )}
                 {event.dateRanges && (
                    <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2 space-y-1">
                        <p>Active during these periods:</p>
                        {event.dateRanges.map((range, i) => (
                           <p key={i}>
                             {format(new Date(range.start + 'T00:00:00Z'), dateFormat)} - {format(new Date(range.end + 'T00:00:00Z'), dateFormat)}
                           </p>
                        ))}
                    </div>
                )}
                <p className="text-xs italic text-muted-foreground max-w-xs">{event.description}</p>
            </TooltipContent>
        </Tooltip>
    );
};

const WeeklyEventBar = ({ event, daySpans }: { event: GameEvent; daySpans: number[] }) => {
    const Icon = CategoryIcons[event.category] || Star;
    const colorClass = CategoryColors[event.category] || 'bg-secondary';
    const timeZone = 'UTC';

    const firstDayIndex = daySpans[0];
    const span = daySpans.length;

    const left = `${(firstDayIndex / 7) * 100}%`;
    const width = `${(span / 7) * 100}%`;

    let timeSummary = '';
    const schedule = event.schedule;
    const dateFormat = 'MMM d, yyyy';

    if (schedule.type === 'daily-intervals' || schedule.type === 'daily-intervals-specific') {
        timeSummary = schedule.intervals.map(iv => {
            const start = new Date(0);
            start.setUTCHours(iv.start.hour, iv.start.minute);
            const end = new Date(0);
            end.setUTCHours(iv.end.hour, iv.end.minute);
            const formatOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', timeZone };
            return `${start.toLocaleTimeString('en-US', formatOptions)} - ${end.toLocaleTimeString('en-US', formatOptions)}`;
        }).join(', ');
    } else if (schedule.type === 'daily-specific') {
         const uniqueTimes = [...new Set(schedule.times.map(t => {
            const d = new Date();
            d.setUTCHours(t.hour, t.minute);
            return d.toLocaleTimeString('en-US', { timeZone, hour: '2-digit', minute: '2-digit' });
        }))];
        timeSummary = uniqueTimes.join(', ');
    } else if (isDailyEvent(event)) {
        timeSummary = 'Resets daily';
    }


    return (
        <div className="px-px" style={{ paddingTop: '2px', paddingBottom: '2px'}}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn("rounded-md px-2 py-1 flex items-center gap-2 text-xs font-semibold cursor-default h-7 relative", colorClass)}
                        style={{ left, width }}
                    >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1">{event.name}</span>
                        {(event.dateRange || event.dateRanges) && (
                            <Tooltip>
                                <TooltipTrigger onClick={(e) => e.stopPropagation()}>
                                    <Clock className="h-3 w-3 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Time-Limited Event</p>
                                </TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <p className="font-bold">{event.name}</p>
                    <p className="text-sm text-muted-foreground">{timeSummary}</p>
                     {event.dateRange && (
                        <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                            <p>Runs from {format(new Date(event.dateRange.start + 'T00:00:00Z'), dateFormat)} until {format(new Date(event.dateRange.end + 'T00:00:00Z'), dateFormat)}</p>
                        </div>
                    )}
                    {event.availability && (
                        <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2">
                            {event.availability.added && !event.availability.removed && (
                                <p>Added to game on {format(new Date(event.availability.added + 'T00:00:00Z'), dateFormat)}</p>
                            )}
                            {event.availability.added && event.availability.removed && (
                                <p>Available from {format(new Date(event.availability.added + 'T00:00:00Z'), dateFormat)} until {format(new Date(event.availability.removed + 'T00:00:00Z'), dateFormat)}</p>
                            )}
                            {!event.availability.added && event.availability.removed && (
                                <p>Removed from game on {format(new Date(event.availability.removed + 'T00:00:00Z'), dateFormat)}</p>
                            )}
                        </div>
                    )}
                    {event.dateRanges && (
                        <div className="text-xs text-muted-foreground/80 mt-2 border-t pt-2 space-y-1">
                            <p>Active during these periods:</p>
                            {event.dateRanges.map((range, i) => (
                               <p key={i}>
                                 {format(new Date(range.start + 'T00:00:00Z'), dateFormat)} - {format(new Date(range.end + 'T00:00:00Z'), dateFormat)}
                               </p>
                            ))}
                        </div>
                    )}
                    <p className="text-xs italic text-muted-foreground max-w-xs">{event.description}</p>
                </TooltipContent>
            </Tooltip>
        </div>
    );
};


export default function WeeklyTimeline() {
    const [currentDate, setCurrentDate] = useState(() => new Date());
    const [hideDaily, setHideDaily] = useState(false);
    const [hidePermanent, setHidePermanent] = useState(false);
    
    // This state is just to force a re-render when the user navigates,
    // ensuring the memoized calculations run again.
    const [_, setForceUpdate] = useState(0);

    useEffect(() => {
        setCurrentDate(getGameTime(new Date()));
    }, []);

    const changeWeek = (amount: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setUTCDate(newDate.getUTCDate() + (amount * 7));
            return newDate;
        });
        setForceUpdate(val => val + 1);
    };

    const { weekDates, weekRangeFormatted, gameWeekNumber, calendarWeekNumber, todayIndex, isCurrentWeek, biWeeklyPeriod } = useMemo(() => {
        const gameNow = getGameTime(currentDate);
        const startOfWeek = new Date(gameNow);
        startOfWeek.setUTCHours(0, 0, 0, 0);
        const dayOfWeek = (startOfWeek.getUTCDay() + 6) % 7; // Monday is 0
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - dayOfWeek);
        
        const dates = Array.from({length: 7}).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setUTCDate(startOfWeek.getUTCDate() + i);
            return d;
        });

        const endOfWeek = dates[6];
        const rangeFormat = 'MMM d';
        const formatted = `${format(startOfWeek, rangeFormat)} - ${format(endOfWeek, `${rangeFormat}, yyyy`)}`;
        
        const calWeekNum = getWeek(gameNow, { weekStartsOn: 1 });

        const now = getGameTime(new Date());
        const currentDayIndex = dates.findIndex(d => isSameDay(d, getGameDate(now)));

        const _isCurrentWeek = currentDayIndex !== -1;
        
        const period = getWeekPeriod(gameNow);

        // Calculate game week number relative to the launch week
        const gameWeekNum = differenceInCalendarWeeks(startOfWeek, GAME_LAUNCH_WEEK_START, { weekStartsOn: 1 }) + 1;

        return { weekDates: dates, weekRangeFormatted: formatted, gameWeekNumber: gameWeekNum, calendarWeekNumber: calWeekNum, todayIndex: currentDayIndex, isCurrentWeek: _isCurrentWeek, biWeeklyPeriod: period };
    }, [currentDate]);
    
    const { daySpecificEventsByDay, multiDayEvents } = useMemo(() => {
        const daySpecificByDay: Record<string, GameEvent[]>[] = Array.from({ length: 7 }, () => ({}));
        const multiDayList: { event: GameEvent, daySpans: number[] }[] = [];

        const weekStart = weekDates[0];
        const weekEnd = addDays(weekDates[6], 1); 

        const checkDateInRange = (event: GameEvent, date: Date) => {
            // Check availability for permanent events
            if (event.availability) {
                const { added, removed } = event.availability;
                if (added) {
                    const addedDate = new Date(added + 'T00:00:00Z');
                    if (date < addedDate) return false;
                }
                if (removed) {
                    const removedDate = new Date(removed + 'T00:00:00Z');
                    removedDate.setUTCHours(23, 59, 59, 999);
                    if (date > removedDate) return false;
                }
                return true;
            }

            // Check dateRange/dateRanges for time-limited events
            // Note: dateRange uses calendar dates, so we compare calendar dates
            const checkSingleRange = (range: { start: string; end: string }) => {
                const startDate = new Date(range.start + 'T00:00:00Z');
                startDate.setUTCHours(0, 0, 0, 0);
                if (date < startDate) return false;
                const endDate = new Date(range.end + 'T00:00:00Z');
                endDate.setUTCHours(23, 59, 59, 999);
                return date <= endDate;
            };

            if (event.dateRanges) {
                return event.dateRanges.some(range => {
                    const startDate = new Date(range.start + 'T00:00:00Z');
                    startDate.setUTCHours(0, 0, 0, 0);
                    const endDate = new Date(range.end + 'T00:00:00Z');
                    endDate.setUTCHours(23, 59, 59, 999);
                    return date >= startDate && date <= endDate;
                });
            }
            if (event.dateRange) {
                return checkSingleRange(event.dateRange);
            }
            return true;
        };

        const filteredEvents = events.filter(event => {
            // When enabled, only show time-limited events (those with dateRange or dateRanges)
            if (hidePermanent && !event.dateRange && !event.dateRanges) {
                return false;
            }
            if (event.schedule.type === 'none' || event.category === 'Boss' ) {
                return false;
            }
            
            const isInWeek = (range: {start?: string, end?: string}) => {
                const eventStart = new Date(range.start + 'T00:00:00Z');
                const eventEnd = range.end ? addDays(new Date(range.end + 'T00:00:00Z'), 1) : null;
                if (eventEnd) {
                    return eventStart < weekEnd && eventEnd > weekStart;
                }
                return eventStart < weekEnd;
            };
            
            if (event.dateRanges) {
                if (!event.dateRanges.some(isInWeek)) return false;
            } else if (event.dateRange) {
                if (!isInWeek(event.dateRange)) return false;
            }
            
            if (event.biWeeklyRotation && event.biWeeklyRotation !== biWeeklyPeriod) {
                return false;
            }
            
            return true;
        });

        const processedMultiDayEvents = new Set<string>();

        filteredEvents.forEach(event => {
            if (processedMultiDayEvents.has(event.name)) return;

            const { schedule } = event;
            const category = event.category;

            const eventDaysInWeek = weekDates.map((date, index) => {
                // Use calendar date for date range checking (event dateRange uses calendar dates)
                const calendarDate = new Date(date);
                calendarDate.setUTCHours(0,0,0,0);
                
                // For Game Week 1, ignore events before launch day (Thursday, index 3)
                if (gameWeekNumber === 1 && index < 3) {
                    return -1;
                }

                if (!checkDateInRange(event, calendarDate)) {
                    return -1;
                }
                
                // Use game day for schedule checking
                const gameDayForDate = getGameDate(date);
                
                let occursToday = false;
                if (isDailyEvent(event)) {
                    occursToday = true;
                } else if (schedule.type === 'daily-specific' || schedule.type === 'daily-intervals-specific') {
                    const scheduleDaysInWeek = schedule.days.map(d => (d + 6) % 7);
                    if (scheduleDaysInWeek.includes(index)) {
                        occursToday = true;
                    }
                }
                
                return occursToday ? index : -1;
            }).filter(index => index !== -1);

            if (eventDaysInWeek.length === 0) return;
            
            let currentSpan: number[] = [];
            for (let i = 0; i < eventDaysInWeek.length; i++) {
                if (i === 0 || eventDaysInWeek[i] === eventDaysInWeek[i-1] + 1) {
                    currentSpan.push(eventDaysInWeek[i]);
                } else {
                    if (currentSpan.length > 1) {
                        multiDayList.push({ event, daySpans: [...currentSpan] });
                    } else if (currentSpan.length === 1) {
                        const dateIndex = currentSpan[0];
                        if (!daySpecificByDay[dateIndex][category]) daySpecificByDay[dateIndex][category] = [];
                        if (!daySpecificByDay[dateIndex][category].find(e => e.name === event.name)) {
                           daySpecificByDay[dateIndex][category].push(event);
                        }
                    }
                    currentSpan = [eventDaysInWeek[i]];
                }
            }

             if (currentSpan.length > 1) {
                multiDayList.push({ event, daySpans: [...currentSpan] });
             } else if (currentSpan.length === 1) {
                 const dateIndex = currentSpan[0];
                 if (!daySpecificByDay[dateIndex][category]) daySpecificByDay[dateIndex][category] = [];
                 if (!daySpecificByDay[dateIndex][category].find(e => e.name === event.name)) {
                    daySpecificByDay[dateIndex][category].push(event);
                 }
             }
        });
        
        const sortDayCategories = (dayCategories: Record<string, GameEvent[]>[]) => {
            const categoryOrder: GameEvent['category'][] = ['World Boss Crusade', 'Dungeon Unlock', 'Raid Unlock', 'Event', 'Guild', 'Patrol', 'Social', 'Mini-game', 'Buff', 'Roguelike'];
            
            dayCategories.forEach(day => {
                for (const category in day) {
                    day[category].sort((a,b) => a.name.localeCompare(b.name));
                }
            });

            return dayCategories.map(day => 
                Object.fromEntries(
                    Object.entries(day).sort(([a], [b]) => {
                        const indexA = categoryOrder.indexOf(a as GameEvent['category']);
                        const indexB = categoryOrder.indexOf(b as GameEvent['category']);
                        if (indexA === -1) return 1;
                        if (indexB === -1) return -1;
                        return indexA - indexB;
                    })
                )
            );
        };
        
        const categoryOrder: GameEvent['category'][] = ['World Boss Crusade', 'Dungeon Unlock', 'Raid Unlock', 'Event', 'Guild', 'Patrol', 'Social', 'Mini-game', 'Buff', 'Roguelike'];
        
        const sortedMultiDayEvents = multiDayList.sort((a, b) => {
            const lengthA = a.daySpans.length;
            const lengthB = b.daySpans.length;

            if (lengthA !== lengthB) {
                return lengthA - lengthB; // Sort by span length ascending
            }
            
            const indexA = categoryOrder.indexOf(a.event.category);
            const indexB = categoryOrder.indexOf(b.event.category);
            if (indexA !== indexB) {
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            }
            return a.event.name.localeCompare(b.event.name);
        });

        return { daySpecificEventsByDay: sortDayCategories(daySpecificByDay), multiDayEvents: sortedMultiDayEvents };

    }, [weekDates, biWeeklyPeriod, hidePermanent, gameWeekNumber]);

    const filteredMultiDayEvents = useMemo(() => {
        const sorted = multiDayEvents;
        if (!hideDaily) return sorted;
        const expectedDays = gameWeekNumber === 1 ? 4 : 7;
        return sorted.filter(e => {
            if (isDailyEvent(e.event)) {
                 // Check if it spans the entire visible week
                return e.daySpans.length < expectedDays;
            }
            return true;
        });
    }, [multiDayEvents, hideDaily, gameWeekNumber]);


    const EventColumn = ({ dayIndex, dayCategories }: { dayIndex: number; dayCategories: Record<string, GameEvent[]> }) => {
        if (gameWeekNumber === 1 && dayIndex < 3) {
            return (
                <div className="bg-card/50 p-2 rounded-b-lg space-y-2 min-h-[100px] border-t border-border/20 flex items-center justify-center">
                     <p className="text-center text-xs text-muted-foreground">Pre-Launch</p>
                </div>
            );
        }
        return (
             <div className="bg-card/50 p-2 rounded-b-lg space-y-2 min-h-[100px] border-t border-border/20">
                {Object.keys(dayCategories).length === 0 ? (
                    <div className="text-center text-sm text-muted-foreground pt-4">No special events</div>
                 ) : (
                    Object.entries(dayCategories).map(([category, categoryEvents]) => (
                    <div key={category} className="space-y-1">
                        {categoryEvents.map(event => (
                            <WeeklyEvent key={event.name} event={event} />
                        ))}
                    </div>
                )))}
            </div>
        );
    }

    return (
        <TooltipProvider delayDuration={100}>
            <Card className="w-full">
                <CardHeader>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="flex justify-between w-full md:w-auto">
                            <Button variant="outline" size="icon" onClick={() => changeWeek(-1)} disabled={gameWeekNumber <= 1}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <div className="text-center flex-1 md:px-4">
                                <CardTitle className="text-lg">
                                    {gameWeekNumber > 0 ? `Game Week ${gameWeekNumber}` : 'Pre-Launch'}
                                </CardTitle>
                                <p className="text-sm text-muted-foreground">
                                    {weekRangeFormatted}
                                </p>
                                <p className="text-xs text-muted-foreground/80">
                                    (Calendar Week {calendarWeekNumber})
                                </p>
                            </div>
                            <Button variant="outline" size="icon" onClick={() => changeWeek(1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-x-4 gap-y-2 justify-end">
                            <div className="flex items-center space-x-2">
                                <Switch id="hide-daily" checked={hideDaily} onCheckedChange={setHideDaily} />
                                <Label htmlFor="hide-daily">Hide all-week events</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="hide-permanent" checked={hidePermanent} onCheckedChange={setHidePermanent} />
                                <Label htmlFor="hide-permanent">Show only time-limited events</Label>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                    <div className="grid grid-cols-7 gap-px bg-border/20 rounded-lg overflow-hidden border border-border/20">
                        {DAY_NAMES.map((day, i) => (
                             <div key={day} className={cn(
                                 "text-center font-bold p-2 bg-card",
                                 isCurrentWeek && i === todayIndex && "bg-accent/20"
                                 )}>
                                <p className="text-lg">{day}</p>
                                <p className="text-sm font-normal text-muted-foreground">{weekDates[i].getUTCDate()}</p>
                             </div>
                        ))}
                        
                        {daySpecificEventsByDay.map((dayCategories, dayIndex) => {
                            // In Game Week 1, clear events before Thursday (index 3)
                            if (gameWeekNumber === 1 && dayIndex < 3) {
                                return <EventColumn key={`specific-${dayIndex}`} dayIndex={dayIndex} dayCategories={{}} />;
                            }
                            return <EventColumn key={`specific-${dayIndex}`} dayIndex={dayIndex} dayCategories={dayCategories} />;
                        })}
                    </div>

                    {filteredMultiDayEvents.length > 0 && (
                        <div className="mt-px">
                            <div className="relative bg-border/20 rounded-lg overflow-hidden border border-border/20">
                                <div className="absolute top-0 left-0 grid grid-cols-7 h-full w-full -z-10 bg-card/50">
                                    {DAY_NAMES.map((_, i) => (
                                        <div key={i} className={cn("h-full", i > 0 && "border-l border-border/20")} />
                                    ))}
                                </div>
                                <div className="space-y-1 p-1">
                                    {filteredMultiDayEvents.map(({ event, daySpans }, index) => (
                                        <WeeklyEventBar key={`${event.name}-${daySpans[0]}-${index}`} event={event} daySpans={daySpans} />
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}


                     {!isCurrentWeek && (
                        <Button onClick={() => setCurrentDate(getGameTime(new Date()))} className="w-full mt-4">
                            Jump to This Week
                        </Button>
                    )}
                </CardContent>
            </Card>
        </TooltipProvider>
    );
}
