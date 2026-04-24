import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import csv from 'csv-parser';
import supabase from '../../supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GTFS_DIR = path.join(__dirname, '../../../gtfs');

const importRoutes = async (force = false) => {
  const routesPath = path.join(GTFS_DIR, 'routes.txt');

  if (!fs.existsSync(routesPath)) {
    console.log('routes.txt not found, skipping routes import');
    return;
  }

  if (!force) {
    const { data: existing } = await supabase
      .from('routes')
      .select('route_id')
      .limit(1);
    if (existing?.length > 0) {
      console.log('Routes already imported, skipping');
      return;
    }
  }

  console.log('Importing routes...');

  // truncate first if force
  if (force) {
    await supabase.from('routes').delete().neq('route_id', '');
  }

  const rows = [];
  await new Promise((resolve, reject) => {
    fs.createReadStream(routesPath)
      .pipe(csv())
      .on('data', row => {
        rows.push({
          route_id: row.route_id,
          route_short_name: row.route_short_name,
          route_long_name: row.route_long_name
        });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  const { error } = await supabase.from('routes').insert(rows);
  if (error) console.error('Insert error:', error.message);

  console.log(`Imported ${rows.length} routes`);
};

export default importRoutes;