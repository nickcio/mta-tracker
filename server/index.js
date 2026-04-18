import express, { json } from 'express';
const app = express();
dotenv.config();
const PORT = process.env.PORT || 3000;

app.use(json());

import delaysRouter from './routes/delays.js';
import dotenv from 'dotenv';
console.log('delays router loaded:', delaysRouter);
app.use('/api/delays', delaysRouter);

console.log(delaysRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server Is Running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});