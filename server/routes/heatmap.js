import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('trip_updates')
    .select('route_id, delay_seconds, fetched_at')
    .not('delay_seconds', 'is', null)
    .not('route_id', 'is', null);

  if (error) return res.status(500).json({ error: error.message });

  // group by route_id and hour of day
  const heatmap = {};

  data.forEach(row => {
    const hour = new Date(row.fetched_at).getHours();
    const key = `${row.route_id}_${hour}`;

    if (!heatmap[key]) {
      heatmap[key] = {
        route_id: row.route_id,
        hour,
        total_delay: 0,
        count: 0
      };
    }

    heatmap[key].total_delay += row.delay_seconds;
    heatmap[key].count += 1;
  });

  // calculate average delay per route per hour
  const result = Object.values(heatmap).map(entry => ({
    route_id: entry.route_id,
    hour: entry.hour,
    avg_delay_seconds: Math.round(entry.total_delay / entry.count),
    avg_delay_minutes: Math.round((entry.total_delay / entry.count) / 60 * 10) / 10,
    sample_count: entry.count
  }));

  res.json({ heatmap: result });
});

export default router;