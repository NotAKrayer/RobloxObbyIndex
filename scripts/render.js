function effectiveDifficultyValue(t){
  const d = t.difficulty;
  if (d == null) return null;
  if (isUnknownDiff(d)) return UNKNOWN;
  if (isTextOnlyDiff(d)) return textOnlyValue(d);

  const nt = normType(t.tier);
  if (isTierSubtierDiff(d)) return tierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);
  if (nt === "obby" || nt === "wallhop") return tierToVirtualDifficulty(Math.floor(d));
  if (nt === "jump") return jumpToVirtualDifficulty(Math.floor(d));
  return d;
}

function diffClass(effectiveVal){
  if (effectiveVal == null || effectiveVal === UNKNOWN) return null;
  const i = Math.floor(effectiveVal);
  return (i < 0 || i >= DIFFS.length) ? null : i;
}
function qualityRank(q){ if(!q) return null; const i = QUALITIES.indexOf(q); return i < 0 ? null : i; }
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

function formatDifficulty(t){
  const nt = normType(t.tier);
  const d = t.difficulty;

  if (d == null) return { text: "N/A", color: "#888" };

  if (isUnknownDiff(d)) return { text: "Unknown", color: "#888" };

  if (isTextOnlyDiff(d)) {
    const name = DIFFS[d.index];
    return { text: name, color: COLORS[d.index] };
  }

  if (isTierSubtierDiff(d)) {
    const prefix = d.subtierName ? d.subtierName + " " : "";
    return { text: prefix + "Tier " + d.tierNum, color: "#888" };
  }

  if (RAW_TYPES.includes(nt)) {
    return { text: String(d), color: "#888" };
  }

  if (TIER_TYPES.includes(nt)) {
    const tierNum = Math.floor(d);
    return { text: "Tier " + tierNum, color: "#888" };
  }

  const ci = diffClass(d);
  const col = ci == null ? "#888" : COLORS[ci];
  const name = ci == null ? "N/A" : DIFFS[ci];
  let text = String(d) + (ci != null ? " · " + name : "");
  if (!NO_SUBTIER_TYPES.includes(nt)) {
    const st = subtierFor(d);
    if (st) text += " (" + st + ")";
  }
  return { text, color: col };
}

function sortValue(t){
  const nt = normType(t.tier);
  const d = t.difficulty;
  if (d == null) return -Infinity;
  if (isUnknownDiff(d)) return -Infinity + 1;
  if (isTextOnlyDiff(d)) return textOnlyValue(d);
  if (isTierSubtierDiff(d)) return tierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);

  if (RAW_TYPES.includes(nt)) {
    if (nt === "jump") return jumpToVirtualDifficulty(d);
    return d;
  }
  if (TIER_TYPES.includes(nt)) return tierToVirtualDifficulty(Math.floor(d));
  return d;
}

function splitFilters(map){
  const include = new Set(), exclude = new Set();
  map.forEach((v, k) => (v === "exclude" ? exclude : include).add(k));
  return { include, exclude };
}

