// Lawn-size estimator on quote.html (an ES module). Address search (OSM
// Nominatim) -> real block from Vicmap Property -> house footprints from
// Overture Maps, subtracted to get the yard -> "how much of it is lawn?"
// cards (block percentages when there's no footprint; typical sizes outside
// Victoria) -> an orange box on the map the customer can move, resize and
// rotate a full 360° (drag handle or slider), plus an optional nature-strip
// allowance. Fills the quote form's hidden
// area/estimate fields and lawn size on "Use this for my quote". Needs
// window.TLC_CONFIG (inlined by the build) and Leaflet + Turf loaded first.
import { findHouseFootprints, prefetchFootprints, warmUpFootprints } from './footprint-lookup.mjs';
import { boxCorners, resizeFromCorner, angleFromCenter, rotateHandlePoint, dominantAngle, snapAngle } from './box-geometry.mjs';

(function () {
  // ---- Pricing rules ----
  // Bands come from src/site.config.mjs (pricing.bands) via window.TLC_CONFIG,
  // the same source as every price table on the site. Covers a standard mow
  // only; anything past the last band is quote-on-request.
  const PRICING = { bands: window.TLC_CONFIG.pricing.bands };

  function computeEstimate(areaM2) {
    const band = PRICING.bands.find(function (b) { return areaM2 <= b.max; });
    if (!band) return { quoteOnRequest: true };
    return { low: band.low, high: band.high };
  }

  const mapContainer = document.getElementById('lawn-map');
  if (!mapContainer) return;

  const statusEl = document.getElementById('estimator-status');
  const resultEl = document.getElementById('estimator-result');
  const areaM2El = document.getElementById('estimator-area-m2');
  const areaSqftEl = document.getElementById('estimator-area-sqft');
  const priceEl = document.getElementById('estimator-price');
  const useBtn = document.getElementById('estimator-use');
  const addressInput = document.getElementById('lawn-address');
  const searchBtn = document.getElementById('lawn-address-search');
  const blockPicker = document.getElementById('size-pick-block');
  const fallbackPicker = document.getElementById('size-pick-fallback');
  const natureStripWrap = document.getElementById('nature-strip-toggle-wrap');
  const natureStripToggle = document.getElementById('nature-strip-toggle');
  const rotateControl = document.getElementById('box-rotate-control');
  const rotateSlider = document.getElementById('box-rotate');
  const rotateValue = document.getElementById('box-rotate-value');

  const DEFAULT_HINT = 'Search your address above first — we\'ll size the options to your actual block.';
  const SHAPE_COLOR = '#1E9F35'; // the real property boundary outline (reference only, not interactive)
  const BOX_COLOR = '#FF6A1A'; // the adjustable estimate box — a different color on purpose, so it's obvious which shape you can drag
  const NATURE_STRIP_M2 = 20; // typical council-verge allowance, added on top of the picked size

  // Free Mapbox account + public token gets noticeably sharper/deeper-zoom imagery
  // than Esri's free tier in most of Melbourne. Set mapboxToken in
  // src/site.config.mjs (the default public token, starting "pk."). Until then
  // this falls back to the Esri imagery silently.
  const MAPBOX_TOKEN = window.TLC_CONFIG.mapboxToken || '';
  const useMapbox = !!MAPBOX_TOKEN;
  const MAP_ZOOM = 20; // matches the live quote.html's zoom level — the pixelation was already present there at z20, capping to 19 just made the view less zoomed-in without actually fixing it

  const OVERTURE_FALLBACK_RELEASE = window.TLC_CONFIG.overtureRelease || '';
  const HOUSE_STYLE = { color: '#FFFFFF', weight: 1.5, fillColor: '#5B6470', fillOpacity: 0.6, interactive: false };

  let map = null;
  let parcelLayer = null;
  let houseLayer = null;
  let blockAreaM2 = 0;
  let yardAreaM2 = 0; // block minus house footprints; 0 when footprints weren't usable
  let searchSeq = 0; // ignore results from a search the customer has since replaced
  let currentAreaM2 = 0;
  let currentEstimate = null;
  let boxCenter = null; // {lat, lng} — where the resizable box gets placed
  let box = null; // { cx, cy, w, h, angle } in local metres — see box-geometry.mjs
  let boxOrigin = null; // { lat, lng } origin of the local metre frame
  let boxPoly = null;
  let boxHandles = [];
  let rotateHandle = null;
  let blockAngle = 0; // the block's main orientation, so the box starts square to the fences
  let boxManuallyAdjusted = false;

  function setStatus(text, state) {
    statusEl.textContent = text || DEFAULT_HINT;
    if (state) statusEl.dataset.state = state; else statusEl.removeAttribute('data-state');
  }

  function initMap() {
    if (map) return;
    map = L.map(mapContainer, { center: [-37.7700, 144.7750], zoom: 13 }); // starts over Deer Park and the service area

    if (useMapbox) {
      // satellite-streets-v12 bundles imagery + road/place labels in one layer,
      // same combined look as the Esri imagery+reference-labels pair below.
      L.tileLayer('https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/{z}/{x}/{y}@2x?access_token=' + MAPBOX_TOKEN, {
        maxZoom: 22,
        crossOrigin: true,
        attribution: '&copy; <a href="https://www.mapbox.com/about/maps/">Mapbox</a> &copy; <a href="https://www.digitalglobe.com/">DigitalGlobe</a>'
      }).addTo(map);
    } else {
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        // Matches the live quote.html exactly (maxZoom 20) — a Clarity-endpoint swap
        // and a maxZoom-19 cap were both tried here and both made things look worse,
        // not better. Reverted to the original known-good config.
        maxZoom: 20,
        crossOrigin: true,
        attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
      }).addTo(map);

      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 20,
        opacity: 0.9,
        crossOrigin: true
      }).addTo(map);
    }

    // Short on-map credits (a phone-width map has little room); the full
    // wording is in the note under the map.
    map.attributionControl.addAttribution('Blocks &copy; State of Victoria (DTP) CC BY 4.0');
    map.attributionControl.addAttribution('Buildings &copy; Overture Maps, OSM contributors ODbL');
    warmUpFootprints(OVERTURE_FALLBACK_RELEASE);
    // The rotate handle's distance is in pixels, so re-place it after zooming.
    map.on('zoomend', function () { if (box) syncBoxLayers(); });
  }

  // ---- The lawn box: move, resize and rotate 360° (plain Leaflet, no drawing library) ----
  // The box lives in local metres around `boxOrigin` (see box-geometry.mjs), so
  // rotation is plain trigonometry; it's only converted to lat/lng for drawing.
  const MY = 110574; // metres per degree of latitude
  function mx() { return 111320 * Math.cos(boxOrigin.lat * Math.PI / 180); }
  function toLocal(ll) { return { x: (ll.lng - boxOrigin.lng) * mx(), y: (ll.lat - boxOrigin.lat) * MY }; }
  function toLatLng(p) { return L.latLng(boxOrigin.lat + p.y / MY, boxOrigin.lng + p.x / mx()); }

  // The rotate handle floats a fixed ~34px above the box at any zoom level.
  function handleOffsetM() {
    const metresPerPx = 156543.03392 * Math.cos(boxOrigin.lat * Math.PI / 180) / Math.pow(2, map.getZoom());
    return 34 * metresPerPx;
  }

  function boxAreaM2() { return box ? box.w * box.h : 0; }

  function syncBoxLayers(skip) {
    const c = boxCorners(box);
    boxPoly.setLatLngs([c.nw, c.ne, c.se, c.sw].map(toLatLng));
    boxHandles.forEach(function (m) { if (m !== skip) m.setLatLng(toLatLng(c[m._cornerKey])); });
    if (rotateHandle && rotateHandle !== skip) rotateHandle.setLatLng(toLatLng(rotateHandlePoint(box, handleOffsetM())));
    rotateSlider.value = String(Math.round(box.angle) % 360);
    rotateValue.textContent = Math.round(box.angle) % 360 + '°';
  }

  function onHandleDrag(key, marker) {
    box = resizeFromCorner(box, key, toLocal(marker.getLatLng()));
    syncBoxLayers(marker);
    boxManuallyAdjusted = true;
    const area = boxAreaM2();
    showResult(area);
    setStatus('Box resized — ' + Math.round(area) + 'm² now selected. Use it below, or pick a different option.', 'ok');
  }

  // Dragging the handle snaps gently to the block's axes (easy to line up with
  // fences); the slider is for exact angles, so it never snaps.
  function setAngle(angle, skip, snap) {
    box.angle = snap ? snapAngle(angle, blockAngle) : angle;
    syncBoxLayers(skip);
    setStatus('Box rotated to ' + Math.round(box.angle) % 360 + '°. The size stays the same — drag a corner to resize.', 'ok');
  }

  // Whole-box drag-to-move: Leaflet vector shapes can't be dragged, so track
  // the pointer from mousedown on the box, move its centre by the pointer's
  // delta, and pause map panning so the map doesn't slide underneath.
  function onBoxMoveStart(e) {
    L.DomEvent.stopPropagation(e);
    map.dragging.disable();
    const start = toLocal(e.latlng);
    const startCentre = { cx: box.cx, cy: box.cy };

    function onMove(ev) {
      const p = toLocal(ev.latlng);
      box.cx = startCentre.cx + (p.x - start.x);
      box.cy = startCentre.cy + (p.y - start.y);
      syncBoxLayers();
    }
    function onEnd() {
      map.off('mousemove', onMove);
      map.off('mouseup', onEnd);
      map.dragging.enable();
      boxManuallyAdjusted = true;
      const area = boxAreaM2();
      showResult(area);
      setStatus('Box moved — ' + Math.round(area) + 'm² selected. Use it below, or pick a different option.', 'ok');
    }
    map.on('mousemove', onMove);
    map.on('mouseup', onEnd);
  }

  function clearBox() {
    if (boxPoly) { map.removeLayer(boxPoly); boxPoly = null; }
    boxHandles.forEach(function (m) { map.removeLayer(m); });
    boxHandles = [];
    if (rotateHandle) { map.removeLayer(rotateHandle); rotateHandle = null; }
    box = null;
    rotateControl.hidden = true;
  }

  // A square of `areaM2` centred on (centerLat, centerLng). Keeps the
  // customer's rotation if they've already turned the box; otherwise starts
  // lined up with the block.
  function placeBox(centerLat, centerLng, areaM2) {
    const keepAngle = box ? box.angle : blockAngle;
    boxOrigin = { lat: centerLat, lng: centerLng };
    const side = Math.sqrt(Math.max(areaM2, 1));
    box = { cx: 0, cy: 0, w: side, h: side, angle: keepAngle };
    const corners = boxCorners(box);

    if (!boxPoly) {
      boxPoly = L.polygon([corners.nw, corners.ne, corners.se, corners.sw].map(toLatLng), {
        color: BOX_COLOR, weight: 3, fillOpacity: 0.22, dashArray: '6,4', className: 'estimate-box'
      }).addTo(map);
      boxPoly.on('mousedown', onBoxMoveStart);

      const handleIcon = L.divIcon({ className: 'box-handle', iconSize: [28, 28], iconAnchor: [14, 14] });
      ['nw', 'ne', 'se', 'sw'].forEach(function (key) {
        const marker = L.marker(toLatLng(corners[key]), { icon: handleIcon, draggable: true, zIndexOffset: 1000, keyboard: false, title: 'Drag to resize' }).addTo(map);
        marker._cornerKey = key;
        marker.on('drag', function () { onHandleDrag(key, marker); });
        marker.on('dragend', function () { syncBoxLayers(); }); // snap onto the (clamped) corner
        boxHandles.push(marker);
      });

      const rotateIcon = L.divIcon({ className: 'box-rotate-handle', iconSize: [32, 32], iconAnchor: [16, 16], html: '<span aria-hidden="true">&#x21bb;</span>' });
      rotateHandle = L.marker(toLatLng(rotateHandlePoint(box, handleOffsetM())), { icon: rotateIcon, draggable: true, zIndexOffset: 1100, keyboard: false, title: 'Drag to rotate' }).addTo(map);
      rotateHandle.on('drag', function () { setAngle(angleFromCenter(box, toLocal(rotateHandle.getLatLng())), rotateHandle, true); });
      rotateHandle.on('dragend', function () { syncBoxLayers(); });
    }
    syncBoxLayers();
    rotateControl.hidden = false;

    // The customer needs to see the whole box (and its handles) to adjust it.
    const view = boxPoly.getBounds().pad(0.25);
    if (!map.getBounds().contains(view)) {
      map.fitBounds(parcelLayer ? parcelLayer.getBounds().extend(view) : view, { padding: [24, 24], maxZoom: MAP_ZOOM });
    }
  }

  function clearPickers() {
    blockPicker.hidden = true;
    fallbackPicker.hidden = true;
    natureStripWrap.hidden = true;
    natureStripToggle.checked = false;
    Array.prototype.forEach.call(blockPicker.children, function (btn) { btn.classList.remove('active'); });
    Array.prototype.forEach.call(fallbackPicker.children, function (btn) { btn.classList.remove('active'); });
    resultEl.classList.remove('visible');
    currentEstimate = null;
    currentAreaM2 = 0;
    boxManuallyAdjusted = false;
    yardAreaM2 = 0;
    if (houseLayer) { map.removeLayer(houseLayer); houseLayer = null; }
    if (map) clearBox();
  }

  // Each block card has two shares: of the yard (used when house footprints
  // were found) and of the whole block (the fallback). The yard shares keep
  // the original block percentages' calibration, which assumed a house of
  // roughly 40% of the block — now the real house is subtracted instead.
  function cardArea(btn) {
    return yardAreaM2
      ? yardAreaM2 * parseFloat(btn.dataset.yard)
      : blockAreaM2 * parseFloat(btn.dataset.pct);
  }

  function refreshCardLabels() {
    Array.prototype.forEach.call(blockPicker.children, function (btn) {
      btn.querySelector('.size-pick-sub').textContent = 'About ' + Math.round(cardArea(btn)) + 'm²';
    });
  }

  function showResult(areaM2) {
    currentAreaM2 = areaM2;
    currentEstimate = computeEstimate(areaM2);
    areaM2El.textContent = areaM2.toFixed(0);
    areaSqftEl.textContent = (areaM2 * 10.7639).toFixed(0);
    priceEl.textContent = currentEstimate.quoteOnRequest
      ? 'Quote on request'
      : '$' + currentEstimate.low + '–$' + currentEstimate.high;
    resultEl.classList.add('visible');
  }

  function selectCard(container, btn) {
    Array.prototype.forEach.call(container.children, function (b) { b.classList.remove('active'); });
    btn.classList.add('active');
  }

  function applySelection(baseAreaM2) {
    boxManuallyAdjusted = false;
    const area = baseAreaM2 + (natureStripToggle.checked ? NATURE_STRIP_M2 : 0);
    showResult(area);
    if (boxCenter) placeBox(boxCenter.lat, boxCenter.lng, area);
    setStatus('Estimate updated — drag the box on the map to fine-tune, or pick a different option.', 'ok');
  }

  blockPicker.addEventListener('click', function (e) {
    const btn = e.target.closest('.size-pick-card');
    if (!btn || !blockAreaM2) return;
    selectCard(blockPicker, btn);
    natureStripToggle.checked = (btn === blockPicker.children[0]); // "Just the front yard" — nature strip almost always applies
    applySelection(cardArea(btn));
  });

  fallbackPicker.addEventListener('click', function (e) {
    const btn = e.target.closest('.size-pick-card');
    if (!btn) return;
    selectCard(fallbackPicker, btn);
    applySelection(parseFloat(btn.dataset.area));
  });

  rotateSlider.addEventListener('input', function () {
    if (box) setAngle(Number(rotateSlider.value), null, false);
  });

  // The block's main orientation, from its longest boundary (local metres).
  function blockOrientation(parcel) {
    const g = parcel.geometry;
    const ring = g.type === 'Polygon' ? g.coordinates[0] : g.coordinates[0][0];
    const lat0 = ring[0][1], lng0 = ring[0][0];
    const m = 111320 * Math.cos(lat0 * Math.PI / 180);
    return dominantAngle(ring.map(function (p) { return { x: (p[0] - lng0) * m, y: (p[1] - lat0) * MY }; }));
  }

  natureStripToggle.addEventListener('change', function () {
    // If the box has been hand-resized, keep that shape/number — just add or remove the
    // nature-strip allowance from it, instead of snapping back to the card's base %.
    if (boxManuallyAdjusted) {
      const adjusted = currentAreaM2 + (natureStripToggle.checked ? NATURE_STRIP_M2 : -NATURE_STRIP_M2);
      showResult(Math.max(adjusted, 1));
      setStatus((natureStripToggle.checked ? 'Added' : 'Removed') + ' the nature-strip allowance — ' + Math.round(currentAreaM2) + 'm² now selected.', 'ok');
      return;
    }
    const activeBlock = blockPicker.querySelector('.size-pick-card.active');
    const activeFallback = fallbackPicker.querySelector('.size-pick-card.active');
    if (activeBlock && blockAreaM2) { applySelection(cardArea(activeBlock)); return; }
    if (activeFallback) { applySelection(parseFloat(activeFallback.dataset.area)); }
  });

  function pickSizeBand(areaM2) {
    if (areaM2 < 150) return 'Small courtyard (under 150m²)';
    if (areaM2 <= 400) return 'Medium yard (150–400m²)';
    if (areaM2 <= 800) return 'Large block (400–800m²)';
    return 'Extra-large (800m²+)';
  }

  useBtn.addEventListener('click', function () {
    if (!currentEstimate || currentAreaM2 < 1) return;
    document.getElementById('q-area-m2').value = currentAreaM2.toFixed(1);
    document.getElementById('q-estimate-low').value = currentEstimate.quoteOnRequest ? '' : currentEstimate.low;
    document.getElementById('q-estimate-high').value = currentEstimate.quoteOnRequest ? '' : currentEstimate.high;
    document.getElementById('q-size').value = pickSizeBand(currentAreaM2);
    const suburbInput = document.getElementById('q-suburb');
    if (!suburbInput.value && addressInput.value) suburbInput.value = addressInput.value;
    setStatus('Added to your quote request below.', 'ok');
    document.getElementById('quote-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  const PARCEL_API = 'https://services-ap1.arcgis.com/P744lA0wf4LlBZ84/ArcGIS/rest/services/Vicmap_Property/FeatureServer/0/query';

  async function fetchParcelBoundary(lat, lon) {
    const url = PARCEL_API + '?geometry=' + lon + ',' + lat +
      '&geometryType=esriGeometryPoint&inSR=4326&spatialRel=esriSpatialRelIntersects' +
      '&outFields=OBJECTID&returnGeometry=true&outSR=4326&f=geojson';
    const controller = new AbortController();
    const timeout = setTimeout(function () { controller.abort(); }, 6000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (!data.features || !data.features.length) return null;
      return data.features[0];
    } catch (err) {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function goToAddress(lat, lon) {
    const seq = ++searchSeq;
    initMap();
    clearPickers();
    blockAreaM2 = 0;
    blockAngle = 0;
    boxCenter = { lat: lat, lng: lon };
    if (parcelLayer) { map.removeLayer(parcelLayer); parcelLayer = null; }
    map.setView([lat, lon], MAP_ZOOM);
    setStatus('Found it — looking up your block and house…', 'ok');
    prefetchFootprints(lon, lat, OVERTURE_FALLBACK_RELEASE);

    const parcel = await fetchParcelBoundary(lat, lon);
    if (seq !== searchSeq) return;
    if (parcel) {
      blockAreaM2 = turf.area(parcel);
      blockAngle = blockOrientation(parcel);
      parcelLayer = L.geoJSON(parcel, { style: { color: SHAPE_COLOR, weight: 3, fillOpacity: 0.12 } }).addTo(map);
      // Show the whole block (the lawn box may start in the back yard), but
      // never zoom in past the usual sharp imagery level.
      map.fitBounds(parcelLayer.getBounds(), { padding: [24, 24], maxZoom: MAP_ZOOM });
      try {
        const centroid = turf.centroid(parcel).geometry.coordinates;
        boxCenter = { lat: centroid[1], lng: centroid[0] };
      } catch (e) { /* keep the address point as center */ }

      const footprint = await findHouseFootprints(parcel, { fallbackRelease: OVERTURE_FALLBACK_RELEASE });
      if (seq !== searchSeq) return;
      if (footprint && footprint.usable) {
        yardAreaM2 = footprint.yardAreaM2;
        houseLayer = L.geoJSON(turf.featureCollection(footprint.buildings), { style: HOUSE_STYLE, interactive: false }).addTo(map);
        if (footprint.yardAnchor) boxCenter = { lat: footprint.yardAnchor[1], lng: footprint.yardAnchor[0] };
        setStatus('Your block is about ' + Math.round(blockAreaM2) + 'm² and the house covers about ' +
          footprint.houseAreaM2 + 'm², leaving about ' + footprint.yardAreaM2 + 'm² of yard. How much of it is lawn?', 'ok');
      } else {
        setStatus('Your block is about ' + Math.round(blockAreaM2) + 'm² — how much of it is lawn?', 'ok');
      }
      refreshCardLabels();
      blockPicker.hidden = false;
      natureStripWrap.hidden = false;
    } else {
      fallbackPicker.hidden = false;
      natureStripWrap.hidden = false;
      setStatus('Couldn\'t look up an exact block size for this address — pick the closest size below.', 'ok');
    }
  }

  async function searchAddress() {
    const query = addressInput.value.trim();
    if (!query) return;
    closeSuggestions();
    setStatus('Searching…');
    searchBtn.disabled = true;
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=au&q=' + encodeURIComponent(query);
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error('search failed');
      const results = await res.json();
      if (!results.length) {
        setStatus('Could not find that address — try adding suburb and state.', 'error');
        return;
      }
      goToAddress(parseFloat(results[0].lat), parseFloat(results[0].lon));
    } catch (err) {
      initMap();
      setStatus('Address search is unavailable right now — pick a typical size below instead.', 'error');
      fallbackPicker.hidden = false;
      natureStripWrap.hidden = false;
    } finally {
      searchBtn.disabled = false;
    }
  }

  const suggestionsEl = document.getElementById('address-suggestions');
  let suggestDebounce = null;
  let suggestQueryId = 0;
  let currentSuggestions = [];
  let activeSuggestion = -1;

  function closeSuggestions() {
    suggestionsEl.innerHTML = '';
    currentSuggestions = [];
    activeSuggestion = -1;
    addressInput.setAttribute('aria-expanded', 'false');
  }

  function updateActiveSuggestion(items) {
    items.forEach(function (item, i) { item.classList.toggle('active', i === activeSuggestion); });
    if (activeSuggestion >= 0 && items[activeSuggestion]) items[activeSuggestion].scrollIntoView({ block: 'nearest' });
  }

  function selectSuggestion(result) {
    addressInput.value = result.display_name;
    closeSuggestions();
    goToAddress(parseFloat(result.lat), parseFloat(result.lon));
  }

  function renderSuggestions(results) {
    suggestionsEl.innerHTML = '';
    activeSuggestion = -1;
    results.forEach(function (result) {
      const item = document.createElement('div');
      item.className = 'address-suggestion';
      item.setAttribute('role', 'option');
      item.textContent = result.display_name;
      item.addEventListener('mousedown', function (e) { e.preventDefault(); selectSuggestion(result); });
      suggestionsEl.appendChild(item);
    });
    addressInput.setAttribute('aria-expanded', results.length ? 'true' : 'false');
  }

  async function fetchSuggestions(query) {
    const queryId = ++suggestQueryId;
    try {
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&countrycodes=au&q=' + encodeURIComponent(query);
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!res.ok) return;
      const results = await res.json();
      if (queryId !== suggestQueryId) return;
      currentSuggestions = results;
      renderSuggestions(results);
    } catch (err) { /* silent */ }
  }

  addressInput.addEventListener('input', function () {
    clearTimeout(suggestDebounce);
    const query = addressInput.value.trim();
    if (query.length < 3) { closeSuggestions(); return; }
    suggestDebounce = setTimeout(function () { fetchSuggestions(query); }, 400);
  });

  addressInput.addEventListener('keydown', function (e) {
    const items = suggestionsEl.querySelectorAll('.address-suggestion');
    if (e.key === 'ArrowDown' && items.length) {
      e.preventDefault();
      activeSuggestion = Math.min(activeSuggestion + 1, items.length - 1);
      updateActiveSuggestion(items);
    } else if (e.key === 'ArrowUp' && items.length) {
      e.preventDefault();
      activeSuggestion = Math.max(activeSuggestion - 1, 0);
      updateActiveSuggestion(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeSuggestion >= 0 && currentSuggestions[activeSuggestion]) {
        selectSuggestion(currentSuggestions[activeSuggestion]);
      } else {
        searchAddress();
      }
    } else if (e.key === 'Escape') {
      closeSuggestions();
    }
  });

  document.addEventListener('click', function (e) {
    if (!e.target.closest('.estimator-search')) closeSuggestions();
  });

  searchBtn.addEventListener('click', searchAddress);

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { initMap(); observer.disconnect(); }
      });
    }, { rootMargin: '200px' });
    observer.observe(mapContainer);
  } else {
    initMap();
  }
})();
