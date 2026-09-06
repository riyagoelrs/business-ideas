(() => {
  const rationaleEl = document.getElementById('city-rationale-text');
  if (!rationaleEl) return;

  function pct(n) {
    return `${Math.round(n)}%`;
  }

  function strengthLabel(score) {
    if (score >= 75) return 'a strong roll-up screen';
    if (score >= 60) return 'a promising roll-up screen';
    if (score >= 45) return 'a selective roll-up opportunity';
    return 'an early / thinner roll-up screen';
  }

  function mainDriver(q) {
    if (q.fragmentation >= 75 && q.density >= 60) return 'fragmented ownership plus strong local operator density';
    if (q.fragmentation >= 75) return 'a highly fragmented ownership base';
    if (q.density >= 70) return 'dense local operator coverage';
    if (q.scale >= 70) return 'a deep target universe';
    return 'the breadth of mapped local operators';
  }

  function mainCaveat(q, rows) {
    if (q.fragmentation < 55) return 'ownership appears more consolidated / branded, which may reduce tuck-in availability';
    if (q.density < 35) return 'operator density is relatively low, which may weaken route and integration synergies';
    if (q.scale < 35 || rows.length < 8) return 'the mapped target pool is still relatively thin';
    return 'the next question is dealability: owner willingness, valuation, labor, and customer concentration';
  }

  function updateCityRationale() {
    if (!currentCenter || !Array.isArray(marketOptions) || !marketOptions.length) {
      rationaleEl.textContent = 'Scan a market to generate a data-driven investment rationale.';
      return;
    }

    const ranked = marketOptions.filter(o => o.count > 0).slice().sort((a,b) => b.score - a.score || b.count - a.count);
    if (!ranked.length) {
      rationaleEl.textContent = `${currentCenter.shortLabel} does not yet have enough mapped operator data to form a useful roll-up thesis.`;
      return;
    }

    const best = ranked[0];
    const q = marketScore(best.rows, currentRadius);
    const independentPct = best.count ? best.independent / best.count * 100 : 0;
    const topTargets = best.rows.filter(r => ['A','A+'].includes(r.target_tier)).length;
    const alternates = ranked.slice(1,3).map(o => `${o.industry} (${Math.round(o.score)}/100)`).join(' and ');

    let text = `${currentCenter.shortLabel} currently looks like ${strengthLabel(best.score)}. ` +
      `${best.industry} is the strongest mapped category with ${best.count} operators, ${pct(independentPct)} likely independent, and ${topTargets} A/A+ targets. ` +
      `The main appeal is ${mainDriver(q)}; the main caveat is that ${mainCaveat(q, best.rows)}.`;

    if (alternates) text += ` Other categories worth screening are ${alternates}.`;

    if (currentIndustry && currentIndustry !== best.industry) {
      const selected = ranked.find(o => o.industry === currentIndustry);
      if (selected) text += ` Current view: ${currentIndustry} has ${selected.count} mapped operators and scores ${Math.round(selected.score)}/100.`;
    }

    text += ' This is a sourcing heuristic based on mapped public business data, not full investment diligence.';
    rationaleEl.textContent = text;
  }

  const originalRender = render;
  render = function(...args) {
    const result = originalRender.apply(this, args);
    updateCityRationale();
    return result;
  };

  const originalClear = clearMarketView;
  clearMarketView = function(...args) {
    const result = originalClear.apply(this, args);
    rationaleEl.textContent = 'Scan a market to generate a data-driven investment rationale.';
    return result;
  };

  updateCityRationale();
})();
