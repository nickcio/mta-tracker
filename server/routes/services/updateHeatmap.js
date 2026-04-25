import supabase from '../../supabase.js';

const updateHeatmap = async () => {
    console.log('Updating heatmap stats...');
  // get all current trip_updates with delay data
  const { data, error } = await supabase
    .from('trip_updates')
    .select('route_id, delay_seconds, updated_at')
    .not('delay_seconds', 'is', null)
    .not('route_id', 'is', null)
    .not('route_id', 'eq', '');

  if (error) throw new Error(error.message);

  // aggregate by route and hour
  const aggregated = {};
  data.forEach(row => {
    const date = new Date(row.updated_at);
    

    const hour = date.getHours();
    const day = date.getDay(); // 0 = Sunday, 6 = Saturday
    const day_type = (day === 0 || day === 6) ? 'weekend' : 'weekday';
    const key = `${row.route_id}_${hour}_${day_type}`;
    //console.log(`Date: ${date.toISOString()}, Day: ${day}, Hour: ${hour}, Route: ${row.route_id}, Delay: ${row.delay_seconds}, Day Type: ${day_type}`);
    if (!aggregated[key]) {
      aggregated[key] = { route_id: row.route_id, hour, day_type, total: 0, count: 0 };
    }
    aggregated[key].total += row.delay_seconds;
    aggregated[key].count += 1;
  });

  // upsert into heatmap_stats, merging with existing data
  const rows = Object.values(aggregated).map(entry => ({
    route_id: entry.route_id,
    hour: entry.hour,
    day_type: entry.day_type,
    total_delay_seconds: entry.total,
    sample_count: entry.count
  }));

  for (const row of rows) {
    // fetch existing row first
    //console.log(`For row with route_id ${row.route_id}, hour ${row.hour}, day_type ${row.day_type}, total_delay_seconds ${row.total_delay_seconds}, sample_count ${row.sample_count}`);
    //console.log(`Processing route ${row.route_id} hour ${row.hour} day_type ${row.day_type} with total delay ${row.total_delay_seconds} and count ${row.sample_count}`);
    const { data: existing } = await supabase
      .from('heatmap_stats')
      .select('total_delay_seconds, sample_count')
      .eq('route_id', row.route_id)
      .eq('hour', row.hour)
      .eq('day_type', row.day_type)
      .single();

    //console.log(`Got existing data for route ${row.route_id} hour ${row.hour} day_type ${row.day_type}:`, existing);

    if (existing) {
      // merge with existing totals
      await supabase
        .from('heatmap_stats')
        .update({
          total_delay_seconds: existing.total_delay_seconds + row.total_delay_seconds,
          sample_count: existing.sample_count + row.sample_count
        })
        .eq('route_id', row.route_id)
        .eq('hour', row.hour)
        .eq('day_type', row.day_type);
    } else {
      await supabase.from('heatmap_stats').insert(row);
    }
  }

  console.log(`Heatmap updated with ${rows.length} route/hour/day_type combinations`);
};

export default updateHeatmap;