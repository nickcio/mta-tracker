import fs from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import supabase from '../../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_SIZE = 1000;
const GTFS_DIR = join(__dirname, '../../../gtfs'); // folder where you extracted the zip

const getFeedVersion = () => {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(path.join(GTFS_DIR, 'feed_info.txt'))
      .pipe(csv())
      .on('data', row => results.push(row))
      .on('end', () => resolve(results[0]?.feed_version))
      .on('error', reject);
  });
};

const importSchedule = async (force = false) => {
  // check if gtfs files exist
  const feedInfoPath = path.join(GTFS_DIR, 'feed_info.txt');
  const stopTimesPath = path.join(GTFS_DIR, 'stop_times.txt');

  if (!fs.existsSync(feedInfoPath) || !fs.existsSync(stopTimesPath)) {
    console.log('GTFS files not found, skipping schedule import');
    return;
  }
  
  const feedVersion = await getFeedVersion();
  console.log('Feed version:', feedVersion);

  const { data: existing } = await supabase
    .from('feed_metadata')
    .select('feed_version')
    .order('imported_at', { ascending: false })
    .limit(1);

  if (!force && existing?.[0]?.feed_version === feedVersion) {
    console.log('Schedule is already up to date, skipping import');
    return;
  }
  console.log('New schedule detected, importing...');
  

  await supabase.from('scheduled_times').delete().neq('trip_id', '');

  let batch = [];
  let totalInserted = 0;

  await new Promise((resolve, reject) => {
    fs.createReadStream(path.join(GTFS_DIR, 'stop_times.txt'))
      .pipe(csv())
      .on('data', async row => {
        batch.push({
          trip_id: row.trip_id,
          stop_id: row.stop_id,
          scheduled_arrival: row.arrival_time
        });

        if (batch.length >= BATCH_SIZE) {
          const currentBatch = [...batch];
          batch = [];
          const { error } = await supabase
            .from('scheduled_times')
            .insert(currentBatch);
          if (error) console.error('Insert error:', error.message);
          totalInserted += currentBatch.length;
          console.log(`Inserted ${totalInserted} rows...`);
        }
      })
      .on('end', async () => {
        if (batch.length > 0) {
          const { error } = await supabase
            .from('scheduled_times')
            .insert(batch);
          if (error) console.error('Insert error:', error.message);
          totalInserted += batch.length;
        }
        console.log(`ScheduleImport complete — ${totalInserted} total rows inserted`);
        resolve();
      })
      .on('error', reject);
  });

  await supabase.from('feed_metadata').insert({ feed_version: feedVersion });
};

export default importSchedule;