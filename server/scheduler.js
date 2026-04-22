import fetchDelays from './routes/services/fetchDelays.js';

const startScheduler = (intervalMinutes = 5) => {
  console.log(`Scheduler started — fetching every ${intervalMinutes} minutes`);

  setInterval(async () => {
    try {
      console.log('scheduler firing');
      const count = await fetchDelays();
      console.log(`[${new Date().toISOString()}] Fetched ${count} rows`);
    } catch (err) {
      console.error(`[${new Date().toISOString()}] Fetch failed:`, err.message);
    }
  }, intervalMinutes * 60 * 1000);
};

export default startScheduler;