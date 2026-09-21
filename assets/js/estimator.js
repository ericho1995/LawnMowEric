// Lawn-size estimator on quote.html (an ES module). Address search (OSM
// Nominatim) -> real block from Vicmap Property -> house footprints from
// Overture Maps, subtracted to get the yard -> "how much of it is lawn?"
// cards (block percentages when there's no footprint; typical sizes outside
// Victoria) -> an orange box on the map the customer can move and resize,
// plus an optional nature-strip allowance. Fills the quote form's hidden
// area/estimate fields and lawn size on "Use this for my quote". Needs
// window.TLC_CONFIG (inlined by the build) and Leaflet + Turf loaded first.
import { findHouseFootprints, prefetchFootprints, warmUpFootprints } from './footprint-lookup.mjs';

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
  let boxBounds = null; // {n, s, e, w}
  let boxRect = null;
  let boxHandles = [];
  let boxManuallyAdjusted = false;

  function setStatus(text, state) {
    statusEl.textContent = text || DEFAULT_HINT;
    if (state) statusEl.dataset.state = state; else statusEl.removeAttribute('data-state');
  }

  function initMap() {
    if (map) return;
    map = L.map(mapContainer, { center: [-37.8136, 144.9631], zoom: 13 });

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
  }

  // ---- Resizable estimate box (plain Leaflet corner-drag handles — no drawing library) ----
  function metersToLatLngDelta(lat, metersNS, metersEW) {
    return {
      dLat: metersNS / 111320,
      dLng: metersEW / (111320 * Math.cos(lat * Math.PI / 180))
    };
  }

  function boxCorners() {
    return {
      nw: [boxBounds.n, boxBounds.w], ne: [boxBounds.n, boxBounds.e],
      se: [boxBounds.s, boxBounds.e], sw: [boxBounds.s, boxBounds.w]
    };
  }

  function boxAreaM2() {
    if (!boxBounds) return 0;
    const ring = [
      [boxBounds.w, boxBounds.n], [boxBounds.e, boxBounds.n],
      [boxBounds.e, boxBounds.s], [boxBounds.w, boxBounds.s], [boxBounds.w, boxBounds.n]
    ];
    try { return turf.area({ type: 'Polygon', coordinates: [ring] }); } catch (e) { return 0; }
  }

  function syncBoxLayers() {
    boxRect.setBounds([[boxBounds.s, boxBounds.w], [boxBounds.n, boxBounds.e]]);
    const corners = boxCorners();
    boxHandles.forEach(function (m) { m.setLatLng(corners[m._cornerKey]); });
  }

  function onHandleDrag(key, marker) {
    const ll = marker.getLatLng();
    if (key === 'nw') { boxBounds.n = ll.lat; boxBounds.w = ll.lng; }
    if (key === 'ne') { boxBounds.n = ll.lat; boxBounds.e = ll.lng; }
    if (key === 'se') { boxBounds.s = ll.lat; boxBounds.e = ll.lng; }
    if (key === 'sw') { boxBounds.s = ll.lat; boxBounds.w = ll.lng; }
    boxRect.setBounds([[boxBounds.s, boxBounds.w], [boxBounds.n, boxBounds.e]]);
    const corners = boxCorners();
    boxHandles.forEach(function (m) { if (m._cornerKey !== key) m.setLatLng(corners[m._cornerKey]); });
    boxManuallyAdjusted = true;
    const area = boxAreaM2();
    showResult(area);
    setStatus('Box resized — ' + Math.round(area) + 'm² now selected. Use it below, or pick a different option.', 'ok');
  }

  // Whole-box drag-to-move: L.Rectangle has no built-in drag support (that's marker-only
  // in core Leaflet), so this is done by hand — track the pointer from mousedown on the
  // rectangle itself, translate boxBounds by the pointer's delta, and disable map panning
  // for the duration so dragging the box doesn't also drag the map underneath it.
  function onBoxMoveStart(e) {
    L.DomEvent.stopPropagation(e);
    map.dragging.disable();
    const start = e.latlng;
    const startBounds = { n: boxBounds.n, s: boxBounds.s, e: boxBounds.e, w: boxBounds.w };

    function onMove(ev) {
      const dLat = ev.latlng.lat - start.lat;
      const dLng = ev.latlng.lng - start.lng;
      boxBounds = {
        n: startBounds.n + dLat, s: startBounds.s + dLat,
        e: startBounds.e + dLng, w: startBounds.w + dLng
      };
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
    if (boxRect) { map.removeLayer(boxRect); boxRect = null; }
    boxHandles.forEach(function (m) { map.removeLayer(m); });
    boxHandles = [];
    boxBounds = null;
  }

  function placeBox(centerLat, centerLng, areaM2) {
    const side = Math.sqrt(Math.max(areaM2, 1));
    const { dLat, dLng } = metersToLatLngDelta(centerLat, side / 2, side / 2);
    boxBounds = { n: centerLat + dLat, s: centerLat - dLat, e: centerLng + dLng, w: centerLng - dLng };
    const bounds = [[boxBounds.s, boxBounds.w], [boxBounds.n, boxBounds.e]];
    if (!boxRect) {
      boxRect = L.rectangle(bounds, { color: BOX_COLOR, weight: 3, fillOpacity: 0.22, dashArray: '6,4', className: 'estimate-box' }).addTo(map);
      boxRect.on('mousedown', onBoxMoveStart);
    } else {
      boxRect.setBounds(bounds);
    }
    const corners = boxCorners();
    const handleIcon = L.divIcon({ className: 'box-handle', iconSize: [26, 26], iconAnchor: [13, 13] });
    if (!boxHandles.length) {
      ['nw', 'ne', 'se', 'sw'].forEach(function (key) {
        const marker = L.marker(corners[key], { icon: handleIcon, draggable: true, zIndexOffset: 1000 }).addTo(map);
        marker._cornerKey = key;
        marker.on('drag', function () { onHandleDrag(key, marker); });
        boxHandles.push(marker);
      });
    } else {
      boxHandles.forEach(function (m) { m.setLatLng(corners[m._cornerKey]); });
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
    boxCenter = { lat: lat, lng: lon };
    if (parcelLayer) { map.removeLayer(parcelLayer); parcelLayer = null; }
    map.setView([lat, lon], MAP_ZOOM);
    setStatus('Found it — looking up your block and house…', 'ok');
    prefetchFootprints(lon, lat, OVERTURE_FALLBACK_RELEASE);

    const parcel = await fetchParcelBoundary(lat, lon);
    if (seq !== searchSeq) return;
    if (parcel) {
      blockAreaM2 = turf.area(parcel);
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
