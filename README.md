# BP:SR Event Tracker

A comprehensive event tracking web application for **Blue Protocol: Star Resonance**. Track daily, weekly, and monthly events, reset timers, and stay on top of all in-game activities with real-time countdowns and visual timelines.

## Features

- **Daily Timeline**: View all events scheduled for a specific game day with interactive timeline visualization
- **Weekly Schedule**: See the full week's event schedule at a glance
- **Monthly Calendar**: Monthly view of time-limited events and unlocks
- **Reset Timers**: Real-time countdowns for daily, weekly, and special resets (Stimen Vaults)
- **Time Display Modes**: Switch between Game Time (UTC-2) and Local Time
- **Time Format Options**: Toggle between 12-hour and 24-hour formats
- **Event Filtering**: Filter by event categories, hide permanent events, and more
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Dark Mode**: Beautiful dark theme optimized for extended viewing

## Tech Stack

- **Framework**: Next.js 15.5.9 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Date Handling**: date-fns
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd bpevents
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:9002](http://localhost:9002) in your browser.

### Available Scripts

- `npm run dev` - Start development server with Turbopack on port 9002
- `npm run build` - Build for production
- `npm run build:gh` - Build for GitHub Pages (with basePath)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Project Structure

```
src/
├── app/              # Next.js App Router pages and layouts
├── components/        # React components
│   ├── ui/          # Reusable UI components (Radix UI)
│   ├── DailyTimeline.tsx
│   ├── WeeklyTimeline.tsx
│   ├── MonthlyTimeline.tsx
│   ├── ResetTimers.tsx
│   └── Header.tsx
├── lib/              # Utility functions and data
│   ├── events.ts     # Event definitions and data
│   ├── time.ts       # Time conversion utilities
│   └── utils.ts      # General utilities
└── hooks/            # Custom React hooks
```

## Deployment

### GitHub Pages

The project is configured for automatic deployment to GitHub Pages:

1. Push to the `master` branch
2. GitHub Actions will automatically:
   - Build the static site
   - Deploy to GitHub Pages

The site will be available at `https://<username>.github.io/bpevents/`

### Manual Build

To build for production:

```bash
npm run build:gh
```

The static files will be generated in the `out/` directory.

## Configuration

### Base Path

The project uses a configurable base path for GitHub Pages deployment. This is set via the `NEXT_PUBLIC_BASE_PATH` environment variable:

- **Local development**: No base path (empty)
- **GitHub Pages**: `/bpevents` (set in `.github/workflows/deploy.yml`)

### Event Data

Events are defined in `src/lib/events.ts`. Each event can have:
- **Time-limited events**: Use `dateRange` or `dateRanges` for start/end dates
- **Permanent events**: Use `availability` to indicate when they were added/removed from the game

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

Copyright (c) 2025 BP:SR Event Tracker - All Rights Reserved.

This project is proprietary software. Commercial use and distribution are prohibited. 
See [LICENSE](LICENSE) for full terms.

## Acknowledgments

- Event data and schedules based on Blue Protocol: Star Resonance
- Map credit to original creator (see spawnpoints map)
