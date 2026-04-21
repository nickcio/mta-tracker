import { useEffect, useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => (i + 5) % 24);

const getColor = (avgDelaySeconds) => {
  if (avgDelaySeconds === undefined) return '#f0f0f0';
  if (avgDelaySeconds <= 30) return '#4caf50';
  if (avgDelaySeconds <= 120) return '#ffeb3b';
  if (avgDelaySeconds <= 300) return '#ff9800';
  return '#f44336';
};

const formatHour = (hour) => {
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const h = hour % 12 || 12;
  return `${h}${suffix}`;
};

function Heatmap() {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await fetch('http://localhost:5170/api/heatmap');
        const data = await res.json();
        setHeatmapData(data.heatmap);
        console.log('Updated heatmap data');
      } catch (err) {
        setError('Failed to fetch heatmap data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();

    const interval = setInterval(fetchHeatmap, 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (loading) return <p>Loading heatmap...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  // get unique sorted route IDs
  const routes = [...new Set(heatmapData.map(d => d.route_id))].sort((a, b) => 
    Number(a) - Number(b)
  );
  // build lookup map: route_hour -> avg_delay_seconds
  const lookup = {};
  heatmapData.forEach(d => {
    lookup[`${d.route_id}_${d.hour}`] = d;
  });

  //const HOURS = [...new Set(heatmapData.map(d => d.hour))].sort((a, b) => a - b);
  

return (
  <div>
    <h2>📊 Delay Heatmap</h2>
    <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '16px' }}>
      Based on historical data. Hover a cell for details.
    </p>

    {/* legend */}
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px', fontSize: '0.8rem' }}>
      {[
        { color: '#4caf50', label: 'On time (≤30s)' },
        { color: '#ffeb3b', label: 'Slight (≤2min)' },
        { color: '#ff9800', label: 'Moderate (≤5min)' },
        { color: '#f44336', label: 'Late (>5min)' },
        { color: '#f0f0f0', label: 'No data' },
      ].map(({ color, label }) => (
        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '14px', height: '14px',
            background: color,
            border: '1px solid #ddd',
            borderRadius: '2px'
          }} />
          <span>{label}</span>
        </div>
      ))}
    </div>

    <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
      <thead>
        <tr>
          {/* empty top-left corner */}
          <th style={{ padding: '4px 8px', width: '1%' }} />
          {routes.map(routeId => (
            <th key={routeId} style={{
              padding: '4px 6px',
              fontSize: '0.75rem',
              fontWeight: 'bold',
              textAlign: 'center',
              minWidth: '36px'
            }}>
              Route {routeId}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {HOURS.map(hour => (
          <tr key={hour}>
            <td style={{
              padding: '2px 8px',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              width: '1%',
              color: '#666'
            }}>
              {formatHour((hour - 5 + 24) % 24)}
            </td>
            {routes.map(routeId => {
              const entry = lookup[`${routeId}_${hour}`];
              const color = getColor(entry?.avg_delay_seconds);
              const tooltip = entry
                ? `Route ${routeId} at ${formatHour((hour - 5 + 24) % 24)}: ${entry.avg_delay_minutes} min avg delay (${entry.sample_count} samples)`
                : 'No data';
              return (
                <td key={routeId} title={tooltip} style={{
                  background: color,
                  width: '36px',
                  height: '28px',
                  border: '1px solid #fff',
                  cursor: 'default',
                  borderRadius: '3px'
                }} />
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
}

export default Heatmap;