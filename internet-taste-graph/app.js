const CATEGORIES = {
  brand: { label: "Brands", color: "#d8678f" },
  place: { label: "Places", color: "#60816a" },
  creator: { label: "Creators", color: "#7e63a7" },
  media: { label: "Media", color: "#5b72d8" },
  product: { label: "Products", color: "#b38433" },
  aesthetic: { label: "Aesthetics", color: "#4c8b8d" },
  restaurant: { label: "Restaurants", color: "#b65042" }
};

const ENTITIES = [
  ["Bode","brand",["craft","heritage","new york","textile","menswear","editorial","nostalgia"],"Quilted storytelling, antique textiles and downtown New York craft culture."],
  ["The Row","brand",["quiet luxury","minimal","fashion","new york","design","editorial"],"Extreme restraint, material quality and status without logos."],
  ["Paloma Wool","brand",["barcelona","fashion","editorial","mediterranean","art","women","color"],"Barcelona fashion label operating like an art project and image world."],
  ["Gimaguas","brand",["barcelona","fashion","mediterranean","youth","color","travel"],"Mediterranean fashion with beach-city energy and internet-native styling."],
  ["Lemaire","brand",["paris","minimal","fashion","design","quiet luxury"],"Soft utility, thoughtful proportions and cultured Paris restraint."],
  ["Auralee","brand",["tokyo","minimal","fashion","textile","quiet luxury"],"Japanese material obsession with understated silhouette and color."],
  ["Aime Leon Dore","brand",["new york","heritage","menswear","streetwear","nostalgia","coffee","basketball"],"New York nostalgia filtered through sport, cafés and aspirational heritage."],
  ["Miu Miu","brand",["fashion","women","youth","editorial","internet","playful"],"Intellectual playfulness with a hyper-online fashion audience."],
  ["Tekla","brand",["design","home","minimal","copenhagen","color","editorial"],"Domestic basics made culturally legible through color, styling and photography."],
  ["Studio Nicholson","brand",["minimal","london","fashion","design","quiet luxury"],"Architectural wardrobe basics with British-Japanese restraint."],
  ["Jacquemus","brand",["mediterranean","fashion","france","sun","editorial","playful"],"A cinematic Mediterranean universe built around sun, landscape and scale."],
  ["Ralph Lauren","brand",["heritage","americana","fashion","equestrian","nostalgia","luxury"],"A complete American lifestyle fantasy built from heritage codes."],
  ["Dimes","restaurant",["new york","downtown","wellness","design","fashion","healthy","internet"],"A downtown Manhattan restaurant that became shorthand for a whole creative micro-scene."],
  ["Via Carota","restaurant",["new york","west village","italian","heritage","design","food"],"West Village Italian warmth where simplicity carries social signal."],
  ["Cafe Cecilia","restaurant",["london","food","design","fashion","editorial","east london"],"East London cooking with a fashion-editorial crowd and stripped-back visual language."],
  ["La Buvette","restaurant",["paris","wine","food","natural wine","casual","design"],"Tiny Paris wine bar energy: informal, high taste, almost anti-luxury."],
  ["Cafe Gitane","restaurant",["new york","downtown","nostalgia","fashion","cafe"],"A long-running downtown café with enduring fashion-world mythology."],
  ["Kissaten","restaurant",["tokyo","coffee","analog","jazz","nostalgia","quiet"],"Old-school Japanese listening cafés built on ritual, sound and analog atmosphere."],
  ["Mexico City","place",["mexico","design","architecture","food","art","color","travel"],"A dense collision of modernism, food, craft and contemporary creative culture."],
  ["Barcelona","place",["spain","mediterranean","design","fashion","architecture","travel"],"Mediterranean creative city where art, fashion and everyday life blur together."],
  ["Mallorca","place",["spain","mediterranean","travel","design","slow","sun"],"Island design culture that mixes rustic materiality with new creative hospitality."],
  ["Tokyo","place",["japan","design","fashion","food","analog","retail","travel"],"A city of extreme specificity: retail ritual, subculture, design and obsessive craft."],
  ["Copenhagen","place",["denmark","design","food","fashion","minimal","cycling"],"Design-forward city where everyday utility and high taste sit unusually close."],
  ["Marseille","place",["france","mediterranean","design","sun","port","travel"],"Rough-edged Mediterranean city with growing fashion and creative gravity."],
  ["London","place",["uk","fashion","media","food","design","music"],"A cultural crossroad where publishing, fashion, restaurants and music constantly overlap."],
  ["Laila Gohar","creator",["food","design","fashion","new york","art","surreal"],"Turns food and tables into playful editorial objects and social sculpture."],
  ["Leandra Medine","creator",["fashion","new york","writing","internet","women","editorial"],"Fashion commentary built around strong personal taste rather than polished aspiration."],
  ["Juergen Teller","creator",["photography","fashion","editorial","raw","analog","art"],"Anti-glamour fashion photography whose imperfection became its own status code."],
  ["Sofia Coppola","creator",["film","fashion","women","nostalgia","quiet","editorial"],"Soft-focus worlds of girlhood, privilege, melancholy and immaculate objects."],
  ["Wes Anderson","creator",["film","design","color","nostalgia","symmetry","travel"],"Hyper-composed nostalgic worlds that turn hotels, uniforms and objects into characters."],
  ["Apartamento","media",["magazine","design","home","editorial","casual","global"],"Interiors without perfection: lived-in homes, creative people and intimate photography."],
  ["The Face","media",["magazine","fashion","music","youth","london","editorial"],"Fashion and youth culture publishing with strong image-making DNA."],
  ["MUBI","media",["film","cinema","editorial","global","art","design"],"Film curation as taste identity, supported by a highly designed editorial world."],
  ["Letterboxd","media",["film","internet","community","youth","taste","social"],"A social network where film logging doubles as personality and cultural signaling."],
  ["Monocle","media",["magazine","travel","design","business","global","quiet luxury"],"Global design and travel taste packaged through systems, cities and objects."],
  ["Casa Bosques","media",["mexico city","books","design","art","editorial","retail"],"Mexico City art-book shop with a precise visual and publishing point of view."],
  ["Tenderbooks","media",["london","books","fashion","art","editorial","design"],"Small London bookshop indexing the overlap of fashion, art and niche publishing."],
  ["Film photography","aesthetic",["analog","photography","nostalgia","imperfection","travel","editorial"],"A slower image language where grain and limitation make pictures feel more intentional."],
  ["Natural wine","aesthetic",["wine","food","design","casual","creative","anti-luxury"],"A taste ecosystem connecting restaurants, labels, ceramics, farming and creative scenes."],
  ["Quiet luxury","aesthetic",["minimal","luxury","materials","fashion","design","status"],"Status expressed through material, cut and insider recognition rather than logos."],
  ["Indie sleaze","aesthetic",["nightlife","fashion","music","photography","2000s","raw","internet"],"Flash photography, nightlife and intentionally messy pre-algorithm internet energy."],
  ["Analog internet","aesthetic",["analog","internet","nostalgia","editorial","objects","media"],"The paradox of using digital culture to fetishize physical media, tactility and slowness."],
  ["Post-luxury","aesthetic",["luxury","anti-luxury","design","status","culture","casual"],"High cultural capital where provenance and taste replace obvious expense."],
  ["New heritage","aesthetic",["heritage","nostalgia","menswear","americana","craft","modern"],"Historic codes repackaged for younger audiences through design and storytelling."],
  ["Mediterranean modernism","aesthetic",["mediterranean","architecture","sun","design","travel","minimal"],"Warm modernism built from stone, color, shade and relaxed geometry."],
  ["Point-and-shoot cameras","product",["photography","analog","nostalgia","compact","travel","internet"],"Small cameras prized for immediacy, imperfect flash and low-friction memory making."],
  ["Contax T2","product",["photography","analog","fashion","luxury","compact","editorial"],"A premium compact film camera that became an object of fashion-world taste."],
  ["Vintage Porsche","product",["cars","heritage","design","status","analog","nostalgia"],"Machine-as-object: mechanical charm, timeless proportions and enthusiast credibility."],
  ["Modernist ceramics","product",["design","home","craft","food","art","objects"],"Useful objects that signal material sensitivity without looking decorative for decoration's sake."],
  ["Portuguese tinned fish","product",["food","design","packaging","heritage","travel","objects"],"Everyday pantry product elevated by graphic design, ritual and travel nostalgia."],
  ["Hotel stationery","product",["travel","design","paper","nostalgia","hotel","objects"],"Ephemeral branded objects that turn a trip into a physical archive."],
  ["Olive oil culture","product",["food","mediterranean","design","packaging","wellness","status"],"A pantry staple becoming an aesthetic product category through origin and packaging."],
  ["Mahjong revival","aesthetic",["game","heritage","community","design","diaspora","social"],"A heritage social ritual being reinterpreted through younger communities, design and identity."],
  ["Listening bars","aesthetic",["music","bar","analog","jazz","design","nightlife"],"High-intent social spaces where the sound system and listening ritual are the product."],
  ["Jazz","media",["music","analog","heritage","new york","listening","nightlife"],"Improvisational music culture that carries deep venue, fashion and collecting subcultures."],
  ["Matcha","product",["drink","japan","wellness","design","ritual","internet"],"A drink whose ritual, color and café design make it unusually legible online."],
  ["Hotel Corazón","place",["mallorca","hotel","mediterranean","design","art","travel"],"Mallorca hospitality merging art residency, rural landscape and slow design."],
  ["Dover Street Market","place",["retail","fashion","london","tokyo","art","design"],"Retail as cultural curation rather than inventory, mixing luxury, streetwear and installation."],
  ["Cibone","place",["tokyo","retail","design","objects","fashion","home"],"Tokyo design retail where objects, fashion and interiors share one curatorial system."],
  ["Erewhon","place",["los angeles","wellness","food","status","internet","consumer"],"A grocery store that functions as a status surface for wellness and consumer culture."],
  ["Soho House","place",["hospitality","creative","status","global","design","community"],"Membership hospitality that packaged creative-industry belonging as a repeatable environment."],
  ["Aesop","brand",["beauty","design","retail","architecture","minimal","global"],"A retail system where store architecture and language became as important as the product."],
  ["Byredo","brand",["beauty","fashion","design","minimal","editorial","luxury"],"Fragrance brand built through art direction, culture and visual minimalism."],
  ["Our Legacy","brand",["fashion","menswear","stockholm","subculture","design","minimal"],"Scandinavian menswear balancing clean design with subcultural references and worn-in texture."],
  ["Kapital","brand",["japan","fashion","craft","heritage","textile","maximal"],"Japanese craft label mixing Americana, repair, folk techniques and deliberate excess."],
  ["Noma Projects","brand",["copenhagen","food","design","fermentation","product","editorial"],"Restaurant R&D translated into packaged products with unusually strong cultural credibility."],
  ["Gohar World","brand",["food","fashion","objects","surreal","design","new york"],"Table objects and rituals treated with the energy of a fashion collection."],
  ["Comme des Garçons","brand",["fashion","tokyo","avant garde","design","art","retail"],"Fashion as an intellectual system spanning clothing, retail, publishing and collaboration."],
  ["Khaite","brand",["fashion","new york","luxury","women","minimal","editorial"],"New York luxury that pairs polish with downtown severity."],
  ["Cecilie Bahnsen","brand",["fashion","copenhagen","women","romantic","craft","editorial"],"Romantic volume and craft balanced by modern styling and Scandinavian clarity."],
  ["Kinfolk","media",["magazine","minimal","design","lifestyle","photography","copenhagen"],"A highly recognizable slow-living visual language that shaped a decade of internet minimalism."],
  ["032c","media",["magazine","berlin","fashion","art","internet","youth"],"Berlin magazine blending fashion, art, theory and subculture with sharp creative direction."],
  ["PIN–UP","media",["magazine","architecture","design","fashion","editorial","new york"],"Architecture magazine with fashion-world wit, personality and visual experimentation."],
  ["The Gentlewoman","media",["magazine","women","fashion","editorial","design","london"],"Long-form portraits of women with disciplined typography and understated fashion intelligence."],
  ["Loewe","brand",["fashion","craft","art","spain","luxury","design"],"Luxury driven by craft, art-world intelligence and surreal product storytelling."],
  ["Acne Studios","brand",["fashion","stockholm","art","minimal","editorial","design"],"Scandinavian fashion mixing restraint with unexpected image-making and subculture."],
  ["Martine Rose","brand",["fashion","london","menswear","subculture","music","youth"],"London fashion built from club culture, masculinity and off-kilter proportions."],
  ["Café de Flore","restaurant",["paris","cafe","heritage","literature","fashion","tourism"],"Historic Paris café whose mythology is as important as the coffee."],
  ["Bar Pisellino","restaurant",["new york","west village","italian","design","aperitivo","heritage"],"Tiny West Village bar translating Italian aperitivo culture into a highly legible New York scene."],
  ["Le Dauphin","restaurant",["paris","restaurant","design","wine","minimal","nightlife"],"Paris dining where marble minimalism, wine culture and late-night fashion energy meet."],
  ["Contramar","restaurant",["mexico city","seafood","design","fashion","food","travel"],"Mexico City institution where food, sunlight and cultural crowd create durable social signal."],
  ["Casa Barragán","place",["mexico city","architecture","color","modernism","design","travel"],"Luis Barragán's house: saturated color, shadow and emotional modernism."],
  ["Fondazione Prada","place",["milan","art","fashion","architecture","design","travel"],"Fashion capital turned into an art-and-architecture institution with its own destination gravity."],
  ["Villa Noailles","place",["france","architecture","fashion","art","mediterranean","design"],"Modernist villa linking architecture, art, fashion and the Mediterranean avant-garde."],
  ["Dia Beacon","place",["new york","art","architecture","minimal","travel","industrial"],"Industrial-scale minimal art pilgrimage with a strong design and day-trip audience."],
  ["Disposable camera","product",["photography","analog","party","nostalgia","travel","imperfection"],"Low-stakes analog photography that rewards spontaneity over image optimization."],
  ["Zine culture","aesthetic",["publishing","diy","art","youth","analog","subculture"],"Small-run publishing that turns niche scenes into tangible cultural artifacts."],
  ["Running clubs","aesthetic",["wellness","social","community","fashion","city","consumer"],"Fitness communities increasingly functioning as social clubs and brand distribution channels."],
  ["Perfume collecting","aesthetic",["beauty","objects","luxury","niche","ritual","identity"],"Identity through invisible objects: niche fragrance as taste, memory and insider knowledge."],
  ["Bookstore tourism","aesthetic",["books","travel","design","city","editorial","ritual"],"Using independent bookstores as anchors for discovering a city's cultural ecosystem."],
  ["Hotel bars","aesthetic",["hotel","nightlife","travel","design","status","nostalgia"],"Anonymous glamour, ritual and transient social scenes inside designed hospitality spaces."],
  ["Corner stores","aesthetic",["retail","city","food","everyday","nostalgia","design"],"Everyday retail as neighborhood culture, increasingly reinterpreted through branding and curation."]
].map((d, i) => ({ id: i + 1, name: d[0], category: d[1], tags: d[2], description: d[3] }));

