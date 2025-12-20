"use client";

import { useState, useEffect } from 'react';
import { formatDuration, getGameTime } from '@/lib/time';

interface CountdownProps {
  targetDate: Date;
  durationMinutes?: number;
}

export default function Countdown({ targetDate, durationMinutes }: CountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timerId = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);
  
  const gameNow = getGameTime(now);
  const timeDifference = targetDate.getTime() - gameNow.getTime();

  if (timeDifference < 0 && durationMinutes) {
    const endTime = new Date(targetDate.getTime() + durationMinutes * 60 * 1000);
    const remainingActiveTime = endTime.getTime() - gameNow.getTime();
    if (remainingActiveTime > 0) {
      return (
        <div className="text-green-400 flex items-center gap-2">
          <span>Active!</span>
          <span className="text-sm">({formatDuration(remainingActiveTime)} left)</span>
        </div>
      );
    }
  }

  if (timeDifference <= 0) {
    return <span className="text-muted-foreground">Spawning...</span>;
  }

  return <span>{formatDuration(timeDifference)}</span>;
}
