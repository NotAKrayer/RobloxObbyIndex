// ---- state, filters, sorting, rendering and other stuff for packs ----

const packState = {
  packs: [],
  towerByName: new Map(),
  diffFilters: new Map(),
  countFilters: new Map(),
  sort: "difficulty",
  dir: "desc",
  selected: null,
  search: "",
  minDiff: null
};

const packListEl = document.getElementById("packList");
const packInfoEl = document.getElementById("packInfo");

const packDiffMenu = document.getElementById("packDiffMenu");
const packDiffBtn = document.getElementById("packDiffBtn");
const packDiffDropdown = document.getElementById("packDiffDropdown");

const packCountMenu = document.getElementById("packCountMenu");
const packCountBtn = document.getElementById("packCountBtn");
const packCountDropdown = document.getElementById("packCountDropdown");

const PACK_COUNT_BUCKETS = [
  { key: "1-3", label: "1–3", test: n => n >= 1 && n <= 3 },
  { key: "4-6", label: "4–6", test: n => n >= 4 && n <= 6 },
  { key: "7-10", label: "7–10", test: n => n >= 7 && n <= 10 },
  { key: "11+", label: "11+", test: n => n >= 11 }
];

function notifyPackFilterChange(){
  updatePackBtnLabels();
  renderPackList();
}

DIFFS.forEach((d, i) => {
  buildTristateOption(packDiffMenu, packState.diffFilters, i, d, notifyPackFilterChange);
});
(function addPackUnknownFilterOption(){
  buildTristateOption(packDiffMenu, packState.diffFilters, UNKNOWN, "Unknown", notifyPackFilterChange);
})();

PACK_COUNT_BUCKETS.forEach(b => {
  buildTristateOption(packCountMenu, packState.countFilters, b.key, b.label, notifyPackFilterChange);
});

[[packDiffBtn, packDiffMenu, packDiffDropdown], [packCountBtn, packCountMenu, packCountDropdown]].forEach(([btn, menu, dd]) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains("open");
    [packDiffMenu, packCountMenu].forEach(m => m.classList.remove("open"));
    if (!wasOpen) menu.classList.add("open");
  };
});
document.addEventListener("click", (e) => {
  if (!packDiffDropdown.contains(e.target)) packDiffMenu.classList.remove("open");
  if (!packCountDropdown.contains(e.target)) packCountMenu.classList.remove("open");
});

function packFilterBtnLabel(base, map){
  if (!map.size) return base + " ▾";
  let inc = 0, exc = 0;
  map.forEach(v => v === "exclude" ? exc++ : inc++);
  const parts = [];
  if (inc) parts.push(inc + "+");
  if (exc) parts.push(exc + "-");
  return base + " (" + parts.join(" ") + ") ▾";
}

function updatePackBtnLabels(){
  packDiffBtn.textContent = packFilterBtnLabel("Difficulty", packState.diffFilters);
  packCountBtn.textContent = packFilterBtnLabel("Obby Count", packState.countFilters);
}

document.getElementById("packClear").onclick = () => {
  packState.diffFilters.clear();
  packState.countFilters.clear();
  packState.minDiff = null;
  if (packMinDiffInput) packMinDiffInput.value = "";
  [packDiffMenu, packCountMenu].forEach(menu => {
    menu.querySelectorAll("label").forEach(label => {
      label.classList.remove("state-include", "state-exclude");
      const sw = label.querySelector(".tristate");
      if (sw) sw.classList.remove("state-include", "state-exclude");
    });
  });
  updatePackBtnLabels();
  renderPackList();
};

document.getElementById("packSort").onchange = e => { packState.sort = e.target.value; renderPackList(); };
document.getElementById("packSearch").oninput = e => { packState.search = e.target.value.trim().toLowerCase(); renderPackList(); };

const packMinDiffInput = document.getElementById("packMinDiff");
if (packMinDiffInput) {
  packMinDiffInput.oninput = e => {
    const v = parseFloat(e.target.value.replace(",", "."));
    packState.minDiff = isNaN(v) ? null : v;
    renderPackList();
  };
}

const packDirBtn = document.getElementById("packDir");
packDirBtn.onclick = () => {
  packState.dir = packState.dir === "asc" ? "desc" : "asc";
  packDirBtn.textContent = packState.dir === "asc" ? "▲ Low → High" : "▼ High → Low";
  renderPackList();
};

function packHardestTower(pack){
  if (!pack.hardestTowerName) return null;
  return packState.towerByName.get(pack.hardestTowerName.toLowerCase()) || null;
}

function packDiffKey(pack){
  const t = packHardestTower(pack);
  if (!t) return pack.towers.length ? UNKNOWN : null;
  const d = t.difficulty;
  if (d == null) return pack.towers.length ? UNKNOWN : null;
  if (isUnknownDiff(d)) return UNKNOWN;
  const nt = normType(t.tier);
  if (RAW_TYPES.includes(nt) || TIER_TYPES.includes(nt)) return null;
  if (isTextOnlyDiff(d)) return d.index;
  const ci = diffClass(effectiveDifficultyValue(t));
  return ci == null ? null : ci;
}

function packCountKey(pack){
  const n = pack.obbyCount;
  const bucket = PACK_COUNT_BUCKETS.find(b => b.test(n));
  return bucket ? bucket.key : null;
}

