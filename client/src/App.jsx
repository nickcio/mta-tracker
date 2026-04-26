import { useState, useEffect } from 'react'
import Heatmap from './Heatmap.jsx';
import SearchableSelect from './SearchableSelect.jsx';

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stopNames, setStopNames] = useState({});
  const [routeNames, setRouteNames] = useState({});
  const [gtfsStatus, setGtfsStatus] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [timeframe, setTimeframe] = useState('all');

  useEffect(() => {
  const fetchGtfsStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gtfs/status`);
      const data = await res.json();
      //console.log('GTFS status:', data); // add this
      setGtfsStatus(data);
    } catch (err) {
      console.error('Failed to fetch GTFS status', err);
    }
  };
  fetchGtfsStatus();
}, []);

const refreshGtfs = async () => {
  if (refreshing) return;
  setRefreshing(true);
  try {
    const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gtfs/refresh`, { method: 'POST' });
    const data = await res.json();
    if (data.status === 'success') {
      // refetch status after refresh
      const statusRes = await fetch(`${import.meta.env.VITE_API_URL}/api/gtfs/status`);
      const statusData = await statusRes.json();
      setGtfsStatus(statusData);
    }
  } catch (err) {
    console.error('GTFS refresh failed', err);
  } finally {
    setRefreshing(false);
  }
};

  useEffect(() => {
    const fetchStopNames = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/stopnames`);
        const data = await res.json();
        setStopNames(data.stop_map);
      } catch (err) {
        console.error('Failed to fetch stop names', err);
      }
    };
    fetchStopNames();
  }, []);

  useEffect(() => {
    const fetchRouteNames = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/routenames`);
        const data = await res.json();
        setRouteNames(data.route_map);
      } catch (err) {
        console.error('Failed to fetch route names', err);
      }
    };
    fetchRouteNames();
  }, []);

  const searchTrips = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/trips?origin=${origin}&destination=${destination}&timeframe=${timeframe}`
      );
      const data = await res.json();
      setTrips(data.trips);
    } catch (err) {
      setError('Failed to fetch trips');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sortedStops = Object.entries(stopNames).sort((a, b) =>
    a[1].localeCompare(b[1])
  );

  /*const selectStyle = {
    padding: '10px 12px',
    background: 'var(--surface2)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    color: 'var(--text)',
    fontSize: '0.9rem',
    fontFamily: 'DM Sans, sans-serif',
    width: '100%',
    cursor: 'pointer',
    outline: 'none',
  };*/

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Navbar */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '0 32px',
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        {/* Left — branding */}
        <span style={{ fontSize: '1.2rem' }}>🚆</span>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontWeight: 500,
          fontSize: '1rem',
          color: 'var(--text)',
          letterSpacing: '0.05em'
        }}>
          LIRR DELAY TRACKER
        </span>
        {(gtfsStatus && <span style={{
          background: 'var(--accent)',
          color: 'white',
          fontSize: '0.65rem',
          padding: '2px 8px',
          borderRadius: '99px',
          fontFamily: 'DM Mono, monospace',
          letterSpacing: '0.08em'
        }}>
          LIVE
        </span>)}

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right — GTFS status + refresh */}
        {gtfsStatus && (
          <>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              lineHeight: 1.3
            }}>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.65rem',
                color: 'var(--text-muted)',
                letterSpacing: '0.08em'
              }}>
                STATIC FEED
              </span>
              <span style={{
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.7rem',
                color: gtfsStatus.up_to_date ? 'var(--green)' : 'var(--orange)',
              }}>
                {gtfsStatus.up_to_date ? '✓' : '!'} {gtfsStatus.feed_version ? gtfsStatus.feed_version : 'N/A'} {'\u2014'}{' '}
                {gtfsStatus.up_to_date ? 'Up to date' : `New version available${gtfsStatus.feed_version ? `: ${gtfsStatus.feed_version}` : '!'}`}
              </span>
            </div>
            <button
              onClick={refreshGtfs}
              disabled={refreshing}
              style={{
                padding: '6px 14px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                color: refreshing ? 'var(--text-muted)' : 'var(--text)',
                fontFamily: 'DM Mono, monospace',
                fontSize: '0.7rem',
                letterSpacing: '0.05em',
                cursor: refreshing ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={e => { if (!refreshing) e.target.style.borderColor = 'var(--accent)'; }}
              onMouseLeave={e => { e.target.style.borderColor = 'var(--border)'; }}
            >
              {refreshing ? '⟳ UPDATING...' : '⟳ REFRESH FEED'}
            </button>
          </>
        )}
        </div>

      {/* Main layout */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '28px 24px',
        display: 'flex',
        gap: '24px',
        alignItems: 'flex-start'
      }}>

        {/* LEFT — search */}
        <div style={{ flex: '0 0 320px' }}>
          <p style={{
            fontSize: '0.7rem',
            fontFamily: 'DM Mono, monospace',
            color: 'var(--text-muted)',
            letterSpacing: '0.1em',
            marginBottom: '12px'
          }}>
            TRIP SEARCH
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
            <SearchableSelect
              value={origin}
              onChange={setOrigin}
              options={sortedStops}
              placeholder="Origin station"
            />

            <SearchableSelect
              value={destination}
              onChange={setDestination}
              options={sortedStops}
              placeholder="Destination station"
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={searchTrips}
                style={{
                  padding: '10px',
                  background: 'var(--accent)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.9rem',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 600,
                  cursor: 'pointer',
                  width: '50%',
                }}
                onMouseEnter={e => e.target.style.opacity = '0.85'}
                onMouseLeave={e => e.target.style.opacity = '1'}
              >
                Search
              </button>

              <div style={{
                display: 'flex',
                gap: '4px',
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '4px',
                width: '50%'
              }}>
                {[
                  { value: '24h', label: '24H' },
                  { value: '7d', label: '7D' },
                  { value: 'all', label: 'ALL' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setTimeframe(value)}
                    style={{
                      flex: 1,
                      padding: '6px 0',
                      border: 'none',
                      borderRadius: '7px',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontFamily: 'DM Mono, monospace',
                      letterSpacing: '0.05em',
                      transition: 'all 0.15s',
                      background: timeframe === value ? 'var(--accent)' : 'transparent',
                      color: timeframe === value ? 'white' : 'var(--text-muted)',
                      fontWeight: timeframe === value ? 600 : 400,
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading && <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Loading trips...</p>}
          {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem' }}>{error}</p>}
          {trips && Object.keys(trips).length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No trips found.</p>
          )}

          {/* Trip results */}
          <div style={{
            maxHeight: '70vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {trips && Object.entries(trips).map(([tripId, stops]) => (
              <div key={tripId} style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: '14px',
              }}>
                <div style={{ marginBottom: '10px' }}>
                  <span style={{
                    fontFamily: 'DM Mono, monospace',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    letterSpacing: '0.05em'
                  }}>
                    DEPARTS — {routeNames[stops[0]?.route_id]?.long || `ROUTE ${stops[0]?.route_id}` || 'UNKNOWN ROUTE'}
                  </span>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>
                    {stops[0]?.arrival
                      ? new Date(stops[0].arrival * 1000).toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        })
                      : stops[0]?.departure
                      ? new Date(stops[0].departure * 1000).toLocaleString('en-US', {
                          timeZone: 'America/New_York',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true
                        }) : 'Unknown'}
                  </div>
                </div>

                {stops.map((stop, i) => {
                  const delay = stop.delay_seconds;
                  const delayMinutes = delay !== null ? Math.round((delay / 60) * 10) / 10 : null;
                  const badgeColor = delay === null ? 'var(--gray)' :
                                     delay <= 60 ? '#166534' :
                                     delay <= 300 ? 'var(--orange)' : 'var(--red)';
                  const label = delay === null ? 'No data' :
                                delay <= 60 ? 'On time' :
                                `${delayMinutes}m late`;

                  return (
                    <div key={i} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 0',
                      borderBottom: i < stops.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text)' }}>
                        {stopNames[stop.stop_id] || stop.stop_id}
                      </span>
                      <span style={{
                        background: badgeColor,
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontSize: '0.75rem',
                        fontFamily: 'DM Mono, monospace',
                        whiteSpace: 'nowrap'
                      }}>
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — heatmap */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Heatmap routeNames={routeNames} />
        </div>

      </div>
    </div>
  );
}

export default App;