const state = {
  seedText: "Bode, The Row, Dimes, Mexico City, film photography",
  distance: 2,
  enabledCategories: new Set(Object.keys(CATEGORIES)),
  center: null,
  nodes: [],
  links: [],
  simulation: null
};

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const normalize = (s) => s.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
const tokens = (s) => new Set(normalize(s).split(" ").filter(Boolean));
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function similarity(a, b) {
  const A = new Set(a), B = new Set(b);
  let overlap = 0;
  A.forEach(x => { if (B.has(x)) overlap += 1; });
  return overlap / Math.max(1, Math.sqrt(A.size * B.size));
}

function entitySeedScore(entity, seedParts) {
  const hay = `${entity.name} ${entity.tags.join(" ")}`;
  let score = 0;
  seedParts.forEach(part => {
    const p = normalize(part);
    const pTokens = tokens(p);
    const nameNorm = normalize(entity.name);
    if (nameNorm === p) score += 10;
    else if (nameNorm.includes(p) || p.includes(nameNorm)) score += 7;
    const tagScore = [...pTokens].reduce((acc, t) => acc + (hay.toLowerCase().includes(t) ? 1 : 0), 0);
    score += tagScore * 1.4;
  });
  return score;
}

function profileFromSeeds(seedParts) {
  const joined = normalize(seedParts.join(" "));
  const seedTokenSet = tokens(joined);
  const affinities = ENTITIES
    .map(e => ({ e, score: entitySeedScore(e, seedParts) }))
    .sort((a,b) => b.score - a.score)
    .slice(0, 12);
  const tagCounts = {};
  affinities.forEach(({e, score}) => e.tags.forEach(tag => { tagCounts[tag] = (tagCounts[tag] || 0) + Math.max(.5, score); }));
  seedTokenSet.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 4; });
  const topTags = Object.entries(tagCounts).sort((a,b) => b[1]-a[1]).slice(0, 7).map(([tag]) => tag);

  const nameRules = [
    [["analog","photography","nostalgia"],"Analog Internet"],
    [["mediterranean","barcelona","mallorca"],"Mediterranean Editorial"],
    [["heritage","new york","menswear"],"New Heritage"],
    [["minimal","luxury","design"],"Post-Luxury Minimalist"],
    [["film","internet","youth"],"Cultured Internet"],
    [["food","design","travel"],"Global Tastemaker"],
    [["fashion","art","editorial"],"Editorial Collector"]
  ];
  const profileName = nameRules.sort((a,b) => {
    const sa = a[0].filter(t => topTags.includes(t)).length;
    const sb = b[0].filter(t => topTags.includes(t)).length;
    return sb - sa;
  })[0][1];

  const dims = {
    Editorial: calcDim(["editorial","magazine","photography","fashion"], topTags, tagCounts),
    Nostalgic: calcDim(["nostalgia","analog","heritage","film"], topTags, tagCounts),
    Global: calcDim(["travel","global","tokyo","mexico","mediterranean","london","paris"], topTags, tagCounts),
    "Design-led": calcDim(["design","architecture","art","objects"], topTags, tagCounts),
    "Insider": calcDim(["subculture","anti-luxury","niche","craft","quiet luxury"], topTags, tagCounts)
  };

  return { topTags, profileName, dims };
}