function getFilteredPacksNoSearch(){
  let arr = packState.packs.slice();

  if (packState.diffFilters.size) {
    const { include, exclude } = splitFilters(packState.diffFilters);
    arr = arr.filter(p => {
      const key = packDiffKey(p);
      if (key != null && exclude.has(key)) return false;
      if (!include.size) return true;
      return key != null && include.has(key);
    });
  }

  if (packState.countFilters.size) {
    const { include, exclude } = splitFilters(packState.countFilters);
    arr = arr.filter(p => {
      const key = packCountKey(p);
      if (key != null && exclude.has(key)) return false;
      if (!include.size) return true;
      return key != null && include.has(key);
    });
  }

  if (packState.minDiff != null) {
    arr = arr.filter(p => p.towers.some(n => {
      const t = packState.towerByName.get(n.toLowerCase());
      if (!t || normType(t.tier) !== "jump") return false;
      const v = effectiveDifficultyValue(t);
      return v != null && v !== UNKNOWN && v >= packState.minDiff;
    }));
  }

  return arr;
}

function getFilteredPacks(){
  let arr = getFilteredPacksNoSearch();
  if (packState.search) {
    arr = arr.filter(p => p.name.toLowerCase().includes(packState.search));
  }
  return arr;
}

function packSortValue(p){
  if (packState.sort === "count") return p.obbyCount;
  if (packState.sort === "name") return p.name.toLowerCase();
  return p.hardestDifficultyValue == null ? -Infinity : p.hardestDifficultyValue;
}

function sortPacks(arr){
  arr.sort((a, b) => {
    let r;
    if (packState.sort === "name") {
      const va = packSortValue(a), vb = packSortValue(b);
      r = va < vb ? -1 : va > vb ? 1 : 0;
    } else {
      r = packSortValue(a) - packSortValue(b);
    }
    return packState.dir === "desc" ? -r : r;
  });
  return arr;
}

let globalPackRankByPack = new Map();
let globalPackRankSortKey = null;

function ensureGlobalPackRanks(){
  const key = packState.sort + "|" + packState.dir;
  if (globalPackRankSortKey === key && globalPackRankByPack.size === packState.packs.length) return;
  const allRanked = sortPacks(packState.packs.slice());
  globalPackRankByPack = new Map();
  allRanked.forEach((p, idx) => globalPackRankByPack.set(p, idx + 1));
  globalPackRankSortKey = key;
}

function formatPackDifficulty(pack){
  const t = packHardestTower(pack);
  if (!t) return { text: pack.towers.length ? "Unknown" : "N/A", color: "#888" };
  return formatDifficulty(t);
}

function renderPackList(){
  ensureGlobalPackRanks();

  const filteredNoSearch = getFilteredPacksNoSearch();
  const bySortWithinFilters = sortPacks(filteredNoSearch.slice());

  let arr = bySortWithinFilters;
  if (packState.search) {
    arr = bySortWithinFilters.filter(p => p.name.toLowerCase().includes(packState.search));
  }

  const countEl = document.getElementById("packListCount");
  if (countEl) {
    countEl.textContent = packState.search
      ? `(${arr.length} of ${bySortWithinFilters.length})`
      : `(${bySortWithinFilters.length})`;
  }

  packListEl.innerHTML = "";
  if (!arr.length) { packListEl.innerHTML = '<div class="muted">There is no pack based on the selected filters</div>'; return; }

  arr.forEach((p) => {
    const fd = formatPackDifficulty(p);
    const row = document.createElement("div");
    row.className = "row" + (packState.selected === p ? " sel" : "");
    row.innerHTML = `<span class="n">#${globalPackRankByPack.get(p)}</span><span class="name">${esc(p.name)}</span><span class="d" style="color:${fd.color}">${esc(fd.text)}</span>`;
    row.onclick = () => { packState.selected = p; renderPackList(); renderPackInfo(p); };
    packListEl.appendChild(row);
  });
}

function renderPackInfo(pack){
  if (!pack) { packInfoEl.innerHTML = '<div class="muted">Select a pack to view details</div>'; return; }

  const fd = formatPackDifficulty(pack);

  const towerRows = pack.towers.map((name, idx) => {
    const t = packState.towerByName.get(name.toLowerCase());
    const rowFd = t ? formatDifficulty(t) : { text: "N/A", color: "#888" };
    return `<div class="pack-tower-row">
      <span class="pn">#${idx + 1}</span>
      <span class="pname" data-tower="${esc(name)}">${esc(name)}</span>
      <span class="pd" style="color:${rowFd.color}">${esc(rowFd.text)}</span>
    </div>`;
  }).join("");

  packInfoEl.innerHTML = `
    <div class="t">${esc(pack.name)}</div>
    <div class="kv">
      <span>Name</span><b>${esc(pack.name)}</b>
      <span>Difficulty</span><b style="color:${fd.color}">${esc(fd.text)}</b>
      <span>Obby Count</span><b>${pack.obbyCount}</b>
    </div>
    <div class="pack-tower-list">${towerRows}</div>
  `;

  packInfoEl.querySelectorAll(".pname[data-tower]").forEach(el => {
    el.onclick = () => {
      const name = el.getAttribute("data-tower");
      const t = packState.towerByName.get(name.toLowerCase());
      if (!t) return;
      switchToTab("towers");
      state.selected = t;
      renderList();
      renderInfo(t);
      const row = listEl.querySelector(".row.sel");
      if (row) row.scrollIntoView({ block: "nearest" });
    };
  });
}

function packsForTower(t){
  if (!t) return [];
  return packState.packs.filter(p => p.towers.some(n => n.toLowerCase() === t.name.toLowerCase()));
}

function loadPacksFromData(rawPacks){
  packState.packs = rawPacks || [];
  packState.towerByName = new Map();
  state.towers.forEach(t => {
    packState.towerByName.set(t.name.toLowerCase(), t);
    if (t.altName) packState.towerByName.set(t.altName.toLowerCase(), t);
  });
  updatePackBtnLabels();
  renderPackList();
  if (state.selected) renderInfo(state.selected);
}
