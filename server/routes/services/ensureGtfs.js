import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GTFS_DIR = path.join(__dirname, '../../gtfs');
const ZIP_PATH = path.join(__dirname, '../../gtfs.zip');
const GTFS_URL = 'https://rrgtfsfeeds.s3.amazonaws.com/gtfslirr.zip';

const ensureGtfs = async () => {
  const feedInfoPath = path.join(GTFS_DIR, 'feed_info.txt');

  if (fs.existsSync(feedInfoPath)) {
    console.log('GTFS files already present, skipping download');
    return;
  }

  console.log('GTFS files not found, downloading...');

  const response = await fetch(GTFS_URL);
  if (!response.ok) throw new Error(`GTFS download failed: ${response.statusText}`);

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(ZIP_PATH, Buffer.from(buffer));
  console.log('Download complete');

  if (!fs.existsSync(GTFS_DIR)) fs.mkdirSync(GTFS_DIR, { recursive: true });

  const zip = new AdmZip(ZIP_PATH);
  zip.extractAllTo(GTFS_DIR, true);
  fs.unlinkSync(ZIP_PATH);
  console.log('GTFS files extracted');
};

export default ensureGtfs;