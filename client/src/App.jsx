import { useState } from 'react'

function App() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [trips, setTrips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stopNames, setStopNames] = useState(null);

  const searchTrips = async () => {
    if (!origin || !destination) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('http://localhost:5170/api/stopnames');
      const data = await res.json();
      setStopNames(data.stop_map);
    } catch (err) {
      setError('Failed to fetch stop names');
      console.error(err);
    }
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

  return (
    <div style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
      <h1>🚆 LIRR Delay Tracker</h1>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          placeholder="Origin stop ID"
          value={origin}
          onChange={e => setOrigin(e.target.value)}
          style={{ padding: '8px', flex: 1 }}
        />
        <input
          placeholder="Destination stop ID"
          value={destination}
          onChange={e => setDestination(e.target.value)}
          style={{ padding: '8px', flex: 1 }}
        />
        <button onClick={searchTrips} style={{ padding: '8px 16px' }}>
          Search
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {trips && Object.keys(trips).length === 0 && (
        <p>No trips found between these stops.</p>
      )}

      {trips && Object.entries(trips).map(([tripId, stops]) => (
        <div key={tripId} style={{
          border: '1px solid #ddd',
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '12px'
        }}>
          <h3 style={{ margin: '0 0 12px 0' }}>Trip {tripId}</h3>
          {stops.map((stop, i) => {
            const delay = stop.delay_seconds;
            const delayMinutes = delay !== null ? Math.round((delay/60)*10)/10 : null;
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
                <span>Stop {stop.stop_id} {stopNames[stop.stop_id] || ''}</span>
                <span style={{
                  background: badge,
                  color: 'white',
                  padding: '2px 10px',
                  borderRadius: '12px',
                  fontSize: '0.85rem'
                }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default App;