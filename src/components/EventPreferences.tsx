"use client";

import { useState, useEffect, createContext, useContext } from 'react';
import { Settings, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { GameEvent } from '@/lib/events';
import { CategoryIcons } from './DailyTimeline';
import { Swords, Crown, Star, HeartHandshake, Gamepad2, Footprints, Users, ShieldCheck, KeySquare, ShieldAlert, BrainCircuit } from 'lucide-react';

// Re-export CategoryIcons as fallback
const CategoryIconsFallback: Record<string, React.ElementType> = {
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

const STORAGE_KEY = 'event-preferences';

export type EventPreferences = {
  categories: Record<string, boolean>;
};

const DEFAULT_PREFERENCES: EventPreferences = {
  categories: {},
};

type EventPreferencesContextType = {
  preferences: EventPreferences;
  updatePreferences: (newPrefs: EventPreferences) => void;
  toggleCategory: (category: string) => void;
  isCategoryEnabled: (category: string) => boolean;
  mounted: boolean;
};

const EventPreferencesContext = createContext<EventPreferencesContextType | undefined>(undefined);

export function EventPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<EventPreferences>(DEFAULT_PREFERENCES);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...DEFAULT_PREFERENCES, ...parsed });
      } else {
        // Initialize all categories as enabled by default
        const initialPrefs: EventPreferences = {
          categories: {
            'World Boss Crusade': true,
            'Dungeon Unlock': true,
            'Raid Unlock': true,
            'Event': true,
            'Guild': true,
            'Patrol': true,
            'Social': true,
            'Mini-game': true,
            'Buff': true,
            'Roguelike': true,
            'Boss': true,
          },
        };
        setPreferences(initialPrefs);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(initialPrefs));
      }
    } catch (error) {
      console.error('Error loading event preferences:', error);
    }
  }, []);

  const updatePreferences = (newPrefs: EventPreferences) => {
    setPreferences(newPrefs);
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPrefs));
      } catch (error) {
        console.error('Error saving event preferences:', error);
      }
    }
  };

  const toggleCategory = (category: string) => {
    const newPrefs = {
      ...preferences,
      categories: {
        ...preferences.categories,
        [category]: !(preferences.categories[category] ?? true),
      },
    };
    updatePreferences(newPrefs);
  };

  const isCategoryEnabled = (category: string): boolean => {
    return preferences.categories[category] ?? true;
  };

  return (
    <EventPreferencesContext.Provider
      value={{
        preferences,
        updatePreferences,
        toggleCategory,
        isCategoryEnabled,
        mounted,
      }}
    >
      {children}
    </EventPreferencesContext.Provider>
  );
}

export function useEventPreferences() {
  const context = useContext(EventPreferencesContext);
  if (context === undefined) {
    throw new Error('useEventPreferences must be used within EventPreferencesProvider');
  }
  return context;
}

export function filterEventsByPreferences(events: GameEvent[], isCategoryEnabled: (category: string) => boolean): GameEvent[] {
  return events.filter(event => isCategoryEnabled(event.category));
}

export function EventPreferencesPanel() {
  const { preferences, toggleCategory, isCategoryEnabled, mounted } = useEventPreferences();
  const [isOpen, setIsOpen] = useState(false);

  if (!mounted) return null;

  const categories: GameEvent['category'][] = [
    'World Boss Crusade',
    'Dungeon Unlock',
    'Raid Unlock',
    'Event',
    'Guild',
    'Patrol',
    'Social',
    'Mini-game',
    'Buff',
    'Roguelike',
    'Boss',
  ];

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 z-40 shadow-lg"
        aria-label="Event preferences"
      >
        <Settings className="h-4 w-4" />
      </Button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setIsOpen(false)}>
          <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Event Preferences</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                aria-label="Close preferences"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Toggle event categories to show or hide them in all timeline views. Your preferences are saved automatically.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categories.map((category) => {
                  const Icon = (CategoryIcons && CategoryIcons[category]) || CategoryIconsFallback[category] || Star;
                  const enabled = isCategoryEnabled(category);
                  return (
                    <div key={category} className="flex items-center space-x-3 p-3 rounded-lg border bg-card">
                      {Icon && <Icon className="h-5 w-5 flex-shrink-0" />}
                      <div className="flex-1 flex items-center space-x-2">
                        <Checkbox
                          id={`category-${category}`}
                          checked={enabled}
                          onCheckedChange={() => toggleCategory(category)}
                        />
                        <Label
                          htmlFor={`category-${category}`}
                          className="text-sm font-medium cursor-pointer flex-1"
                        >
                          {category.replace(/([A-Z])/g, ' $1').trim()}
                        </Label>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <Button
                  onClick={() => setIsOpen(false)}
                  className="w-full"
                  variant="default"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

