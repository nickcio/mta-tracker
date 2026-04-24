import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('routes')
    .select('route_id, route_short_name, route_long_name');

  if (error) return res.status(500).json({ error: error.message });

  const route_map = {};
  data.forEach(r => {
    route_map[r.route_id] = {
      short: r.route_short_name,
      long: r.route_long_name
    };
  });

  res.json({ route_map });
});

export default router;