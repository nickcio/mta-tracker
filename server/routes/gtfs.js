import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';
import supabase from '../supabase.js';
import importSchedule from './services/importSchedule.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const GTFS_DIR = path.join(__dirname, '../../gtfs');
const ZIP_PATH = path.join(__dirname, '../../gtfs.zip');

const router = express.Router();

// GET /api/gtfs/status — returns current feed version and when it was imported
router.get('/status', async (req, res) => {
  const { data, error } = await supabase
    .from('feed_metadata')
    .select('feed_version, imported_at')
    .order('imported_at', { ascending: false })
    .limit(1);

  if (error) return res.status(500).json({ error: error.message });

  res.json({
    feed_version: data?.[0]?.feed_version ?? null,
    imported_at: data?.[0]?.imported_at ?? null
  });
});

// POST /api/gtfs/refresh — downloads latest GTFS zip and reimports
router.post('/refresh', async (req, res) => {
  try {
    // 1 — download zip
    console.log('Downloading GTFS static feed...');
    const response = await fetch('https://rrgtfsfeeds.s3.amazonaws.com/gtfslirr.zip');
    if (!response.ok) throw new Error(`Download failed: ${response.statusText}`);
    const buffer = await response.arrayBuffer();
    fs.writeFileSync(ZIP_PATH, Buffer.from(buffer));
    console.log('Download complete');

    // 2 — extract zip into gtfs folder
    console.log('Extracting...');
    if (!fs.existsSync(GTFS_DIR)) fs.mkdirSync(GTFS_DIR);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    console.log('Buffer size:', buffer.byteLength);
    const zip = new AdmZip(ZIP_PATH);
    zip.extractAllTo(GTFS_DIR, true); // true = overwrite
    fs.unlinkSync(ZIP_PATH); // clean up zip file
    console.log('Extraction complete');

    // 3 — reimport schedule
    const importSchedule = (await import('./services/importSchedule.js')).default;
    await importSchedule(true); // pass force=true to skip version check
    await importStops();

    res.json({ status: 'success', message: 'GTFS data refreshed successfully' });
  } catch (err) {
    console.error('GTFS refresh failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// helper to reimport stops
async function importStops() {
  const importStopsFn = (await import('./services/importStops.js')).default;
  await importStopsFn(true);
}

export default router;