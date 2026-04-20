import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  // get stop names
  const { data: stopName, error: stopError } = await supabase
    .from('stop_names')
    .select('stop_id, stop_name');

  if (stopError) return res.status(500).json({ error: stopError.message });

    const stopMap = {};
    stopName.forEach(stop => {
        stopMap[stop.stop_id] = stop.stop_name;
    });

  res.json({ stop_map: stopMap });
});

export default router;