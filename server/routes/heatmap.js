import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('heatmap_stats')
    .select('route_id, hour, total_delay_seconds, sample_count');

  if (error) return res.status(500).json({ error: error.message });

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