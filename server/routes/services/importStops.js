import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import supabase from '../../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GTFS_DIR = path.join(__dirname, '../../../gtfs');
const BATCH_SIZE = 500;

const importStops = async (force = false) => {
  const stopsPath = path.join(GTFS_DIR, 'stops.txt');

  if (!fs.existsSync(stopsPath)) {
    console.log('stops.txt not found, skipping stops import');
    return;
  }

  // check if stops already imported
  const { data: existing } = await supabase
    .from('stop_names')
    .select('stop_id')
    .limit(1);

  if (!force && existing?.length > 0) {
    console.log('Stops already imported, skipping');
    return;
    }

  await supabase.from('stop_names').delete().neq('stop_id', '');

  console.log('Importing stops...');
  const rows = [];

  await new Promise((resolve, reject) => {
    fs.createReadStream(path.join(GTFS_DIR, 'stops.txt'))
      .pipe(csv())
      .on('data', row => {
        rows.push({
          stop_id: row.stop_id,
          stop_name: row.stop_name,
          stop_lat: parseFloat(row.stop_lat),
          stop_lon: parseFloat(row.stop_lon)
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  // batch insert
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from('stop_names').insert(batch);
    if (error) console.error('Insert error:', error.message);
  }

  console.log(`Imported ${rows.length} stops`);
};

export default importStops;