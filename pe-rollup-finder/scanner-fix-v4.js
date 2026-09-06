(() => {
  const endpoints = [
    'https://overpass.private.coffee/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter'
  ];

  function buildCategoryQuery(cfg, center, radiusKm) {
    const radius = Math.round(radiusKm * 1000);
    const clauses = [];
    cfg.filters.forEach(([key, value]) => {
      ['node', 'way', 'relation'].forEach(type => {
        clauses.push(`${type}["${key}"="${value}"](around:${radius},${center.lat},${center.lon});`);
      });
    });
    return `[out:json][timeout:15];(${clauses.join('')});out center tags;`;
  }

  async function requestOverpass(endpoint, query, timeoutMs = 18000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
          'Accept': 'application/json'
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } finally {
      clearTimeout(timer);
    }
  }

  function rowsFromElements(elements) {
    const rows = [];
    for (const e of elements || []) {
      const tags = e.tags || {};
      const center = e.center || {};
      const lat = e.lat ?? center.lat;
      const lon = e.lon ?? center.lon;
      if (lat == null || lon == null) continue;

      const name = (tags.name || tags.brand || tags.operator || 'Unnamed operator').trim();
      const address = [
        tags['addr:housenumber'], tags['addr:street'], tags['addr:city'],
        tags['addr:state'], tags['addr:postcode']
      ].filter(Boolean).join(' ');

      rows.push({
        id: `${e.type}-${e.id}`,
        name,
        lat: +lat,
        lon: +lon,
        address,
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
        tags
      });
    }
    return rows;
  }

  function renderProgressiveUniverse(dedupe, center, completed, total, failures) {
    cityUniverse = Array.from(dedupe.values());
    if (!cityUniverse.length) {
      statusEl.textContent = `Scanning ${center.shortLabel} — ${completed}/${total} categories checked…`;
      return;
    }

    rankMarkets();
    if (populateIndustryOptions()) {
      const selected = industryEl.value;
      const option = marketOptions.find(o => o.industry === selected);
      if (option) {
        currentIndustry = selected;
        currentData = option.rows;
        syncModelDefaults();
        render();
      }
    }

    const foundCategories = marketOptions.filter(o => o.count > 0).length;
    const suffix = failures ? ` · ${failures} source retry${failures === 1 ? '' : 'ies'}` : '';
    statusEl.className = 'status';
    statusEl.textContent = `Scanning ${center.shortLabel} — ${completed}/${total} categories checked · ${foundCategories} opportunities found${suffix}…`;
  }

  fetchUniverse = async function(center, radius) {
    const entries = Object.entries(INDUSTRIES);
    const dedupe = new Map();
    let cursor = 0;
    let completed = 0;
    let failures = 0;
    let successes = 0;

    async function scanCategory(index, name, cfg) {
      const query = buildCategoryQuery(cfg, center, radius);
      const orderedEndpoints = endpoints.map((_, offset) => endpoints[(index + offset) % endpoints.length]);
      let lastError = null;

      for (const endpoint of orderedEndpoints) {
        try {
          const data = await requestOverpass(endpoint, query);
          rowsFromElements(data.elements).forEach(row => dedupe.set(row.id, row));
          successes += 1;
          return;
        } catch (error) {
          lastError = error;
          failures += 1;
        }
      }
      console.warn(`Roll-up scan failed for ${name}`, lastError);
    }

    async function worker() {
      while (true) {
        const index = cursor++;
        if (index >= entries.length) return;
        const [name, cfg] = entries[index];
        await scanCategory(index, name, cfg);
        completed += 1;
        renderProgressiveUniverse(dedupe, center, completed, entries.length, failures);
      }
    }

    await Promise.all(Array.from({ length: 4 }, () => worker()));

    if (!successes) {
      throw new Error('All operator data sources timed out. Try a 10 km radius or scan again');
    }

    const rows = Array.from(dedupe.values());
    if (!rows.length) {
      throw new Error('The operator sources responded, but no mapped businesses were returned for these categories');
    }

    return rows;
  };
})();