function getFilteredTowersNoSearch() {
  let arr = state.towers.slice();

  if (state.diffFilters.size) {
    const { include, exclude } = splitFilters(state.diffFilters);

    function diffKeyOf(t){
      const nt = normType(t.tier);
      const d = t.difficulty;
      if (isUnknownDiff(d)) return UNKNOWN;
      if (RAW_TYPES.includes(nt) || TIER_TYPES.includes(nt)) return null;
      if (isTextOnlyDiff(d)) return d.index;
      const ci = diffClass(d);
      return ci == null ? null : ci;
    }

    arr = arr.filter(t => {
      const key = diffKeyOf(t);
      if (key != null && exclude.has(key)) return false;
      if (!include.size) return true;
      return key != null && include.has(key);
    });
  }

  if (state.tagFilters.size) {
    const { include, exclude } = splitFilters(state.tagFilters);
    arr = arr.filter(t => {
      if (t.tags.some(tag => exclude.has(tag))) return false;
      if (!include.size) return true;
      return t.tags.some(tag => include.has(tag));
    });
  }

  if (state.typeFilters.size) {
    const { include, exclude } = splitFilters(state.typeFilters);
    arr = arr.filter(t => {
      if (exclude.has(t.tier)) return false;
      if (!include.size) return true;
      return include.has(t.tier);
    });
  }

  if (state.tierFilters.size) {
    const { include, exclude } = splitFilters(state.tierFilters);

    function tierKeyOf(t){
      const nt = normType(t.tier);
      if (!TIER_TYPES.includes(nt) || t.difficulty == null) return null;
      if (isUnknownDiff(t.difficulty) || isTextOnlyDiff(t.difficulty)) return null;
      const raw = isTierSubtierDiff(t.difficulty) ? t.difficulty.tierNum : t.difficulty;
      const tierNum = Math.floor(raw);
      return tierNum > 25 ? "25+" : String(tierNum);
    }

    arr = arr.filter(t => {
      const key = tierKeyOf(t);
      if (key != null && exclude.has(key)) return false;
      if (!include.size) return true;
      return key != null && include.has(key);
    });
  }

  if (state.authorFilters.size) {
    const { include, exclude } = splitFilters(state.authorFilters);
    arr = arr.filter(t => {
      const authors = splitAuthors(t.author);
      if (authors.some(a => exclude.has(a))) return false;
      if (!include.size) return true;
      return authors.some(a => include.has(a));
    });
  }

  if (state.gameFilters.size) {
    const { include, exclude } = splitFilters(state.gameFilters);
    arr = arr.filter(t => {
      const games = splitBaseGames(t.location);
      if (games.some(g => exclude.has(g))) return false;
      if (!include.size) return true;
      return games.some(g => include.has(g));
    });
  }

  if (state.minDiff != null) {
    arr = arr.filter(t => {
      const v = effectiveDifficultyValue(t);
      return v != null && v !== UNKNOWN && v >= state.minDiff;
    });
  }

  return arr;
}

function matchesSearch(t, q) {
  if (!q) return true;
  if (t.name && t.name.toLowerCase().includes(q)) return true;
  if (t.altName && t.altName.toLowerCase().includes(q)) return true;
  return false;
}

function getFilteredTowers() {
  let arr = getFilteredTowersNoSearch();
  if (state.search) {
    arr = arr.filter(t => matchesSearch(t, state.search));
  }
  return arr;
}

function sortTowers(arr){
  arr.sort((a, b) => {
    let r;
    if (state.sort === "quality") {
      const ra = qualityRank(a.quality), rb = qualityRank(b.quality);
      const va = ra == null ? -Infinity : (QUALITIES.length - 1 - ra);
      const vb = rb == null ? -Infinity : (QUALITIES.length - 1 - rb);
      r = va - vb;
    } else if (state.sort === "type") {
      const ta = (a.tier || "").toLowerCase();
      const tb = (b.tier || "").toLowerCase();
      r = ta < tb ? -1 : ta > tb ? 1 : (sortValue(a) - sortValue(b));
    } else {
      r = sortValue(a) - sortValue(b);
    }
    return state.dir === "desc" ? -r : r;
  });
  return arr;
}

let globalRankByTower = new Map();
let globalRankSortKey = null;

function ensureGlobalRanks() {
  const key = state.sort + "|" + state.dir;
  if (globalRankSortKey === key && globalRankByTower.size === state.towers.length) return;
  const allRanked = sortTowers(state.towers.slice());
  globalRankByTower = new Map();
  allRanked.forEach((t, idx) => globalRankByTower.set(t, idx + 1));
  globalRankSortKey = key;
}

