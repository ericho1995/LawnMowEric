// Pure helpers for the house-footprint lookup — no DOM, no network, no
// Turf. Shared by assets/js/footprint-lookup.mjs in the browser and
// tests/footprints.test.mjs under `node --test`.
//
// Footprints come from Overture Maps' buildings PMTiles (Microsoft ML
// building footprints + OpenStreetMap, ODbL). A new release is published
// roughly monthly and old ones are removed after a few months, so the
// current one is looked up from Overture's STAC catalog at runtime.

export const STAC_CATALOG_URL = 'https://stac.overturemaps.org/catalog.json';
export const TILE_ZOOM = 14; // the buildings tileset's max zoom
const MAX_TILES = 4;

export function latestRelease(catalog) {
  const links = (catalog && catalog.links) || [];
  const latest = links.find((l) => l.latest === true && typeof l.href === 'string');
  const match = latest && /\/(\d{4}-\d{2}-\d{2}\.\d+)\/catalog\.json$/.exec(latest.href);
  return match ? match[1] : null;
}

export function buildingsTilesUrl(release) {
  return 'https://tiles.overturemaps.org/' + release + '/buildings.pmtiles';
}

function tileFraction(lon, lat, z) {
  const n = 2 ** z;
  const r = (lat * Math.PI) / 180;
  return {
    x: ((lon + 180) / 360) * n,
    y: ((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * n
  };
}

export function lonLatToTile(lon, lat, z) {
  const f = tileFraction(lon, lat, z);
  return { x: Math.floor(f.x), y: Math.floor(f.y) };
}

// Every tile a [west, south, east, north] bbox touches, or [] if that's more
// than MAX_TILES (not a house block — don't download half the city).
export function tilesCoveringBBox(bbox, z) {
  const [w, s, e, n] = bbox;
  const topLeft = lonLatToTile(w, n, z);
  const bottomRight = lonLatToTile(e, s, z);
  const count = (bottomRight.x - topLeft.x + 1) * (bottomRight.y - topLeft.y + 1);
  if (count > MAX_TILES) return [];
  const tiles = [];
  for (let x = topLeft.x; x <= bottomRight.x; x++) {
    for (let y = topLeft.y; y <= bottomRight.y; y++) tiles.push({ z, x, y });
  }
  return tiles;
}

// Position of a point in a vector tile's own coordinate space (0..extent).
export function lonLatToTilePixel(lon, lat, tile, extent) {
  const f = tileFraction(lon, lat, tile.z);
  return [(f.x - tile.x) * extent, (f.y - tile.y) * extent];
}

export function ringBBox(ring) {
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
  for (const [x, y] of ring) {
    if (x < w) w = x;
    if (x > e) e = x;
    if (y < s) s = y;
    if (y > n) n = y;
  }
  return [w, s, e, n];
}

export function bboxesOverlap(a, b) {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

// Whether a building clipped to the block counts as "ours". Footprints are
// traced roofs, so a neighbour's eaves often poke a few m² over the
// boundary. Keep anything substantial (a house, or one house's share of a
// terrace row traced as a single shape), or small pieces that are mostly
// inside (a shed); drop small pieces of mostly-outside buildings.
export function keepBuildingPiece({ clippedM2, buildingM2 }) {
  if (clippedM2 < 8) return false;
  if (clippedM2 >= 25) return true;
  return buildingM2 > 0 && clippedM2 / buildingM2 >= 0.5;
}

// A point well inside a polygon ([outer, ...holes], lon/lat): approximately
// the spot furthest from any edge. Used to start the lawn box in open yard
// rather than on a boundary or a wall. Grid search with two refinements —
// plenty for a house block.
export function interiorPoint(rings) {
  const [lon0, lat0] = rings[0][0];
  const mx = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const my = 110574;
  const local = rings.map((ring) => ring.map(([lon, lat]) => [(lon - lon0) * mx, (lat - lat0) * my]));

  const insideRing = (x, y, ring) => {
    let c = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i], [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const inside = (x, y) => insideRing(x, y, local[0]) && !local.slice(1).some((h) => insideRing(x, y, h));
  const edgeDistance = (x, y) => {
    let best = Infinity;
    for (const ring of local) {
      for (let i = 0; i < ring.length - 1; i++) {
        const [ax, ay] = ring[i], [bx, by] = ring[i + 1];
        const dx = bx - ax, dy = by - ay;
        const t = dx || dy ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))) : 0;
        best = Math.min(best, Math.hypot(x - (ax + t * dx), y - (ay + t * dy)));
      }
    }
    return best;
  };

  let [minX, minY, maxX, maxY] = ringBBox(local[0]);
  let best = null;
  for (let pass = 0; pass < 3; pass++) {
    const steps = 20;
    const sx = (maxX - minX) / steps, sy = (maxY - minY) / steps;
    for (let i = 0; i < steps; i++) {
      for (let j = 0; j < steps; j++) {
        const x = minX + (i + 0.5) * sx, y = minY + (j + 0.5) * sy;
        if (!inside(x, y)) continue;
        const d = edgeDistance(x, y);
        if (!best || d > best.d) best = { x, y, d };
      }
    }
    if (!best) break;
    // Zoom the grid in around the best point so far.
    const hx = sx * 2, hy = sy * 2;
    [minX, minY, maxX, maxY] = [best.x - hx, best.y - hy, best.x + hx, best.y + hy];
  }
  if (!best) {
    const outer = rings[0].slice(0, -1);
    return [outer.reduce((s, p) => s + p[0], 0) / outer.length, outer.reduce((s, p) => s + p[1], 0) / outer.length];
  }
  return [lon0 + best.x / mx, lat0 + best.y / my];
}

// Yard = block minus the house. Not usable when there's no real building
// (under ~15m² is a shed or noise) or almost no yard left (units that cover
// their whole title) — the estimator then falls back to block percentages.
export function summariseFootprint({ blockAreaM2, houseAreaM2 }) {
  const house = Math.round(houseAreaM2);
  const yard = Math.max(0, Math.round(blockAreaM2 - houseAreaM2));
  return { houseAreaM2: house, yardAreaM2: yard, usable: house >= 15 && yard >= 10 };
}