function calcDim(tags, topTags, counts) {
  const raw = tags.reduce((sum,t) => sum + (counts[t] || 0), 0);
  const topBonus = tags.filter(t => topTags.includes(t)).length * 12;
  return clamp(Math.round(44 + raw * 1.25 + topBonus), 46, 96);
}

function buildGraph() {
  const seedParts = state.seedText.split(",").map(s => s.trim()).filter(Boolean);
  const profile = profileFromSeeds(seedParts);
  renderProfile(profile);

  const scored = ENTITIES.map(e => {
    const direct = entitySeedScore(e, seedParts);
    const tagAffinity = similarity(e.tags, profile.topTags);
    const named = seedParts.some(p => normalize(p) === normalize(e.name));
    const fit = direct * 1.8 + tagAffinity * 10 + (named ? 14 : 0);
    return { ...e, fit, named };
  }).sort((a,b) => b.fit - a.fit);

  const directMatches = scored.filter(x => x.named || x.fit >= 7).slice(0, 8);
  const anchorTags = new Set(profile.topTags);

  let candidates = scored.filter(x => !directMatches.some(d => d.id === x.id)).map(e => {
    const semantic = similarity(e.tags, [...anchorTags]);
    const bridge = directMatches.length ? Math.max(...directMatches.map(d => similarity(e.tags, d.tags))) : semantic;
    const novelty = 1 - Math.min(1, e.fit / 20);
    const targetNovelty = (state.distance - 1) / 2;
    const distancePenalty = Math.abs(novelty - targetNovelty);
    const discovery = semantic * 5 + bridge * 4 + e.fit * .25 - distancePenalty * 2.4;
    return { ...e, semantic, bridge, novelty, discovery };
  });

  candidates = candidates
    .filter(e => state.enabledCategories.has(e.category))
    .sort((a,b) => b.discovery - a.discovery);

  const targetCount = state.distance === 1 ? 18 : state.distance === 2 ? 26 : 32;
  const perCategory = {};
  const chosen = [];
  candidates.forEach(e => {
    const limit = state.distance === 3 ? 6 : 5;
    if (chosen.length >= targetCount) return;
    if ((perCategory[e.category] || 0) >= limit) return;
    if (e.discovery < .8 && chosen.length > 12) return;
    perCategory[e.category] = (perCategory[e.category] || 0) + 1;
    chosen.push(e);
  });

  const center = { id: "center", name: "YOUR TASTE", category: "center", tags: profile.topTags, description: `A ${profile.profileName.toLowerCase()} cluster generated from your starting signals.`, center: true, fit: 20, novelty: 0 };
  const nodes = [center, ...directMatches.filter(e => state.enabledCategories.has(e.category)).slice(0,5), ...chosen];
  const uniqueNodes = [...new Map(nodes.map(n => [n.id, n])).values()];

  const links = [];
  uniqueNodes.filter(n => n.id !== "center").forEach(n => {
    const s = similarity(n.tags, profile.topTags);
    if (s > .18 || n.named) links.push({ source: "center", target: n.id, strength: s + (n.named ? .4 : 0) });
  });

  for (let i=1; i<uniqueNodes.length; i++) {
    const peers = uniqueNodes.slice(1).filter(n => n.id !== uniqueNodes[i].id)
      .map(n => ({ n, s: similarity(uniqueNodes[i].tags, n.tags) }))
      .filter(x => x.s > .27)
      .sort((a,b) => b.s-a.s)
      .slice(0, state.distance === 3 ? 2 : 1);
    peers.forEach(({n,s}) => {
      const keyA = String(uniqueNodes[i].id), keyB = String(n.id);
      if (!links.some(l => [String(l.source.id || l.source), String(l.target.id || l.target)].sort().join("-") === [keyA,keyB].sort().join("-"))) {
        links.push({ source: uniqueNodes[i].id, target: n.id, strength: s });
      }
    });
  }

  state.nodes = uniqueNodes;
  state.links = links;
  state.center = center;
  renderGraph();
  renderDiscovery(profile);
  inspectNode(center);
}

