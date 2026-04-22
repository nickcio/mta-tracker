import { useEffect, useState } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => (i + 5) % 24);

const getColor = (avgDelaySeconds) => {
  if (avgDelaySeconds === undefined) return 'var(--surface2)';
  if (avgDelaySeconds <= 30) return 'var(--green)';
  if (avgDelaySeconds <= 120) return 'var(--yellow)';
  if (avgDelaySeconds <= 300) return 'var(--orange)';
  return 'var(--red)';
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

  if (loading) return (
    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading heatmap...</p>
  );
  if (error) return <p style={{ color: 'var(--red)' }}>{error}</p>;

  const routes = [...new Set(heatmapData.map(d => d.route_id))].sort((a, b) =>
    Number(a) - Number(b)
  );

  const lookup = {};
  heatmapData.forEach(d => {
    lookup[`${d.route_id}_${d.hour}`] = d;
  });

  return (
    <div>
      <p style={{
        fontSize: '0.7rem',
        fontFamily: 'DM Mono, monospace',
        color: 'var(--text-muted)',
        letterSpacing: '0.1em',
        marginBottom: '12px'
      }}>
        DELAY HEATMAP — HISTORICAL AVERAGES
      </p>

      {/* Legend */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '20px',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'DM Mono, monospace'
      }}>
        {[
          { color: 'var(--green)',    label: 'ON TIME (≤30s)' },
          { color: 'var(--yellow)',   label: 'SLIGHT (≤2min)' },
          { color: 'var(--orange)',   label: 'MODERATE (≤5min)' },
          { color: 'var(--red)',      label: 'LATE (>5min)' },
          { color: 'var(--surface2)', label: 'NO DATA' },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '12px', height: '12px',
              background: color,
              border: '1px solid var(--border)',
              borderRadius: '2px'
            }} />
            {label}
          </div>
        ))}
      </div>

      <table style={{ borderCollapse: 'collapse', width: 'auto' }}>
        <thead>
          <tr>
            <th style={{ width: '1%' }} />
            {routes.map(routeId => (
              <th key={routeId} style={{
                padding: '4px 6px',
                fontSize: '0.7rem',
                fontFamily: 'DM Mono, monospace',
                color: 'var(--text-muted)',
                fontWeight: 500,
                textAlign: 'center',
                minWidth: '52px'
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
                padding: '2px 10px 2px 0',
                fontSize: '0.7rem',
                fontFamily: 'DM Mono, monospace',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                width: '1%',
                textAlign: 'right'
              }}>
                {formatHour((hour - 5 + 24) % 24)}
              </td>
              {routes.map(routeId => {
                const entry = lookup[`${routeId}_${hour}`];
                const color = getColor(entry?.avg_delay_seconds);
                const tooltip = entry
                  ? `Route ${routeId} @ ${formatHour((hour - 5 + 24) % 24)}: ${entry.avg_delay_minutes} min avg (${entry.sample_count} samples)`
                  : 'No data';
                return (
                  <td key={routeId} title={tooltip} style={{
                    background: color,
                    width: '52px',
                    height: '32px',
                    border: '2px solid var(--bg)',
                    borderRadius: '4px',
                    cursor: 'default',
                    transition: 'opacity 0.15s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                  />
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