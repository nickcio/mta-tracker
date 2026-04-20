import express, { json } from 'express';
import startScheduler from './scheduler.js';
import importSchedule from './routes/services/importSchedule.js';
const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;
import tripsRouter from './routes/trips.js';
app.use('/api/trips', tripsRouter);

app.use(json());

import delaysRouter from './routes/delays.js';
import dotenv from 'dotenv';
console.log('delays router loaded:', delaysRouter);
app.use('/api/delays', delaysRouter);

console.log(delaysRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server Is Running' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await importSchedule();
  startScheduler(5);
});