// Lawn-size estimator on quote.html: address search (OSM Nominatim),
// satellite imagery (Esri), property boundary lookup (Vicmap Property),
// drawing/editing (Leaflet.draw) and geodesic area (Turf). Fills the quote
// form's hidden area/estimate fields and lawn size when the customer
// clicks "Use this for my quote". Needs window.TLC_CONFIG (inlined by the
// build) and Leaflet, Leaflet.draw and Turf loaded first.
(function () {
  // ---- Pricing rules ----
  // Bands come from src/site.config.mjs (pricing.bands) via window.TLC_CONFIG,
  // the same source as every price table on the site. Covers a standard mow
  // only; edging, hedging, green waste and access surcharges are quoted
  // separately. Anything past the last band is quote-on-request.
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
  const polygonBtn = document.getElementById('draw-polygon-btn');
  const rectBtn = document.getElementById('draw-rect-btn');
  const editBtn = document.getElementById('draw-edit-btn');
  const undoBtn = document.getElementById('draw-undo-btn');
  const clearBtn = document.getElementById('draw-clear-btn');

  const DEFAULT_HINT = 'Easiest: draw a box over your lawn, then drag its corners with "Adjust shape" until it fits. Use "Trace a shape" if your lawn isn\'t box-shaped.';
  const MIN_DRAW_ZOOM = 18;
  const SHAPE_COLOR = '#C98A2B';

  let map = null;
  let drawnItems = null;
  let polygonHandler = null;
  let rectangleHandler = null;
  let editHandler = null;
  let activeHandler = null;
  let isEditing = false;
  let currentAreaM2 = 0;
  let currentEstimate = null;

  function setStatus(text, state) {
    statusEl.textContent = text || DEFAULT_HINT;
    if (state) statusEl.dataset.state = state; else statusEl.removeAttribute('data-state');
  }

  function bindRemovePopup(layer) {
    const wrap = document.createElement('div');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-ghost';
    btn.style.cssText = 'padding:6px 12px;font-size:0.8rem;';
    btn.textContent = 'Remove this shape';
    btn.addEventListener('click', function () {
      drawnItems.removeLayer(layer);
      map.closePopup();
      recalcArea();
      updateEditAvailability();
    });
    wrap.appendChild(btn);
    layer.bindPopup(wrap);
  }

  function setDrawingState(isDrawing) {
    polygonBtn.classList.toggle('active', isDrawing && activeHandler === polygonHandler);
    rectBtn.classList.toggle('active', isDrawing && activeHandler === rectangleHandler);
    undoBtn.disabled = !(isDrawing && activeHandler === polygonHandler);
    polygonBtn.disabled = isEditing;
    rectBtn.disabled = isEditing;
    if (!isDrawing) activeHandler = null;
  }

  function ensureCloseZoom() {
    if (map.getZoom() < MIN_DRAW_ZOOM) {
      map.setZoom(19);
      setStatus('Zoomed in closer first, for a more accurate result.', 'ok');
    }
  }

  function updateEditAvailability() {
    if (isEditing) return;
    editBtn.disabled = !drawnItems || drawnItems.getLayers().length === 0;
  }

  function initMap() {
    if (map) return;
    map = L.map(mapContainer, { center: [-37.8136, 144.9631], zoom: 13 });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      crossOrigin: true,
      attribution: 'Imagery &copy; Esri, Maxar, Earthstar Geographics'
    }).addTo(map);

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 20,
      opacity: 0.9,
      crossOrigin: true
    }).addTo(map);

    drawnItems = new L.FeatureGroup();
    map.addLayer(drawnItems);

    polygonHandler = new L.Draw.Polygon(map, {
      allowIntersection: false,
      showArea: true,
      metric: true,
      shapeOptions: { color: SHAPE_COLOR, weight: 3 }
    });
    rectangleHandler = new L.Draw.Rectangle(map, {
      showArea: true,
      metric: true,
      shapeOptions: { color: SHAPE_COLOR, weight: 3 }
    });
    editHandler = new L.EditToolbar.Edit(map, {
      featureGroup: drawnItems,
      selectedPathOptions: {
        color: SHAPE_COLOR, weight: 4, dashArray: '8,6',
        maintainColor: true
      }
    });

    map.on(L.Draw.Event.CREATED, function (e) {
      bindRemovePopup(e.layer);
      drawnItems.addLayer(e.layer);
      recalcArea();
      updateEditAvailability();
    });
    map.on(L.Draw.Event.DRAWSTART, function () { setDrawingState(true); });
    map.on(L.Draw.Event.DRAWSTOP, function () { setDrawingState(false); });
    map.on(L.Draw.Event.EDITED, function () {
      recalcArea();
      setStatus('Shape updated — check the estimate below.', 'ok');
    });
  }

  function exitEditMode(save) {
    if (!isEditing) return;
    isEditing = false;
    if (save) editHandler.save(); else editHandler.revertLayers();
    editHandler.disable();
    editBtn.classList.remove('active');
    editBtn.textContent = 'Adjust shape';
    setDrawingState(false);
    updateEditAvailability();
  }

  editBtn.addEventListener('click', function () {
    initMap();
    if (!isEditing) {
      if (activeHandler) { activeHandler.disable(); }
      isEditing = true;
      editHandler.enable();
      editBtn.classList.add('active');
      editBtn.textContent = 'Done adjusting';
      polygonBtn.disabled = true;
      rectBtn.disabled = true;
      setStatus('Drag the corner handles to reshape it, then click "Done adjusting".', 'ok');
    } else {
      exitEditMode(true);
    }
  });

  polygonBtn.addEventListener('click', function () {
    initMap();
    exitEditMode(true);
    if (activeHandler) activeHandler.disable();
    ensureCloseZoom();
    activeHandler = polygonHandler;
    polygonHandler.enable();
    setStatus('Click points around the edge of your lawn — click the first point again (or double-click) to close the shape.');
  });

  rectBtn.addEventListener('click', function () {
    initMap();
    exitEditMode(true);
    if (activeHandler) activeHandler.disable();
    ensureCloseZoom();
    activeHandler = rectangleHandler;
    rectangleHandler.enable();
    setStatus('Click and drag a box over your lawn.');
  });

  undoBtn.addEventListener('click', function () {
    if (activeHandler === polygonHandler) {
      try { polygonHandler.deleteLastVertex(); } catch (e) { /* nothing to undo */ }
    }
  });

  clearBtn.addEventListener('click', function () {
    exitEditMode(false);
    if (drawnItems) drawnItems.clearLayers();
    recalcArea();
    updateEditAvailability();
  });

  function recalcArea() {
    let totalM2 = 0;
    let shapeCount = 0;
    if (drawnItems) {
      drawnItems.eachLayer(function (layer) {
        shapeCount++;
        try { totalM2 += turf.area(layer.toGeoJSON()); } catch (e) { /* skip malformed shape */ }
      });
    }
    currentAreaM2 = totalM2;
    clearBtn.disabled = shapeCount === 0;

    if (totalM2 < 1) {
      resultEl.classList.remove('visible');
      currentEstimate = null;
      setStatus();
      return;
    }

    currentEstimate = computeEstimate(totalM2);

    areaM2El.textContent = totalM2.toFixed(0);
    areaSqftEl.textContent = (totalM2 * 10.7639).toFixed(0);
    priceEl.textContent = currentEstimate.quoteOnRequest
      ? 'Quote on request'
      : '$' + currentEstimate.low + '–$' + currentEstimate.high;
    resultEl.classList.add('visible');
    setStatus('Shape captured — trace more area, or use this estimate below.', 'ok');
  }

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

  // Victoria's own government cadastre (Vicmap Property, via a public,
  // key-less, CORS-open ArcGIS FeatureServer) — the actual surveyed parcel
  // boundary for a point, not a guess. Melbourne-only (matches current
  // service area); silently falls back to manual drawing outside Victoria
  // or if the service is unreachable.
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
    initMap();
    exitEditMode(false);
    if (activeHandler) { activeHandler.disable(); activeHandler = null; setDrawingState(false); }
    if (drawnItems) drawnItems.clearLayers();
    recalcArea();
    updateEditAvailability();
    map.setView([lat, lon], 20);
    setStatus('Found it — looking up the property boundary…', 'ok');

    const parcel = await fetchParcelBoundary(lat, lon);
    if (parcel) {
      const gj = L.geoJSON(parcel, { style: { color: SHAPE_COLOR, weight: 3, fillOpacity: 0.15 } });
      gj.eachLayer(function (layer) {
        bindRemovePopup(layer);
        drawnItems.addLayer(layer);
      });
      recalcArea();
      updateEditAvailability();
      setStatus('Found your property boundary — drag its edges with "Adjust shape" to trim it down to just the lawn (exclude the house, driveway and garden beds).', 'ok');
    } else {
      setStatus('Found the address — draw a box over your lawn, or trace it for an irregular shape.', 'ok');
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
      setStatus('Address search is unavailable right now — pan and zoom the map manually instead.', 'error');
    } finally {
      searchBtn.disabled = false;
    }
  }

  // ---- Address autocomplete (debounced Nominatim lookup, dropdown of suggestions) ----
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
      // mousedown (not click) fires before the input's blur handler would close the dropdown.
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
      if (queryId !== suggestQueryId) return; // a newer keystroke has since fired — drop this stale response
      currentSuggestions = results;
      renderSuggestions(results);
    } catch (err) { /* silent - Find address / Enter still work without suggestions */ }
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

  // Lazy-init: don't pull map tiles until the estimator scrolls into view.
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
