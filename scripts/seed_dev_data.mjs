// Dev seed: generates plausible (but synthetic) data for every station listed
// in public/data/stations.json (currently 159 s1 sites) so the UI works
// end-to-end before the Python JMA ingest runs. Each station's climate is
// calibrated from latitude / longitude so northern stations are colder and
// Okinawa is warm year-round.
//
// Real data is produced by:
//   cd scripts && uv run python -m fetch_jma --all --years 30
//   cd scripts && uv run python -m build_dataset --all
// which overwrites these synthetic files with real JMA observations.
//
// Run: node scripts/seed_dev_data.mjs

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const STATIONS_JSON = path.join(REPO_ROOT, "public", "data", "stations.json");
const JMA_DIR = path.join(REPO_ROOT, "public", "data", "jma");

const YEARS = Array.from({ length: 30 }, (_, i) => 1996 + i);

function dayOfYear(month, day) {
  const days = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  return days[month - 1] + day;
}

// Climate model: empirical fits roughly matching JMA 1991-2020 normals,
// parameterised by latitude (cooler north / warmer south).
function climate(month, day, lat) {
  const doy = dayOfYear(month, day);
  // peak (sin=1) at doy=215 (early August)
  const phase = ((doy - 124) / 365) * 2 * Math.PI;

  // annual mean drops ~0.7°C per degree latitude north of 35°N
  const meanShift = (35 - lat) * 0.7;
  const tmaxMean = 19.0 + meanShift + 12.5 * Math.sin(phase);
  const tminMean = 11.5 + meanShift + 11.0 * Math.sin(phase);

  // rain seasons: tsuyu (Jun) + typhoons (Sep)
  const rainBoost =
    Math.exp(-((month - 6.5) ** 2) / 0.6) * 0.18 +
    Math.exp(-((month - 9.2) ** 2) / 0.4) * 0.14;
  // Pacific coast & Okinawa get more rain; rough proxy via latitude
  const climateRainBase = lat < 28 ? 0.32 : lat < 36 ? 0.24 : 0.21;
  const rainProb = climateRainBase + rainBoost;

  const sunshineMean = Math.max(2.0, 6.5 - rainBoost * 12);
  const windMean = 3.2 + 0.5 * Math.cos(phase * 0.5);
  const humidityMean = 65 + 10 * Math.sin(phase + 0.4);
  return { tmaxMean, tminMean, rainProb, sunshineMean, windMean, humidityMean };
}

function rng(seedStr) {
  let s = 0;
  for (const c of seedStr) s = (s * 31 + c.charCodeAt(0)) | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1_000_000) / 1_000_000;
  };
}

function gauss(rand, mean, sd) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildDaily(station) {
  const r = rng(station.id);
  const daily = {};
  for (let m = 1; m <= 12; m++) {
    const lastDay = new Date(Date.UTC(2001, m, 0)).getUTCDate();
    for (let d = 1; d <= lastDay; d++) {
      const key = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const c = climate(m, d, station.lat);
      const rec = {
        tmax: [],
        tmin: [],
        tavg: [],
        prcp: [],
        sunshine: [],
        wind: [],
        humidity: [],
      };
      for (let i = 0; i < YEARS.length; i++) {
        const tmax = +gauss(r, c.tmaxMean, 3.0).toFixed(1);
        const tmin = +gauss(r, c.tminMean, 2.5).toFixed(1);
        const tavg = +(((tmax + tmin) / 2).toFixed(1));
        const isRain = r() < c.rainProb;
        const prcp = isRain ? +Math.max(0, gauss(r, 8, 12)).toFixed(1) : 0;
        const sunshine = +Math.max(
          0,
          isRain ? gauss(r, 1.5, 1.5) : gauss(r, c.sunshineMean, 2.5),
        ).toFixed(1);
        const wind = +Math.max(0.5, gauss(r, c.windMean, 1.2)).toFixed(1);
        const humidity = Math.round(
          Math.max(35, Math.min(98, gauss(r, c.humidityMean, 8))),
        );
        rec.tmax.push(tmax);
        rec.tmin.push(tmin);
        rec.tavg.push(tavg);
        rec.prcp.push(prcp);
        rec.sunshine.push(sunshine);
        rec.wind.push(wind);
        rec.humidity.push(humidity);
      }
      daily[key] = rec;
    }
  }
  return daily;
}

async function main() {
  await mkdir(JMA_DIR, { recursive: true });
  const stations = JSON.parse(await readFile(STATIONS_JSON, "utf-8"));
  for (const s of stations) {
    const out = {
      station_id: s.id,
      name: s.name,
      prefecture: s.prefecture,
      lat: s.lat,
      lng: s.lng,
      data_source: "synthetic",
      years: YEARS,
      daily: buildDaily(s),
    };
    await writeFile(path.join(JMA_DIR, `${s.id}.json`), JSON.stringify(out));
  }
  console.log(`generated ${stations.length} synthetic station files`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
