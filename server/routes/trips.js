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
    .select('trip_id, stop_id, arrival, departure, delay_seconds')
    .eq('stop_id', origin);

  if (originError) return res.status(500).json({ error: originError.message });

  const tripIds = [...new Set(originTrips.map(t => t.trip_id))];

  const { data: trips, error: tripsError } = await supabase
    .from('trip_updates')
    .select('trip_id, stop_id, arrival, departure, delay_seconds')
    .in('trip_id', tripIds)
    .eq('stop_id', destination);

  if (tripsError) return res.status(500).json({ error: tripsError.message });

  // filter to only trips where origin comes before destination
  const validTripIds = trips.map(t => t.trip_id);

  const { data: fullTrips, error: fullError } = await supabase
    .from('trip_updates')
    .select('trip_id, stop_id, arrival, departure, delay_seconds')
    .in('trip_id', validTripIds)
    .order('arrival', { ascending: true });

  if (fullError) return res.status(500).json({ error: fullError.message });

  // group by trip_id
  const grouped = {};
  fullTrips.forEach(row => {
    if (!grouped[row.trip_id]) grouped[row.trip_id] = [];
    grouped[row.trip_id].push(row);
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

  res.json({ trips: trimmed });
});

export default router;