# 🚆 LIRR Delay Tracker

A full-stack real-time delay tracking and historical analytics dashboard for the Long Island Rail Road, built with React, Node.js, and PostgreSQL.

![LIRR Delay Tracker Screenshot](./screenshot.png)

---

## Features

- **Real-time trip search** — search any origin/destination station pair and see upcoming trips with live per-stop delay status
- **Delay heatmap** — visualize historical average delays by route and time of day, filterable by weekday, weekend, or all days
- **Automatic data pipeline** — backend polls the MTA's live GTFS feed every 5 minutes, calculates delays against the static schedule, and persists results to a PostgreSQL database
- **Historical accumulation** — heatmap data is aggregated over time and never wiped, so patterns improve in accuracy the longer the app runs
- **Smart schedule management** — static GTFS schedule is only reimported when the MTA publishes a new feed version, avoiding unnecessary work

---

## Tech Stack

**Frontend**
- React (Vite)
- DM Sans + DM Mono (Google Fonts)
- Vanilla CSS with CSS variables for theming

**Backend**
- Node.js + Express
- MTA GTFS Realtime feed via `gtfs-realtime-bindings`
- Static GTFS schedule parsed via `csv-parser`
- Supabase (PostgreSQL) via `@supabase/supabase-js`

---

## Architecture

```
┌─────────────────────────────────────────────┐
│                  React Client               │
│  Trip Search │ Delay Badges │ Heatmap       │
└──────────────────┬──────────────────────────┘
                   │ REST API
┌──────────────────▼──────────────────────────┐
│              Express Server                 │
│  /api/trips  /api/heatmap  /api/stopnames   │
└──────────────────┬──────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
┌──────▼──────┐       ┌────────▼────────┐
│  MTA GTFS   │       │    Supabase     │
│  Live Feed  │       │   PostgreSQL    │
│ (Realtime)  │       │                 │
└─────────────┘       │  trip_updates   │
                      │  scheduled_times│
┌─────────────┐       │  heatmap_stats  │
│  MTA GTFS   │       │  stops          │
│  Static ZIP │       │  feed_metadata  │
│ (Schedule)  │       └─────────────────┘
└─────────────┘
```

---

## How Delay Calculation Works

1. The server fetches the MTA's live GTFS Realtime feed every 5 minutes
2. Each stop's real-time arrival (Unix timestamp) is converted to Eastern time
3. The scheduled arrival for that `trip_id` + `stop_id` combination is looked up from the static GTFS schedule
4. `delay_seconds = real_arrival - scheduled_arrival`
5. Results are upserted into `trip_updates` and aggregated into `heatmap_stats`

---

## Getting Started

### Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account
- MTA GTFS static feed (download from [mta.info](https://new.mta.info/document/52221))

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/mta-project.git
cd mta-project

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### Configuration

Create a `.env` file in the `/server` directory:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-public-key
PORT=5170
```

### Database Setup

Run the following in your Supabase SQL Editor:

```sql
CREATE TABLE trip_updates (
  id SERIAL PRIMARY KEY,
  trip_id TEXT,
  route_id TEXT,
  stop_id TEXT,
  arrival BIGINT,
  departure BIGINT,
  schedule_relationship INT,
  delay_seconds INT,
  updated_at TIMESTAMP,
  CONSTRAINT unique_trip_stop UNIQUE (trip_id, stop_id)
);

CREATE TABLE scheduled_times (
  trip_id TEXT,
  stop_id TEXT,
  scheduled_arrival TEXT,
  PRIMARY KEY (trip_id, stop_id)
);

CREATE TABLE stops (
  stop_id TEXT PRIMARY KEY,
  stop_name TEXT,
  stop_lat FLOAT,
  stop_lon FLOAT
);

CREATE TABLE heatmap_stats (
  route_id TEXT,
  hour INT,
  day_type TEXT DEFAULT 'weekday',
  total_delay_seconds BIGINT DEFAULT 0,
  sample_count INT DEFAULT 0,
  PRIMARY KEY (route_id, hour, day_type)
);

CREATE TABLE feed_metadata (
  id SERIAL PRIMARY KEY,
  feed_version TEXT,
  imported_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION truncate_scheduled_times()
RETURNS void AS $$
  TRUNCATE TABLE scheduled_times;
$$ LANGUAGE sql;
```

### Extract GTFS Static Feed

Extract the downloaded MTA GTFS zip into a `/gtfs` folder at the project root:

```
mta-project/
  gtfs/
    stop_times.txt
    stops.txt
    trips.txt
    feed_info.txt
    ...
  server/
  client/
```

### Running the App

```bash
# Start the backend (from /server)
node index.js

# Start the frontend (from /client)
npm run dev
```

The app will be available at `http://localhost:5173`.

On first startup the server will automatically import stops and the static schedule, then begin polling the live feed every 5 minutes.

---

## Project Structure

```
mta-project/
├── gtfs/                          # MTA static GTFS files
├── server/
│   ├── index.js                   # Express app entry point
│   ├── supabase.js                # Supabase client
│   ├── scheduler.js               # Auto-fetch scheduler
│   ├── routes/
│   │   ├── delays.js              # POST /api/delays
│   │   ├── trips.js               # GET /api/trips
│   │   ├── heatmap.js             # GET /api/heatmap
│   │   └── stops.js               # GET /api/stopnames
│   └── services/
│       ├── fetchDelays.js         # GTFS realtime fetch + delay calc
│       ├── importSchedule.js      # Static schedule importer
│       ├── importStops.js         # Stops importer
│       └── updateHeatmap.js       # Heatmap aggregation
└── client/
    └── src/
        ├── App.jsx                # Main layout + trip search
        └── Heatmaps.jsx           # Delay heatmap component
```

---

---

## Data Sources

- [MTA GTFS Realtime Feed](https://api-endpoint.mta.info) — live train positions and stop time updates
- [MTA GTFS Static Feed](https://new.mta.info/document/52221) — scheduled timetables for all LIRR routes
