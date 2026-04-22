import dotenv from 'dotenv';
dotenv.config();

import express, { json } from 'express';
import cors from 'cors';
import startScheduler from './scheduler.js';
import fetchDelays from './routes/services/fetchDelays.js';
//Routes
import importSchedule from './routes/services/importSchedule.js';
import tripsRouter from './routes/trips.js';
import delaysRouter from './routes/delays.js';
import stopNamesRouter from './routes/stopnames.js';
import heatmapRouter from './routes/heatmap.js';


const app = express();
const PORT = process.env.PORT || 5170;
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET'],
  credentials: true
}));
app.use(json());

app.use('/api/trips', tripsRouter);
app.use('/api/delays', delaysRouter);
app.use('/api/stopnames', stopNamesRouter);
app.use('/api/heatmap', heatmapRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server Is Running' });
});

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await importSchedule();
  await fetchDelays();
  startScheduler(4);
});