
"use client";

import { useState, useEffect } from 'react';
import { Clock, Globe, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getGameTime } from '@/lib/time';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { TimeDisplayMode, TimeFormat } from '@/app/page';

interface TimeDisplayProps {
    timeMode: TimeDisplayMode;
    setTimeMode: (mode: TimeDisplayMode) => void;
    timeFormat: TimeFormat;
    setTimeFormat: (format: TimeFormat) => void;
}

const TimeDisplay = ({ timeMode, setTimeMode, timeFormat, setTimeFormat }: TimeDisplayProps) => {
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [selectedTimezone, setSelectedTimezone] = useState<string>('');
  const [timezones, setTimezones] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isClient) {
        setSelectedTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        try {
        if (typeof Intl.supportedValuesOf === 'function') {
            setTimezones(Intl.supportedValuesOf('timeZone'));
        }
        } catch (e) {
        console.error("Timezones not supported", e);
        }
    }
  }, [isClient]);

  const gameTime = currentTime ? getGameTime(currentTime) : null;

  const formatTime = (date: Date | null, timeZone: string | undefined) => {
    if (!date || !timeZone || !isClient) return '--:--:--';
    return date.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: timeFormat === '12h',
    });
  };
  
  const formatDate = (date: Date | null, timeZone: string | undefined) => {
    if (!date || !timeZone || !isClient) return 'Loading...';
    return date.toLocaleDateString(undefined, {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const handleTimeModeSwitchChange = (checked: boolean) => {
    setTimeMode(checked ? 'local' : 'game');
  };

  const handleTimeFormatSwitchChange = (checked: boolean) => {
    setTimeFormat(checked ? '12h' : '24h');
  };

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
        <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
            <Calendar className="h-5 w-5 text-accent" />
            <div className="flex flex-col text-right">
                <span className="font-semibold text-foreground">
                    {formatDate(currentTime, selectedTimezone)}
                </span>
            </div>
        </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
        <Clock className="h-5 w-5 text-accent" />
        <div className="flex flex-col text-right">
          <span className="font-semibold text-foreground">
            {formatTime(currentTime, selectedTimezone)}
          </span>
          <span className="text-xs text-muted-foreground">Your Time</span>
        </div>
      </div>
      <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/50">
        <Globe className="h-5 w-5 text-accent" />
        <div className="flex flex-col text-right">
          <span className="font-semibold text-foreground">
            {gameTime ? gameTime.toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: timeFormat === '12h' }) : '--:--:--'}
          </span>
          <span className="text-xs text-muted-foreground">Game Time (UTC-2)</span>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <Label htmlFor="time-mode-switch" className="text-xs text-muted-foreground">Game</Label>
        <Switch 
          id="time-mode-switch" 
          checked={timeMode === 'local'}
          onCheckedChange={handleTimeModeSwitchChange}
          aria-label="Toggle time display mode"
        />
        <Label htmlFor="time-mode-switch" className="text-xs">Local</Label>
      </div>
       <div className="flex items-center space-x-2">
        <Label htmlFor="time-format-switch" className="text-xs text-muted-foreground">24h</Label>
        <Switch 
          id="time-format-switch" 
          checked={timeFormat === '12h'}
          onCheckedChange={handleTimeFormatSwitchChange}
          aria-label="Toggle time format"
        />
        <Label htmlFor="time-format-switch" className="text-xs">AM/PM</Label>
      </div>
       {isClient && timezones.length > 0 && timeMode === 'local' && (
        <div className="max-w-[150px] md:max-w-[200px]">
          <Select value={selectedTimezone} onValueChange={setSelectedTimezone}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select timezone" />
            </SelectTrigger>
            <SelectContent>
              {timezones.map((tz) => (
                <SelectItem key={tz} value={tz}>
                  {tz}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
       )}
    </div>
  );
};

export default TimeDisplay;

    