function renderProfile(profile) {
  $("#profileName").textContent = profile.profileName;
  $("#profileSummary").textContent = `Your strongest signals: ${profile.topTags.slice(0,5).join(", ")}.`;
  $("#dnaBars").innerHTML = Object.entries(profile.dims).map(([name,value]) => `
    <div class="dna-item"><span>${name}</span><div class="dna-track"><div class="dna-fill" style="width:${value}%"></div></div><strong>${value}</strong></div>
  `).join("");
}

function renderFilters() {
  const counts = Object.keys(CATEGORIES).reduce((acc,k) => ({...acc,[k]:ENTITIES.filter(e=>e.category===k).length}),{});
  $("#categoryFilters").innerHTML = Object.entries(CATEGORIES).map(([key,c]) => `
    <button class="filter-button" type="button" data-category="${key}">
      <span><i class="swatch" style="background:${c.color}"></i>${c.label}</span><span class="count">${counts[key]}</span>
    </button>`).join("");
  $("#graphKey").innerHTML = Object.entries(CATEGORIES).slice(0,4).map(([key,c]) => `<span><i class="swatch" style="width:5px;height:5px;border-radius:50%;background:${c.color}"></i>${c.label}</span>`).join("");
}

function renderGraph() {
  const host = $("#graph");
  host.innerHTML = "";
  const width = host.clientWidth || 720;
  const height = host.clientHeight || 720;

  const svg = d3.select(host).append("svg").attr("viewBox", [0,0,width,height]);
  const root = svg.append("g");
  svg.call(d3.zoom().scaleExtent([.55,2.8]).on("zoom", e => root.attr("transform", e.transform)));

  const link = root.append("g").selectAll("line").data(state.links).join("line")
    .attr("class","link").attr("stroke-opacity", d => .25 + d.strength * .55);

  const node = root.append("g").selectAll("g").data(state.nodes, d=>d.id).join("g")
    .attr("class", d => `node ${d.center ? "center" : ""}`)
    .style("cursor","pointer")
    .on("click", (_,d) => {
      inspectNode(d);
      if (!d.center) recenterOn(d);
    })
    .call(d3.drag()
      .on("start", (event,d) => { if (!event.active) state.simulation.alphaTarget(.2).restart(); d.fx=d.x; d.fy=d.y; })
      .on("drag", (event,d) => { d.fx=event.x; d.fy=event.y; })
      .on("end", (event,d) => { if (!event.active) state.simulation.alphaTarget(0); d.fx=null; d.fy=null; }));

  node.append("circle")
    .attr("r", d => d.center ? 29 : 8 + clamp((d.fit || d.discovery || 1), 1, 10) * .7)
    .attr("fill", d => d.center ? "#1d1c19" : CATEGORIES[d.category].color)
    .attr("fill-opacity", d => d.center ? 1 : .86);

  node.append("text")
    .attr("x", d => d.center ? 0 : 14)
    .attr("y", d => d.center ? 44 : 3)
    .attr("text-anchor", d => d.center ? "middle" : "start")
    .text(d => d.name.length > 24 ? `${d.name.slice(0,23)}…` : d.name);

  state.simulation = d3.forceSimulation(state.nodes)
    .force("link", d3.forceLink(state.links).id(d=>d.id).distance(d => 90 + (1-d.strength)*70).strength(d => .18 + d.strength*.5))
    .force("charge", d3.forceManyBody().strength(d => d.center ? -650 : -145))
    .force("center", d3.forceCenter(width/2,height/2))
    .force("collision", d3.forceCollide().radius(d => d.center ? 58 : 35).iterations(2))
    .force("x", d3.forceX(width/2).strength(.025))
    .force("y", d3.forceY(height/2).strength(.025))
    .on("tick", () => {
      link.attr("x1",d=>d.source.x).attr("y1",d=>d.source.y).attr("x2",d=>d.target.x).attr("y2",d=>d.target.y);
      node.attr("transform", d=>`translate(${d.x},${d.y})`);
    });

  $("#graphStatus").textContent = `${state.nodes.length} NODES / ${state.links.length} CONNECTIONS`;
}

