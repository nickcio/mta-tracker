import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { origin, destination } = req.query;

  if (!origin || !destination) {
    return res.status(400).json({ error: 'origin and destination are required' });
  }

  // get all trips that serve both the origin and destination stop
  const { data: originTrips, error: originError } = await supabase
    .from('trip_updates')
    .select('trip_id, route_id, stop_id, arrival, departure, delay_seconds')
    .eq('stop_id', origin)
    .limit(50000);

  if (originError) return res.status(500).json({ error: originError.message });

  const tripIds = [...new Set(originTrips.map(t => t.trip_id))];

  const { data: trips, error: tripsError } = await supabase
    .from('trip_updates')
    .select('trip_id, route_id, stop_id, arrival, departure, delay_seconds')
    .in('trip_id', tripIds)
    .eq('stop_id', destination)
    .limit(50000);

  if (tripsError) return res.status(500).json({ error: tripsError.message });

  // filter to only trips where origin comes before destination
  const validTripIds = trips.map(t => t.trip_id);

  let fullTrips = [];
  let from = 0;
  const pageSize = 1000;

  while (true) {
    const { data, error: fullError } = await supabase
      .from('trip_updates')
      .select('trip_id, route_id, stop_id, arrival, departure, delay_seconds')
      .in('trip_id', validTripIds)
      .order('trip_id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (fullError) return res.status(500).json({ error: fullError.message });
    
    fullTrips = fullTrips.concat(data);
    
    if (data.length < pageSize) break; // no more pages
    from += pageSize;
  }

  // group by trip_id
  const grouped = {};
  fullTrips.forEach(row => {
    if (!grouped[row.trip_id]) grouped[row.trip_id] = [];
    grouped[row.trip_id].push(row);
  });

  // sort stops within each trip — arrival ascending, nulls last, fall back to departure
  Object.values(grouped).forEach(stops => {
    stops.sort((a, b) => {
      // stops with only departure = first stop (use departure)
      // stops with only arrival = last stop (use arrival)
      // stops with both = use arrival
      // stops with neither = push to end
      const aTime = a.arrival ?? a.departure ?? Infinity;
      const bTime = b.arrival ?? b.departure ?? Infinity;

      // if a has no arrival but has departure, it's a first stop — sort earliest
      // if a has no departure but has arrival, it's a last stop — sort latest
      if (!a.arrival && a.departure && !b.departure) return -1;
      if (!b.arrival && b.departure && !a.departure) return 1;

      return aTime - bTime;
    });
  });

  // trim each trip to start at origin stop
  const trimmed = {};
  Object.entries(grouped).forEach(([tripId, stops]) => {
    const originIndex = stops.findIndex(s => s.stop_id === origin);
    const destIndex = stops.findIndex(s => s.stop_id === destination);
    if (originIndex !== -1 && destIndex !== -1 && originIndex < destIndex) {
      trimmed[tripId] = stops.slice(originIndex, destIndex + 1);
    }
  });

  const sorted = Object.entries(trimmed).sort((a, b) => {
    const aOrigin = a[1][0]?.arrival ?? a[1][0]?.departure ?? 0;
    const bOrigin = b[1][0]?.arrival ?? b[1][0]?.departure ?? 0;
    return bOrigin - aOrigin;
  });

  res.json({ trips: Object.fromEntries(sorted) });
});

export default router;