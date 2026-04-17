import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import { importGtfs } from 'gtfs';
import { Router } from 'express';
const router = Router();
//import * as axios from 'axios';

router.get('/', async (req, res) => {
  try {
    const response = await fetch(
      'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
      {
        headers: {
            "x-api-key": "",
        },
      }
    );
    // Raw feed confirmed working - we'll parse it next
    // res.json({ status: 'success', bytes: response.data.length });
    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );
    res.json({ data: feed.entity.sort((a, b) => a.id.localeCompare(b.id)) });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;