function inspectNode(node) {
  const centerTags = state.center?.tags || [];
  const direct = node.center ? 1 : similarity(node.tags, centerTags);
  const fit = node.center ? 94 : clamp(Math.round(55 + direct * 52 + (node.named ? 9 : 0)), 52, 98);
  const novelty = node.center ? 62 : clamp(Math.round((node.novelty ?? (1-direct)) * 100), 18, 96);
  const distance = node.center ? 1.4 : (1 + novelty / 100 * 1.9).toFixed(1);

  $("#inspectorCategory").textContent = node.center ? "YOUR CENTER" : CATEGORIES[node.category].label.slice(0,-1).toUpperCase();
  $("#inspectorTitle").textContent = node.center ? "Your Taste" : node.name;
  $("#inspectorDescription").textContent = node.description;
  $("#fitScore").textContent = fit;
  $("#noveltyScore").textContent = novelty;
  $("#distanceScore").textContent = `${distance}×`;

  const overlap = node.center ? centerTags.slice(0,4) : node.tags.filter(t => centerTags.includes(t)).slice(0,4);
  $("#whyText").textContent = node.center
    ? `The strongest shared signals across your inputs are ${centerTags.slice(0,5).join(", ")}.`
    : overlap.length
      ? `It overlaps with your graph through ${overlap.join(", ")}, plus adjacent audience and cultural signals.`
      : `This is a higher-distance recommendation: weak literal overlap, but a similar level of specificity, design sensitivity and cultural signaling.`;

  const adj = ENTITIES.filter(e => e.id !== node.id && (!node.center ? e.tags.some(t => node.tags.includes(t)) : e.tags.some(t => centerTags.includes(t))))
    .map(e => ({e, s: similarity(e.tags, node.center ? centerTags : node.tags)})).sort((a,b)=>b.s-a.s).slice(0,4);
  $("#adjacentList").innerHTML = adj.map(({e}) => `<button type="button" class="adjacent-link" data-node="${e.id}"><span>${e.name}</span><span>↗</span></button>`).join("");
  $$(".adjacent-link").forEach(btn => btn.addEventListener("click", () => {
    const e = ENTITIES.find(x => x.id === Number(btn.dataset.node));
    inspectNode(e);
    recenterOn(e);
  }));
}

