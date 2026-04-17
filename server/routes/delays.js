const gtfs = require("gtfs-realtime-bindings");
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.get('/', async (req, res) => {
  try {
    const response = await axios.get(
      'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
      {
        responseType: 'arraybuffer'
      }
    );
    // Raw feed confirmed working - we'll parse it next
    // res.json({ status: 'success', bytes: response.data.length });
    const feed = gtfs.transit_realtime.FeedMessage.decode(
      new Uint8Array(response.data)
    );
    res.json({ data: feed });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;