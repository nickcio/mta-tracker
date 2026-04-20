import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import { importGtfs } from 'gtfs';
import supabase from '../../supabase.js';
//import * as axios from 'axios';

const fetchDelays = async () => {
    const response = await getGtfsData();

    const buffer = await response.arrayBuffer();
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(
      new Uint8Array(buffer)
    );

    /*
    const trips = feed.entity.filter(entity => entity.tripUpdate).map(entity => ({
      id: entity.id,
      tripId: entity.tripUpdate?.trip?.tripId,
      routeId: entity.tripUpdate?.trip?.routeId,
      stopUpdates: entity.tripUpdate?.stopTimeUpdate?.map(stop => ({
        stopId: stop.stopId,
        arrival: stop.arrival?.time?.low,
        departure: stop.departure?.time?.low,
        scheduleRelationship: stop.scheduleRelationship
      }))
    }));

    const vehicles = feed.entity.filter(entity => entity.vehicle).map(entity => ({
      id: entity.id,
      tripId: entity.vehicle?.trip?.tripId,
      routeId: entity.vehicle?.trip?.routeId,
      latitude: entity.vehicle?.position?.latitude,
      longitude: entity.vehicle?.position?.longitude,
      currentStatus: entity.vehicle?.currentStatus,
      timestamp: entity.vehicle?.timestamp?.low,
      stopId: entity.vehicle?.stopId,
      vehicleId: entity.vehicle?.vehicle?.id,
      vehicleLabel: entity.vehicle?.vehicle?.label,
    }));

    res.json({ data: feed.entity, trips, vehicles });
      */

    const rows = [];
    feed.entity.forEach(entity => {
      const tripId = entity.tripUpdate?.trip?.tripId;
      const routeId = entity.tripUpdate?.trip?.routeId;
      entity.tripUpdate?.stopTimeUpdate?.forEach(stop => {
        rows.push({
          trip_id: tripId,
          route_id: routeId,
          stop_id: stop.stopId,
          arrival: stop.arrival?.time?.low ?? null,
          departure: stop.departure?.time?.low ?? null,
          schedule_relationship: stop.scheduleRelationship ?? null
        });
      });
    });

    // fetch scheduled times for all trip/stop combos in this batch
    const tripIds = [...new Set(rows.map(r => r.trip_id))];
    const { data: scheduled, error: scheduleError } = await supabase
    .from('scheduled_times')
    .select('trip_id, stop_id, scheduled_arrival')
    .in('trip_id', tripIds);

    if (scheduleError) throw new Error(scheduleError.message);
    
    // build a lookup map for fast access
    const scheduleMap = {};
    scheduled?.forEach(s => {
      scheduleMap[`${s.trip_id}_${s.stop_id}`] = s.scheduled_arrival;
    });

      // calculate delay for each row
    const rowsWithDelay = rows.map(row => {
      const scheduledArrival = scheduleMap[`${row.trip_id}_${row.stop_id}`];
      let delay_seconds = null;

      if (scheduledArrival && row.arrival) {
        // convert scheduled HH:MM:SS to seconds since midnight
        const [h, m, s] = scheduledArrival.split(':').map(Number);
        const scheduledSeconds = h * 3600 + m * 60 + s;

        // convert Unix timestamp to Eastern time
        const realDate = new Date(row.arrival * 1000);
        const easternTime = new Date(realDate.toLocaleString('en-US', { timeZone: 'America/New_York' }));
        const realSeconds = easternTime.getHours() * 3600 +
                      easternTime.getMinutes() * 60 +
                      easternTime.getSeconds();

        // account for day overflow (e.g. scheduled 25:30 = 1:30 next day)
        const normalizedScheduled = scheduledSeconds % 86400;

        delay_seconds = realSeconds - normalizedScheduled;
      }

      return { ...row, delay_seconds };
    });

    //delete old data
    await supabase
    .from('trip_updates')
    .delete()
    //30 days
    .lt('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    //2 minute
    //.lt('fetched_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

    const { error } = await supabase.from('trip_updates').upsert(rowsWithDelay, {
      onConflict: 'trip_id, stop_id, arrival',
      ignoreDuplicates: false
    });
    if (error) throw new Error(error.message);

    return rowsWithDelay.length;

};

async function getGtfsData() {
    return fetch(
      'https://api-endpoint.mta.info/Dataservice/mtagtfsfeeds/lirr%2Fgtfs-lirr',
      {
        headers: {
            "x-api-key": "",
        },
      }
    );
}

export default fetchDelays;