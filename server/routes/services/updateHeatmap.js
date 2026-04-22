import supabase from '../../supabase.js';

const updateHeatmap = async () => {
    console.log('Updating heatmap stats...');
  // get all current trip_updates with delay data
  const { data, error } = await supabase
    .from('trip_updates')
    .select('route_id, delay_seconds, fetched_at')
    .not('delay_seconds', 'is', null)
    .not('route_id', 'is', null);

  if (error) throw new Error(error.message);

  // aggregate by route and hour
  const aggregated = {};
  data.forEach(row => {
    const hour = new Date(row.fetched_at).getHours();
    const key = `${row.route_id}_${hour}`;
    if (!aggregated[key]) {
      aggregated[key] = { route_id: row.route_id, hour, total: 0, count: 0 };
    }
    aggregated[key].total += row.delay_seconds;
    aggregated[key].count += 1;
  });

  // upsert into heatmap_stats, merging with existing data
  const rows = Object.values(aggregated).map(entry => ({
    route_id: entry.route_id,
    hour: entry.hour,
    total_delay_seconds: entry.total,
    sample_count: entry.count
  }));

  for (const row of rows) {
    // fetch existing row first
    const { data: existing } = await supabase
      .from('heatmap_stats')
      .select('total_delay_seconds, sample_count')
      .eq('route_id', row.route_id)
      .eq('hour', row.hour)
      .single();

    if (existing) {
      // merge with existing totals
      await supabase
        .from('heatmap_stats')
        .update({
          total_delay_seconds: existing.total_delay_seconds + row.total_delay_seconds,
          sample_count: existing.sample_count + row.sample_count
        })
        .eq('route_id', row.route_id)
        .eq('hour', row.hour);
    } else {
      await supabase.from('heatmap_stats').insert(row);
    }
  }

  console.log(`Heatmap updated with ${rows.length} route/hour combinations`);
};

export default updateHeatmap;