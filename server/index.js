const express = require('express');
const app = express();
require('dotenv').config();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const delaysRouter = require('./routes/delays');
console.log('delays router loaded:', delaysRouter);
app.use('/api/delays', delaysRouter);

app.get('/', (req, res) => {
    res.json({ message: 'Server Is Running' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});