function recenterOn(entity) {
  const input = $("#seedInput");
  const current = input.value.split(",").map(s=>s.trim()).filter(Boolean);
  const next = [entity.name, ...current.filter(x => normalize(x)!==normalize(entity.name))].slice(0,5);
  input.value = next.join(", ");
  state.seedText = input.value;
  buildGraph();
  showToast(`Re-centered on ${entity.name}`);
}

function renderDiscovery(profile) {
  const candidates = ENTITIES.map(e => {
    const s = similarity(e.tags, profile.topTags);
    const novelty = 1-s;
    const score = s * 70 + novelty * (state.distance === 3 ? 45 : 22);
    return {...e, s, novelty, score};
  }).filter(e => state.enabledCategories.has(e.category))
    .sort((a,b)=>b.score-a.score);

  const picked = [];
  for (const e of candidates) {
    if (picked.length >= 3) break;
    if (picked.some(p => p.category === e.category) && state.distance < 3) continue;
    picked.push(e);
  }

  $("#discoveryGrid").innerHTML = picked.map((e,i) => `
    <article class="discovery-card" data-node="${e.id}">
      <span class="rank">0${i+1} / ${CATEGORIES[e.category].label.toUpperCase()}</span>
      <span class="score">${Math.round(70 + e.s*25)}% FIT</span>
      <div>
        <div class="orb" style="background:${CATEGORIES[e.category].color}"></div>
        <h3>${e.name}</h3>
        <p>${e.description}</p>
      </div>
    </article>`).join("");
  $$(".discovery-card").forEach(card => card.addEventListener("click", () => {
    const e = ENTITIES.find(x=>x.id===Number(card.dataset.node));
    inspectNode(e); recenterOn(e); window.scrollTo({top: document.querySelector(".workspace").offsetTop - 60, behavior:"smooth"});
  }));
}

