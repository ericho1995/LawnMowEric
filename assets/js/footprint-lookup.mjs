// House footprints for the quote page's lawn estimator.
//
// Reads Overture Maps' buildings PMTiles straight from tiles.overturemaps.org
// (CORS-open, range requests), decodes the vector tile around the address and
// clips each building to the Vicmap block, so the yard is block minus house.
// Libraries load from jsDelivr only when someone actually searches.
//
// Every failure (library, catalog, tile, geometry, timeout) resolves to null
// so the estimator quietly falls back to block percentages.
//
// Needs the global `turf` (loaded by the page before this module runs).

import {
  STAC_CATALOG_URL, TILE_ZOOM, latestRelease, buildingsTilesUrl, lonLatToTile,
  tilesCoveringBBox, lonLatToTilePixel, bboxesOverlap, summariseFootprint,
  keepBuildingPiece, interiorPoint
} from './footprints.mjs';

// Pinned versions: these are the exact builds the lookup was tested with.
const LIBS = {
  pmtiles: 'https://cdn.jsdelivr.net/npm/pmtiles@4.5.0/+esm',
  vectorTile: 'https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@3.0.0/+esm',
  pbf: 'https://cdn.jsdelivr.net/npm/pbf@4.0.2/+esm'
};
function retryable(factory) {
  let promise = null;
  return function () {
    if (!promise) {
      promise = factory.apply(null, arguments);
      promise.catch(() => { promise = null; });
    }
    return promise;
  };
}

const loadLibs = retryable(() =>
  Promise.all([import(LIBS.pmtiles), import(LIBS.vectorTile), import(LIBS.pbf)])
    .then(([pm, vt, pbf]) => ({ PMTiles: pm.PMTiles, VectorTile: vt.VectorTile, Pbf: pbf.default })));

async function resolveRelease(fallbackRelease) {
  try {
    const res = await fetch(STAC_CATALOG_URL);
    if (res.ok) {
      const release = latestRelease(await res.json());
      if (release) return release;
    }
  } catch (err) { /* fall through to the pinned release */ }
  if (fallbackRelease) return fallbackRelease;
  throw new Error('No Overture release available');
}

const openArchive = retryable((fallbackRelease) =>
  Promise.all([loadLibs(), resolveRelease(fallbackRelease)])
    .then(([libs, release]) => new libs.PMTiles(buildingsTilesUrl(release))));

const tileCache = new Map();
function loadBuildingLayer(tile, fallbackRelease) {
  const key = tile.z + '/' + tile.x + '/' + tile.y;
  if (!tileCache.has(key)) {
    const promise = Promise.all([openArchive(fallbackRelease), loadLibs()]).then(async ([archive, libs]) => {
      const res = await archive.getZxy(tile.z, tile.x, tile.y);
      if (!res || !res.data) return null;
      return new libs.VectorTile(new libs.Pbf(new Uint8Array(res.data))).layers.building || null;
    });
    promise.catch(() => tileCache.delete(key));
    tileCache.set(key, promise);
  }
  return tileCache.get(key);
}

// Resolve the release, load the libraries and read the archive header ahead
// of time (called when the map first appears).
export function warmUpFootprints(fallbackRelease) {
  openArchive(fallbackRelease).then((archive) => archive.getHeader()).catch(() => {});
}

// Start downloading the tile around an address while the block lookup runs.
export function prefetchFootprints(lon, lat, fallbackRelease) {
  const t = lonLatToTile(lon, lat, TILE_ZOOM);
  loadBuildingLayer({ z: TILE_ZOOM, x: t.x, y: t.y }, fallbackRelease).catch(() => {});
}

async function lookup(parcel, fallbackRelease) {
  const bbox = turf.bbox(parcel);
  const tiles = tilesCoveringBBox(bbox, TILE_ZOOM);
  if (!tiles.length) return null;
  const layers = await Promise.all(tiles.map((t) => loadBuildingLayer(t, fallbackRelease)));

  // A building crossing a tile edge appears in both tiles; merge its pieces by id.
  const byId = new Map();
  tiles.forEach((tile, i) => {
    const layer = layers[i];
    if (!layer) return;
    const nw = lonLatToTilePixel(bbox[0], bbox[3], tile, layer.extent);
    const se = lonLatToTilePixel(bbox[2], bbox[1], tile, layer.extent);
    const parcelBox = [nw[0], nw[1], se[0], se[1]];
    for (let f = 0; f < layer.length; f++) {
      const feature = layer.feature(f);
      if (!bboxesOverlap(feature.bbox(), parcelBox)) continue;
      const building = feature.toGeoJSON(tile.x, tile.y, tile.z);
      let piece = null;
      try { piece = turf.intersect(turf.featureCollection([parcel, building])); } catch (err) { continue; }
      if (!piece) continue;
      const id = (building.properties && building.properties.id) || tile.x + '/' + tile.y + '/' + f;
      const existing = byId.get(id);
      if (existing) {
        try { piece = turf.union(turf.featureCollection([existing.piece, piece])) || existing.piece; } catch (err) { piece = existing.piece; }
      }
      byId.set(id, { piece, buildingM2: Math.max(turf.area(building), existing ? existing.buildingM2 : 0) });
    }
  });

  const buildings = [...byId.values()]
    .filter((b) => keepBuildingPiece({ clippedM2: turf.area(b.piece), buildingM2: b.buildingM2 }))
    .map((b) => b.piece);
  const houseAreaM2 = buildings.reduce((sum, b) => sum + turf.area(b), 0);
  const summary = summariseFootprint({ blockAreaM2: turf.area(parcel), houseAreaM2 });

  // Where to start the estimate box: inside the biggest open part of the
  // yard, instead of the block's centre (which is usually the roof).
  let yardAnchor = null;
  if (buildings.length) {
    try {
      const yard = turf.difference(turf.featureCollection([parcel, ...buildings]));
      if (yard) {
        const pieces = turf.flatten(yard).features.sort((a, b) => turf.area(b) - turf.area(a));
        yardAnchor = interiorPoint(pieces[0].geometry.coordinates);
      }
    } catch (err) { /* keep null — the caller uses the block centre */ }
  }
  return { buildings, yardAnchor, ...summary };
}

// Buildings on `parcel` (a GeoJSON Feature from Vicmap), clipped to it, plus
// house/yard areas. Resolves to null if footprints can't be used.
export async function findHouseFootprints(parcel, { fallbackRelease, timeoutMs = 8000 } = {}) {
  const timeout = new Promise((resolve) => setTimeout(() => resolve(null), timeoutMs));
  try {
    return await Promise.race([lookup(parcel, fallbackRelease), timeout]);
  } catch (err) {
    return null;
  }
}
