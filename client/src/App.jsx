import { useState,useEffect } from 'react'
import Heatmap from './Heatmap.jsx';

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stopNames, setStopNames] = useState({});

  useEffect(() => {
    const fetchStopNames = async () => {
      try {
        const res = await fetch('http://localhost:5170/api/stopnames');
        const data = await res.json();
        setStopNames(data.stop_map);
      } catch (err) {
        console.error('Failed to fetch stop names', err);
      }
    };
    fetchStopNames();
  }, []);

  const searchTrips = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `http://localhost:5170/api/trips?origin=${origin}&destination=${destination}`
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

  return (
  <div style={{ maxWidth: '1600px', margin: '0px auto', padding: '0 20px' }}>
    
    
    <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
      {/* LEFT COLUMN — trip searcher */}
      <div style={{ flex: '0 0 800px' }}>
        <h1>🚆 LIRR Delay Tracker</h1>
        <div style={{ display: 'flex', flexDirection: 'row', gap: '10px', marginBottom: '30px' }}>
          <select
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            style={{ padding: '15px', fontSize: '1rem' }}
          >
            <option value=''>Select origin</option>
            {sortedStops.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <select
            value={destination}
            onChange={e => setDestination(e.target.value)}
            style={{ padding: '15px', fontSize: '1rem' }}
          >
            <option value=''>Select destination</option>
            {sortedStops.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>

          <button onClick={searchTrips} style={{ padding: '8px 16px', fontSize: '1rem', cursor: 'pointer' }}>
            Search
          </button>

          {loading && <p>Loading...</p>}
          {error && <p style={{ color: 'red' }}>{error}</p>}
          {trips && Object.keys(trips).length === 0 && (
            <p>No trips found between these stops.</p>
          )}
        </div>

        

        <div style={{
          maxHeight: '700px',
          overflowY: 'auto',
          border: '1px solid #eee',
          borderRadius: '8px',
          padding: '8px'
        }}>
          {trips && Object.entries(trips).map(([tripId, stops]) => (
            <div key={tripId} style={{
              border: '1px solid #ddd',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '12px'
            }}>
              <h3 style={{ margin: '0 0 12px 0', fontSize: '0.95rem' }}>
                Trip {tripId} — Departs{' '}
                {stops[0]?.arrival
                  ? new Date(stops[0].arrival * 1000).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                      hour12: true
                    })
                  : 'Unknown'}
              </h3>
              {stops.map((stop, i) => {
                const delay = stop.delay_seconds;
                const delayMinutes = delay !== null ? Math.round((delay / 60) * 10) / 10 : null;
                const badge = delay === null ? '#999' :
                              delay <= 60 ? 'green' :
                              delay <= 300 ? 'orange' : 'red';
                const label = delay === null ? 'No data' :
                              delay <= 60 ? 'On time' :
                              `${delayMinutes} min late`;
                return (
                  <div key={i} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '6px 0',
                    borderBottom: '1px solid #f0f0f0'
                  }}>
                    <span style={{ fontSize: '0.85rem' }}>{stopNames[stop.stop_id] || stop.stop_id}</span>
                    <span style={{
                      background: badge,
                      color: 'white',
                      padding: '2px 10px',
                      borderRadius: '12px',
                      fontSize: '0.8rem'
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

      {/* RIGHT COLUMN — heatmap */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <Heatmap />
      </div>

    </div>
  </div>
);
}

export default App;