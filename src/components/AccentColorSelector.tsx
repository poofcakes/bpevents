
"use client";

import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const accentColors = [
  { name: 'Blue', hsl: '217 91% 60%' },
  { name: 'Indigo', hsl: '240 80% 65%' },
  { name: 'Purple', hsl: '288 85% 54%' },
  { name: 'Pink', hsl: '340 82% 57%' },
  { name: 'Red', hsl: '0 72% 51%' },
  { name: 'Orange', hsl: '25 95% 53%' },
  { name: 'Yellow', hsl: '48 96% 50%' },
  { name: 'Green', hsl: '142 71% 45%' },
  { name: 'Teal', hsl: '180 70% 50%' },
];

const AccentColorSelector = () => {
  const [mounted, setMounted] = useState(false);
  const [activeColor, setActiveColor] = useState(accentColors[0].hsl);

  useEffect(() => {
    setMounted(true);
    const storedColor = localStorage.getItem('accent-color');
    if (storedColor && accentColors.some(c => c.hsl === storedColor)) {
      document.documentElement.style.setProperty('--accent', storedColor);
      document.documentElement.style.setProperty('--ring', storedColor);
      setActiveColor(storedColor);
    }
  }, []);

  const handleColorChange = (hsl: string) => {
    document.documentElement.style.setProperty('--accent', hsl);
    document.documentElement.style.setProperty('--ring', hsl);
    localStorage.setItem('accent-color', hsl);
    setActiveColor(hsl);
  };

  if (!mounted) {
    return null; // Avoid rendering on the server to prevent hydration mismatch
  }

  return (
    <div className="flex justify-center items-center gap-2">
       <span className="text-xs font-medium text-muted-foreground">Theme:</span>
      <TooltipProvider>
        <div className="flex gap-1.5">
          {accentColors.map((color) => (
            <Tooltip key={color.name}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => handleColorChange(color.hsl)}
                  className={cn(
                    "h-5 w-5 rounded-full border-2 transition-transform hover:scale-110",
                    activeColor === color.hsl ? 'border-foreground' : 'border-transparent'
                  )}
                  style={{ backgroundColor: `hsl(${color.hsl})` }}
                  aria-label={`Set accent color to ${color.name}`}
                >
                  {activeColor === color.hsl && (
                    <div className="flex h-full w-full items-center justify-center">
                       <Check className="h-4 w-4 text-white mix-blend-luminosity" />
                    </div>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{color.name}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
};

export default AccentColorSelector;