function surpriseMe() {
  const centerTags = state.center?.tags || [];
  const ranked = ENTITIES.filter(e => state.enabledCategories.has(e.category))
    .map(e => {
      const s = similarity(e.tags, centerTags);
      const specificity = new Set(e.tags).size / 7;
      return {...e, surprise: (1-s)*.65 + specificity*.35};
    }).sort((a,b)=>b.surprise-a.surprise);
  const pool = ranked.slice(0,12);
  const pick = pool[Math.floor(Math.random()*pool.length)];
  inspectNode(pick);
  showToast(`Wildcard: ${pick.name}`);
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(showToast.t);
  showToast.t = setTimeout(() => toast.classList.remove("show"), 1900);
}

function copyShareCard() {
  const seed = $("#seedInput").value;
  const top = $$(".discovery-card h3").map(x=>x.textContent).join(" · ");
  const text = `MY INTERNET TASTE GRAPH\n\n${$("#profileName").textContent}\nSeeds: ${seed}\nNext obsessions: ${top}\n\nInternet Taste Graph`;
  navigator.clipboard?.writeText(text).then(() => showToast("Share card copied"), () => showToast("Copy unavailable in this browser"));
}

function randomProfile() {
  const presets = [
    "Paloma Wool, Apartamento, natural wine, Barcelona, film photography",
    "Aime Leon Dore, Ralph Lauren, Via Carota, jazz, vintage Porsche",
    "Miu Miu, Letterboxd, matcha, Tokyo, point-and-shoot cameras",
    "Loewe, Mexico City, Casa Barragán, Contramar, modernist ceramics",
    "Martine Rose, The Face, London, listening bars, indie sleaze",
    "The Row, Lemaire, MUBI, hotel bars, bookstore tourism"
  ];
  $("#seedInput").value = presets[Math.floor(Math.random()*presets.length)];
  state.seedText = $("#seedInput").value;
  buildGraph();
}

$("#seedForm").addEventListener("submit", e => { e.preventDefault(); state.seedText = $("#seedInput").value; buildGraph(); });
$$("[data-seed]").forEach(btn => btn.addEventListener("click", () => { $("#seedInput").value = btn.dataset.seed; state.seedText = btn.dataset.seed; buildGraph(); }));
$("#distanceRange").addEventListener("input", e => {
  state.distance = Number(e.target.value);
  $("#distanceLabel").textContent = ["SAFE","ADJACENT","WEIRD"][state.distance-1];
  buildGraph();
});
$("#surpriseButton").addEventListener("click", surpriseMe);
$("#shareButton").addEventListener("click", copyShareCard);
$("#randomSeed").addEventListener("click", randomProfile);

renderFilters();
$$(".filter-button").forEach(btn => btn.addEventListener("click", () => {
  const category = btn.dataset.category;
  if (state.enabledCategories.has(category)) state.enabledCategories.delete(category); else state.enabledCategories.add(category);
  if (!state.enabledCategories.size) state.enabledCategories.add(category);
  btn.classList.toggle("off", !state.enabledCategories.has(category));
  buildGraph();
}));
buildGraph();
