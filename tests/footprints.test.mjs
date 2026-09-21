import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  latestRelease, buildingsTilesUrl, lonLatToTile, tilesCoveringBBox, lonLatToTilePixel,
  ringBBox, bboxesOverlap, summariseFootprint, interiorPoint, keepBuildingPiece
} from '../assets/js/footprints.mjs';

test('latestRelease reads the release flagged latest in the STAC catalog', () => {
  const catalog = {
    links: [
      { rel: 'root', href: 'https://stac.overturemaps.org/catalog.json' },
      { rel: 'child', href: 'https://stac.overturemaps.org/2026-07-22.0/catalog.json' },
      { rel: 'child', href: 'https://stac.overturemaps.org/2026-08-19.0/catalog.json', latest: true }
    ]
  };
  assert.equal(latestRelease(catalog), '2026-08-19.0');
});

test('latestRelease returns null for a catalog without a usable latest link', () => {
  assert.equal(latestRelease({ links: [{ rel: 'child', href: 'https://x/2026-08-19.0/catalog.json' }] }), null);
  assert.equal(latestRelease({ links: [{ rel: 'child', latest: true, href: 'https://x/not-a-release/catalog.json' }] }), null);
  assert.equal(latestRelease(null), null);
});

test('buildingsTilesUrl', () => {
  assert.equal(buildingsTilesUrl('2026-08-19.0'), 'https://tiles.overturemaps.org/2026-08-19.0/buildings.pmtiles');
});

test('lonLatToTile matches the standard web-mercator tile scheme', () => {
  // Melbourne GPO at z14.
  assert.deepEqual(lonLatToTile(144.9631, -37.8136, 14), { x: 14789, y: 10053 });
  assert.deepEqual(lonLatToTile(0, 0, 1), { x: 1, y: 1 });
});

test('tilesCoveringBBox returns every tile a bbox touches, capped', () => {
  // A parcel sitting inside one tile.
  assert.deepEqual(tilesCoveringBBox([144.9630, -37.8137, 144.9632, -37.8135], 14), [{ z: 14, x: 14789, y: 10053 }]);
  // A bbox straddling a tile corner touches four tiles.
  const west = -180 + (14790 / 2 ** 14) * 360;
  const tiles = tilesCoveringBBox([west - 0.0001, -37.82, west + 0.0001, -37.81], 14);
  assert.ok(tiles.length >= 2 && tiles.length <= 4);
  // Anything spanning more than four ~2km tiles isn't a house block: skip it
  // rather than download hundreds of tiles.
  assert.deepEqual(tilesCoveringBBox([144.0, -38.5, 146.0, -37.0], 14), []);
});

test('lonLatToTilePixel places a point inside its tile extent', () => {
  const tile = lonLatToTile(144.9631, -37.8136, 14);
  const [px, py] = lonLatToTilePixel(144.9631, -37.8136, { z: 14, ...tile }, 4096);
  assert.ok(px >= 0 && px <= 4096 && py >= 0 && py <= 4096);
});

test('ringBBox and bboxesOverlap', () => {
  const box = ringBBox([[1, 2], [3, 2], [3, 5], [1, 5], [1, 2]]);
  assert.deepEqual(box, [1, 2, 3, 5]);
  assert.equal(bboxesOverlap(box, [2, 4, 9, 9]), true);
  assert.equal(bboxesOverlap(box, [3.1, 0, 9, 9]), false);
});

// Rings in lon/lat around Melbourne; 0.0001° is ~9m east-west, ~11m north-south here.
const LON = 145.0, LAT = -37.8;
const rect = (x1, y1, x2, y2) => [[LON + x1, LAT + y1], [LON + x2, LAT + y1], [LON + x2, LAT + y2], [LON + x1, LAT + y2], [LON + x1, LAT + y1]];
const inRect = ([lon, lat], [x1, y1, x2, y2]) => lon > LON + x1 && lon < LON + x2 && lat > LAT + y1 && lat < LAT + y2;

test('interiorPoint puts a square yard point near its middle', () => {
  // Square in metres (~35m each way): 0.0004° of longitude = 0.000318° of latitude here.
  const p = interiorPoint([rect(0, 0, 0.0004, 0.000318)]);
  assert.ok(Math.abs(p[0] - (LON + 0.0002)) < 0.00002 && Math.abs(p[1] - (LAT + 0.000159)) < 0.00002);
});

test('interiorPoint stays out of the house (a hole) in a donut-shaped yard', () => {
  const p = interiorPoint([rect(0, 0, 0.0006, 0.0006), rect(0.0002, 0.0002, 0.0004, 0.0004)]);
  assert.equal(inRect(p, [0.0002, 0.0002, 0.0004, 0.0004]), false);
  assert.equal(inRect(p, [0, 0, 0.0006, 0.0006]), true);
});

test('interiorPoint picks the open part of an L-shaped yard, not an edge', () => {
  // Wide back yard (0..0.0006 x 0..0.0004) plus a narrow side path up the right.
  const L = [[
    [LON, LAT], [LON + 0.0006, LAT], [LON + 0.0006, LAT + 0.0010], [LON + 0.0005, LAT + 0.0010],
    [LON + 0.0005, LAT + 0.0004], [LON, LAT + 0.0004], [LON, LAT]
  ]];
  const p = interiorPoint(L);
  assert.equal(inRect(p, [0.00005, 0.00005, 0.00055, 0.00035]), true);
});

test('keepBuildingPiece drops neighbours’ roof slivers but keeps shared terraces', () => {
  assert.equal(keepBuildingPiece({ clippedM2: 180, buildingM2: 190 }), true); // the house
  assert.equal(keepBuildingPiece({ clippedM2: 10, buildingM2: 260 }), false); // neighbour's eaves
  assert.equal(keepBuildingPiece({ clippedM2: 70, buildingM2: 420 }), true); // one house of a merged terrace row
  assert.equal(keepBuildingPiece({ clippedM2: 12, buildingM2: 14 }), true); // a small shed, all ours
  assert.equal(keepBuildingPiece({ clippedM2: 5, buildingM2: 5 }), false); // noise
});

test('summariseFootprint gives the yard left after the house', () => {
  assert.deepEqual(summariseFootprint({ blockAreaM2: 612.4, houseAreaM2: 245.2 }), { houseAreaM2: 245, yardAreaM2: 367, usable: true });
});

test('summariseFootprint is not usable without a real house or with almost no yard', () => {
  assert.equal(summariseFootprint({ blockAreaM2: 600, houseAreaM2: 0 }).usable, false);
  assert.equal(summariseFootprint({ blockAreaM2: 600, houseAreaM2: 8 }).usable, false);
  assert.equal(summariseFootprint({ blockAreaM2: 300, houseAreaM2: 296 }).usable, false);
  // Never reports a negative yard, even if footprint data overhangs the block.
  assert.equal(summariseFootprint({ blockAreaM2: 300, houseAreaM2: 320 }).yardAreaM2, 0);
});
