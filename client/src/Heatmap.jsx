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

const DAY_TYPES = [
  { value: 'all', label: 'All Days' },
  { value: 'weekday', label: 'Weekdays' },
  { value: 'weekend', label: 'Weekends' },
];

function Heatmap({ routeNames = {} }) {
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dayType, setDayType] = useState('all');

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const url = dayType === 'all'
          ? `${import.meta.env.VITE_API_URL}/api/heatmap`
          : `${import.meta.env.VITE_API_URL}/api/heatmap?day_type=${dayType}`;
        const res = await fetch(url);
        const data = await res.json();;
        setHeatmapData(data.heatmap);
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
  }, [dayType]);

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

      {/* Day type toggle */}
      <div style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '16px',
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '4px',
        width: 'fit-content'
      }}>
        {DAY_TYPES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setDayType(value); setLoading(true); }}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '7px',
              cursor: 'pointer',
              fontSize: '0.75rem',
              fontFamily: 'DM Mono, monospace',
              letterSpacing: '0.05em',
              transition: 'all 0.15s',
              background: dayType === value ? 'var(--accent)' : 'transparent',
              color: dayType === value ? 'white' : 'var(--text-muted)',
              fontWeight: dayType === value ? 600 : 400,
            }}
          >
            {label}
          </button>
        ))}
      </div>

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
          { color: 'var(--green)',     label: 'ON TIME (≤30s)' },
          { color: 'var(--yellow)',    label: 'SLIGHT (≤2min)' },
          { color: 'var(--orange)',    label: 'MODERATE (≤5min)' },
          { color: 'var(--red)',       label: 'LATE (>5min)' },
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

      {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading heatmap...</p>}
      {error && <p style={{ color: 'var(--red)' }}>{error}</p>}

      {!loading && !error && (
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
                  {routeNames[routeId]?.long?.replace(' Branch', '') || `R${routeId}`}
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
                    ? `${routeNames[routeId]?.long || `Route ${routeId}`} @ ${formatHour((hour - 5 + 24) % 24)}: ${entry.avg_delay_minutes} min avg (${entry.sample_count} samples)`
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
      )}
    </div>
  );
}

export default Heatmap;