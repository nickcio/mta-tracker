import GtfsRealtimeBindings from "gtfs-realtime-bindings";
import fetch from "node-fetch";
import { importGtfs } from 'gtfs';
import supabase from '../../supabase.js';
//import * as axios from 'axios';

const fetchDelays = async () => {
  try {
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

    //delete old data
    await supabase
    .from('trip_updates')
    .delete()
    //30 days
    .lt('fetched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    //2 minute
    //.lt('fetched_at', new Date(Date.now() - 2 * 60 * 1000).toISOString());

    const { error } = await supabase.from('trip_updates').upsert(rows, {
      onConflict: 'trip_id, stop_id, arrival',
      ignoreDuplicates: false
    });
    if (error) throw new Error(error.message);

    return rows.length;

  } catch (err) {
    return err.message;
  }
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