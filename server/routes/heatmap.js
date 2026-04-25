import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { day_type } = req.query;

  let query = supabase
    .from('heatmap_stats')
    .select('route_id, hour, total_delay_seconds, sample_count')
    .not('route_id', 'eq', '');

  if (day_type && day_type !== 'all') {
    query = query.eq('day_type', day_type);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  // for "all", merge weekday + weekend rows for the same route/hour
  const merged = {};
  data.forEach(row => {
    const key = `${row.route_id}_${row.hour}`;
    if (!merged[key]) {
      merged[key] = { route_id: row.route_id, hour: row.hour, total_delay_seconds: 0, sample_count: 0 };
    }
    merged[key].total_delay_seconds += row.total_delay_seconds;
    merged[key].sample_count += row.sample_count;
  });

  const result = data.map(row => ({
    route_id: row.route_id,
    hour: row.hour,
    avg_delay_seconds: Math.round(row.total_delay_seconds / row.sample_count),
    avg_delay_minutes: Math.round((row.total_delay_seconds / row.sample_count) / 60 * 10) / 10,
    sample_count: row.sample_count
  }));

  res.json({ heatmap: result });
});

export default router;