function renderList() {
  ensureGlobalRanks();

  const filteredNoSearch = getFilteredTowersNoSearch();
  const bySortWithinFilters = sortTowers(filteredNoSearch.slice());

  let arr = bySortWithinFilters;
  if (state.search) {
    arr = bySortWithinFilters.filter(t => matchesSearch(t, state.search));
  }

  const countEl = document.getElementById("listCount");
  if (countEl) {
    countEl.textContent = state.search
      ? `(${arr.length} of ${bySortWithinFilters.length})`
      : `(${bySortWithinFilters.length})`;
  }

  listEl.innerHTML = "";
  if (!arr.length) { listEl.innerHTML = '<div class="muted">There is no obby based on the selected filters</div>'; return; }

  arr.forEach((t) => {
    const fd = formatDifficulty(t);
    const row = document.createElement("div");
    row.className = "row" + (state.selected === t ? " sel" : "");
    row.innerHTML = `<span class="n">#${globalRankByTower.get(t)}</span><span class="name">${esc(t.name)}</span><span class="d" style="color:${fd.color}">${esc(fd.text)}</span>`;
    row.onclick = () => { state.selected = t; renderList(); renderInfo(t); };
    listEl.appendChild(row);
  });
}

function renderInfo(t) {
  if (!t) { infoEl.innerHTML = '<div class="muted">Select a tower to view details</div>'; return; }

  const fd = formatDifficulty(t);

  const statusText = t.verified ? "Verified" : "Unverified";
  const verifierRow = t.verified
    ? `<span>Verifier</span><b>${esc(t.verifier || "N/A")}</b>`
    : "";

  const locNames = t.location ? t.location.split(";").map(s => s.trim()).filter(Boolean) : [];
  const locLinks = t.link ? t.link.split(";").map(s => s.trim()).filter(Boolean) : [];

  let locHtml;
  if (!locNames.length) {
    locHtml = "N/A";
  } else if (locNames.length === 1) {
    locHtml = locLinks[0]
      ? `<a href="${esc(locLinks[0])}" target="_blank" rel="noopener">${esc(locNames[0])}</a>`
      : esc(locNames[0]);
  } else {
    locHtml = locNames.map((ln, i) => {
      const url = locLinks[i];
      return url
        ? `<div><a href="${esc(url)}" target="_blank" rel="noopener">${esc(ln)}</a></div>`
        : `<div>${esc(ln)}</div>`;
    }).join("");
  }

  const tagsHtml = t.tags.length
    ? t.tags.map(tag => `<span class="tagchip">${esc(tag)}</span>`).join("")
    : "N/A";

  const lengthDisplay = t.lengthRaw ? esc(t.lengthRaw) : "N/A";

  const altNameRow = t.altName
    ? `<span>Alt. Name:</span><b>${esc(t.altName)}</b>`
    : "";

  const packs = typeof packsForTower === "function" ? packsForTower(t) : [];
  const packsHtml = packs.length
    ? packs.map(p => `<span class="tagchip" data-pack="${esc(p.name)}">${esc(p.name)}</span>`).join("")
    : "N/A";

  infoEl.innerHTML = `
    <div class="t">${esc(t.name)}</div>
    <div class="kv">
      <span>Name</span><b>${esc(t.name)}</b>
      ${altNameRow}
      <span>Difficulty</span><b style="color:${fd.color}">${esc(fd.text)}</b>
      <span>Status</span><b>${statusText}</b>
      ${verifierRow}
      <span>Type</span><b>${t.tier ? esc(t.tier) : "N/A"}</b>
      <span>Length</span><b>${lengthDisplay}</b>
      <span>Author(s)</span><b>${t.author ? esc(t.author) : "N/A"}</b>
      <span>Quality</span><b>${t.quality || "N/A"}</b>
      <span>Location(s)</span><b>${locHtml}</b>
      <span>Tags</span><b>${tagsHtml}</b>
      <span>Pack(s)</span><b>${packsHtml}</b>
    </div>`;

  infoEl.querySelectorAll(".tagchip[data-pack]").forEach(el => {
    el.onclick = () => {
      const name = el.getAttribute("data-pack");
      const p = packState.packs.find(pp => pp.name === name);
      if (!p) return;
      switchToTab("packs");
      packState.selected = p;
      renderPackList();
      renderPackInfo(p);
      const row = packListEl.querySelector(".row.sel");
      if (row) row.scrollIntoView({ block: "nearest" });
    };
  });
}
updateBtnLabels();
buildTagMenu();
buildTypeMenu();
loadTowers();
