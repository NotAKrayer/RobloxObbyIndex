const GVIZ_URL = "https://robloxobbyindex.kirillrahimov80.workers.dev";

const DIFFS = ["Effortless","Easy","Medium","Hard","Difficult","Challenging","Intense",
"Remorseless","Insane","Extreme","Terrifying","Catastrophic","Horrific","Unreal","Nil",
"Error","Literal","WHY", "No", "DEATH", "HELL", "TARTARUS", "Unimaginable", "Omega", "Aleph-Null", "Immeasurable", "Malicious"];

const COLORS = [
  "rgb(0,206,0)",       // Effortless
  "rgb(117,243,71)",    // Easy
  "rgb(255,254,0)",     // Medium
  "rgb(253,124,0)",     // Hard
  "rgb(255,50,50)",     // Difficult
  "rgb(160,0,0)",       // Challenging
  "rgb(25,35,45)",      // Intense
  "rgb(200,0,200)",     // Remorseless
  "rgb(0,0,255)",       // Insane
  "rgb(3,137,255)",     // Extreme
  "rgb(0,255,255)",     // Terrifying
  "rgb(255,255,255)",   // Catastrophic
  "rgb(150,149,255)",   // Horrific
  "rgb(81,0,203)",      // Unreal
  "rgb(101,102,109)",   // Nil
  "rgb(86,36,36)",      // Error
  "rgb(12,27,43)",      // Literal
  "rgb(255,255,255)",   // WHY
  "rgb(80,80,80)",      // No
  "rgb(236, 89, 88)",   // DEATH
  "rgb(7, 168, 229)",   // HELL
  "rgb(194, 223, 241)", // TARTARUS
  "rgb(67,0,0)",        // Unimaginable
  "rgb(71, 71, 71)",    // Omega
  "rgb(39, 38, 38)",    // Aleph-Null
  "rgb(18,0,0)",        // Immeasurable
  "rgb(146, 146, 146)"  // Malicious
];

const SUBTIERS = [
  { key:"Baseline",   test:f => f === 0 },
  { key:"Bottom",     test:f => f >= 0.01 && f <= 0.11 },
  { key:"Bottom-Low", test:f => f >= 0.12 && f <= 0.22 },
  { key:"Low",        test:f => f >= 0.23 && f <= 0.33 },
  { key:"Low-Mid",    test:f => f >= 0.34 && f <= 0.44 },
  { key:"Mid",        test:f => f >= 0.45 && f <= 0.55 },
  { key:"Mid-High",   test:f => f >= 0.56 && f <= 0.66 },
  { key:"High",       test:f => f >= 0.67 && f <= 0.77 },
  { key:"High-Peak",  test:f => f >= 0.78 && f <= 0.88 },
  { key:"Peak",       test:f => f >= 0.89 && f <= 0.99 }
];
function subtierFor(diffValue){
  if (diffValue == null) return null;
  let frac = diffValue - Math.floor(diffValue);
  frac = Math.round(frac * 100) / 100; // normalize float rounding
  for (const st of SUBTIERS){ if (st.test(frac)) return st.key; }
  return null;
}

const TIER_SUBTIER_NAMES = [
  "Baseline","Bottom-Low","Bottom","Low-Mid","Low","Mid-High","Mid","High-Peak","High","Peak"
];

const TIER_SUBTIER_SORTED = TIER_SUBTIER_NAMES.slice().sort((a, b) => b.length - a.length);

function normLoose(s){ return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

const TIER_SUBTIER_LOOKUP = TIER_SUBTIER_SORTED.map(name => ({
  name,
  key: normLoose(name)
}));

function parseTierSubtierCell(raw){
  if (!raw) return null;
  const loose = normLoose(raw);
  if (!loose) return null;

  let subtierName = null;
  let rest = loose;
  for (const { name, key } of TIER_SUBTIER_LOOKUP) {
    if (loose.includes(key)) {
      subtierName = name;
      rest = loose.replace(key, "");
      break;
    }
  }

  const numMatch = rest.match(/\d+(\.\d+)?/);
  if (!numMatch) return null;
  const tierNum = parseFloat(numMatch[0]);
  if (isNaN(tierNum)) return null;

  return { tierNum, subtierName };
}

const QUALITIES = ["SS","S+","S","S-","A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F+","F","F-","X"];
const KNOWN_TAGS = ["Purist","Wallhop","Checkpoints","Speedrun","Jank","Camera control","CO Based","Buff","Nerf","Old Version","Segment","Obby","Tower","Jump"];
const RAW_TYPES = ["jump"];      // number shown as-is, no formatting
const TIER_TYPES = ["obby", "wallhop"];     // shown as "Tier N"
const NO_SUBTIER_TYPES = ["jump","obby","wallhop"];

const UNKNOWN = "UNKNOWN";

const DIFF_NAME_TO_INDEX = new Map();
DIFFS.forEach((name, i) => DIFF_NAME_TO_INDEX.set(name.toLowerCase(), i));

function parseDifficultyCell(cell, typeHint){
  const raw = cellText(cell);
  if (!raw) {
    const n = cellNum(cell);
    return n == null ? null : n;
  }

  const trimmed = raw.trim();

  if (trimmed === "?" || trimmed.toLowerCase() === "unknown") {
    return UNKNOWN;
  }

  const nameIdx = DIFF_NAME_TO_INDEX.get(trimmed.toLowerCase());
  if (nameIdx != null) {
    return { textOnly: true, index: nameIdx };
  }

  const nt = normType(typeHint);
  if (TIER_TYPES.includes(nt)) {
    const parsed = parseTierSubtierCell(trimmed);
    if (parsed && parsed.subtierName) {
      return { tierSubtier: true, tierNum: parsed.tierNum, subtierName: parsed.subtierName };
    }
  }

  const n = cellNum(cell);
  return n == null ? null : n;
}

function isTextOnlyDiff(d){ return d != null && typeof d === "object" && d.textOnly; }
function isUnknownDiff(d){ return d === UNKNOWN; }
function isTierSubtierDiff(d){ return d != null && typeof d === "object" && d.tierSubtier; }

function textOnlyValue(d){
  return d.index - 0.001;
}

function diffIndex(name){ return DIFFS.indexOf(name); }
function mid(a, b){ return (diffIndex(a) + diffIndex(b)) / 2; }

const TIER_ANCHORS = [
  [1,  diffIndex("Easy")],
  [2,  diffIndex("Easy") + 0.35],
  [3,  mid("Easy","Medium")],
  [4,  mid("Medium","Hard")],
  [5,  mid("Hard","Difficult") - 0.15],
  [6,  mid("Hard","Difficult") + 0.15],
  [7,  mid("Difficult","Challenging")],
  [8,  mid("Challenging","Intense")],
  [9,  mid("Intense","Remorseless")],
  [10, mid("Remorseless","Insane")],
  [11, mid("Insane","Extreme")],
  [13, mid("Extreme","Terrifying") - 0.15],
  [14, mid("Extreme","Terrifying") + 0.15],
  [15, mid("Terrifying","Catastrophic")],
  [16, mid("Catastrophic","Horrific")],
  [17, mid("Horrific","Unreal")],
  [18, mid("Unreal","Nil") - 0.15],
  [19, mid("Unreal","Nil") + 0.15],
  [20, mid("Nil","Error") - 0.2],
  [21, mid("Nil","Error")],
  [22, mid("Nil","Error") + 0.2],
  [23, mid("Error","Literal") - 0.2],
  [24, mid("Error","Literal")],
  [25, mid("Error","Literal") + 0.2]
];

const TIER_ANCHOR_MAP = new Map(TIER_ANCHORS);

const LITERAL_IDX = diffIndex("Literal");

function subtierFraction(subtierName){
  if (!subtierName) return 0;
  const i = TIER_SUBTIER_NAMES.indexOf(subtierName);
  return i < 0 ? 0 : i / TIER_SUBTIER_NAMES.length;
}

function tierToVirtualDifficulty(tierNum, subtierName){
  const frac = subtierFraction(subtierName);

  if (TIER_ANCHOR_MAP.has(tierNum)) {
    const base = TIER_ANCHOR_MAP.get(tierNum);
    if (!frac) return base;
    const known = TIER_ANCHORS.map(a => a[0]).sort((a,b) => a-b);
    const nextKnown = known.find(k => k > tierNum);
    const nextVal = nextKnown != null ? TIER_ANCHOR_MAP.get(nextKnown) : tierToVirtualDifficulty(tierNum + 1);
    return base + (nextVal - base) * frac;
  }
  if (tierNum < 1) return diffIndex("Effortless");
  if (tierNum > 25) {
    const stepsAbove = tierNum - 25;
    const growth = 1 + stepsAbove * 0.08;
    const base = LITERAL_IDX + stepsAbove * growth * 0.5;
    if (!frac) return base;
    const nextBase = LITERAL_IDX + (stepsAbove + 1) * (1 + (stepsAbove + 1) * 0.08) * 0.5;
    return base + (nextBase - base) * frac;
  }
  const known = TIER_ANCHORS.map(a => a[0]).sort((a,b) => a-b);
  let lower = null, upper = null;
  for (const k of known) {
    if (k <= tierNum) lower = k;
    if (k >= tierNum && upper == null) upper = k;
  }
  let base;
  if (lower == null) base = TIER_ANCHOR_MAP.get(upper);
  else if (upper == null) base = TIER_ANCHOR_MAP.get(lower);
  else if (lower === upper) base = TIER_ANCHOR_MAP.get(lower);
  else {
    const lv = TIER_ANCHOR_MAP.get(lower), uv = TIER_ANCHOR_MAP.get(upper);
    const t = (tierNum - lower) / (upper - lower);
    base = lv + (uv - lv) * t;
  }
  if (!frac) return base;
  const nextVal = tierToVirtualDifficulty(tierNum + 1);
  return base + (nextVal - base) * frac;
}

const JUMP_ANCHORS = [
  [0, mid("Easy","Medium") - 0.15],
  [1, mid("Easy","Medium") + 0.15],
  [2, mid("Hard","Difficult")],
  [3, mid("Remorseless","Insane")],
  [4, mid("Insane","Extreme") - 0.15],
  [5, mid("Insane","Extreme") + 0.15],
  [6, mid("Extreme","Terrifying")],
  [7, mid("Terrifying","Catastrophic")],
  [8, mid("Catastrophic","Horrific")],
  [9, mid("Horrific","Unreal")]
];
const JUMP_ANCHOR_MAP = new Map(JUMP_ANCHORS);
const UNREAL_IDX = diffIndex("Unreal");

function jumpToVirtualDifficulty(jumpNum){
  if (JUMP_ANCHOR_MAP.has(jumpNum)) return JUMP_ANCHOR_MAP.get(jumpNum);
  if (jumpNum < 0) return JUMP_ANCHOR_MAP.get(0);
  if (jumpNum >= 10) {
    const stepsAbove = jumpNum - 9;
    const growth = 1 + stepsAbove * 0.08;
    return UNREAL_IDX + stepsAbove * growth * 0.5;
  }
  const known = JUMP_ANCHORS.map(a => a[0]).sort((a,b) => a-b);
  let lower = null, upper = null;
  for (const k of known) {
    if (k <= jumpNum) lower = k;
    if (k >= jumpNum && upper == null) upper = k;
  }
  if (lower == null) return JUMP_ANCHOR_MAP.get(upper);
  if (upper == null) return JUMP_ANCHOR_MAP.get(lower);
  if (lower === upper) return JUMP_ANCHOR_MAP.get(lower);
  const lv = JUMP_ANCHOR_MAP.get(lower), uv = JUMP_ANCHOR_MAP.get(upper);
  const t = (jumpNum - lower) / (upper - lower);
  return lv + (uv - lv) * t;
}

const state = {
  towers: [],
  diffFilters: new Set(),
  tagFilters: new Set(),
  typeFilters: new Set(),
  tierFilters: new Set(),
  sort: "difficulty",
  dir: "desc",
  selected: null,
  search: "",
  allTags: [],
  allTypes: []
};

const listEl = document.getElementById("list");
const infoEl = document.getElementById("info");

const diffMenu = document.getElementById("diffMenu");
const diffBtn = document.getElementById("diffBtn");
const diffDropdown = document.getElementById("diffDropdown");

const tagMenu = document.getElementById("tagMenu");
const tagBtn = document.getElementById("tagBtn");
const tagDropdown = document.getElementById("tagDropdown");

const typeMenu = document.getElementById("typeMenu");
const typeBtn = document.getElementById("typeBtn");
const typeDropdown = document.getElementById("typeDropdown");

const tierMenu = document.getElementById("tierMenu");
const tierBtn = document.getElementById("tierBtn");
const tierDropdown = document.getElementById("tierDropdown");

const TIER_BANDS = Array.from({length:26}, (_, i) => String(i)).concat(["25+"]);

DIFFS.forEach((d, i) => {
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.onclick = () => {
    cb.checked ? state.diffFilters.add(i) : state.diffFilters.delete(i);
    updateBtnLabels();
    renderList();
  };
  label.appendChild(cb);
  label.appendChild(document.createTextNode(" " + d));
  diffMenu.appendChild(label);
});

(function addUnknownFilterOption(){
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.onclick = () => {
    cb.checked ? state.diffFilters.add(UNKNOWN) : state.diffFilters.delete(UNKNOWN);
    updateBtnLabels();
    renderList();
  };
  label.appendChild(cb);
  label.appendChild(document.createTextNode(" Unknown"));
  diffMenu.appendChild(label);
})();

function buildTagMenu(){
  tagMenu.innerHTML = "";
  state.allTags.forEach(tag => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.tagFilters.has(tag);
    cb.onclick = () => {
      cb.checked ? state.tagFilters.add(tag) : state.tagFilters.delete(tag);
      updateBtnLabels();
      renderList();
    };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + tag));
    tagMenu.appendChild(label);
  });
}

function buildTypeMenu(){
  typeMenu.innerHTML = "";
  state.allTypes.forEach(type => {
    const label = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = state.typeFilters.has(type);
    cb.onclick = () => {
      cb.checked ? state.typeFilters.add(type) : state.typeFilters.delete(type);
      updateBtnLabels();
      renderList();
    };
    label.appendChild(cb);
    label.appendChild(document.createTextNode(" " + type));
    typeMenu.appendChild(label);
  });
}

TIER_BANDS.forEach(band => {
  const label = document.createElement("label");
  const cb = document.createElement("input");
  cb.type = "checkbox";
  cb.onclick = () => {
    cb.checked ? state.tierFilters.add(band) : state.tierFilters.delete(band);
    updateBtnLabels();
    renderList();
  };
  label.appendChild(cb);
  label.appendChild(document.createTextNode(" Tier " + band));
  tierMenu.appendChild(label);
});

[[diffBtn, diffMenu, diffDropdown],[tagBtn, tagMenu, tagDropdown],[typeBtn, typeMenu, typeDropdown],[tierBtn, tierMenu, tierDropdown]].forEach(([btn, menu, dd]) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains("open");
    [diffMenu, tagMenu, typeMenu, tierMenu].forEach(m => m.classList.remove("open"));
    if (!wasOpen) menu.classList.add("open");
  };
});
document.addEventListener("click", (e) => {
  if (!diffDropdown.contains(e.target)) diffMenu.classList.remove("open");
  if (!tagDropdown.contains(e.target)) tagMenu.classList.remove("open");
  if (!typeDropdown.contains(e.target)) typeMenu.classList.remove("open");
  if (!tierDropdown.contains(e.target)) tierMenu.classList.remove("open");
});

function updateBtnLabels(){
  diffBtn.textContent = (state.diffFilters.size ? "Difficulty (" + state.diffFilters.size + ") ▾" : "Difficulty ▾");
  tagBtn.textContent = (state.tagFilters.size ? "Tags (" + state.tagFilters.size + ") ▾" : "Tags ▾");
  typeBtn.textContent = (state.typeFilters.size ? "Type (" + state.typeFilters.size + ") ▾" : "Type ▾");
  tierBtn.textContent = (state.tierFilters.size ? "Tier (" + state.tierFilters.size + ") ▾" : "Tier ▾");
}

document.getElementById("clear").onclick = () => {
  state.diffFilters.clear();
  state.tagFilters.clear();
  state.typeFilters.clear();
  state.tierFilters.clear();
  diffMenu.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  tagMenu.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  typeMenu.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  tierMenu.querySelectorAll("input[type=checkbox]").forEach(cb => cb.checked = false);
  updateBtnLabels();
  renderList();
};
document.getElementById("sort").onchange = e => { state.sort = e.target.value; renderList(); };
document.getElementById("search").oninput = e => { state.search = e.target.value.trim().toLowerCase(); renderList(); };

const dirBtn = document.getElementById("dir");
dirBtn.onclick = () => {
  state.dir = state.dir === "asc" ? "desc" : "asc";
  dirBtn.textContent = state.dir === "asc" ? "▲ Low → High" : "▼ High → Low";
  renderList();
};

const siteInfoModalOverlay = document.getElementById("siteInfoModalOverlay");
const siteInfoModalBody = document.getElementById("siteInfoModalBody");
document.getElementById("siteInfoBtn").onclick = () => {
  siteInfoModalBody.innerHTML = `
    <div style="text-align:center;margin:0 -14px 14px -14px">
      <img src="assets/logo.png" style="max-width:70%;border-radius:6px">
    </div>
    <div style="text-align:center;font-size:30px;font-weight:bold;padding-bottom:12px;margin: -100px 20px">
      <span style="color:#0000FF">Roblox</span> <span style="color:#0389ff">Obby</span> <span style="color:#00ffff">Index</span>
    </div>
    <div style="text-align:center;font-size:15px;font-weight:bold; margin-bottom:5px">
      <span>Roblox Obby Index is a quick and convenient list of all obbies in Roblox, including towers, tiered obbies, jumps, and so on</span>
      <span>Inspiration: SCLP</span>
      <span>Owner and developer: KirillLegenda (KirillMatter)</span>
      <span>Staff: ddlghl</span>
    </div>
  `
  siteInfoModalOverlay.classList.add("open");
};
document.getElementById("siteInfoModalClose").onclick = () => siteInfoModalOverlay.classList.remove("open");
siteInfoModalOverlay.addEventListener("click", (e) => { if (e.target === siteInfoModalOverlay) siteInfoModalOverlay.classList.remove("open"); });

async function loadTowers() {
  try {
    const res = await fetch(GVIZ_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const raw = await res.json();
    const json = JSON.parse(raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")));
    const cols = json.table.cols.map(c => (c.label || "").toLowerCase());

    let iN    = cols.indexOf("name");
    let iD    = cols.indexOf("difficulty");
    let iVer  = cols.indexOf("verified");
    let iVBy  = cols.indexOf("verifier");
    let iTier = cols.indexOf("type");
    let iAuth = cols.indexOf("author");
    let iQual = cols.indexOf("quality");
    let iLoc  = cols.indexOf("location");
    let iLink = cols.indexOf("link");
    let iTags = cols.indexOf("tags");
    let iLen  = cols.indexOf("length");

    if (iN < 0) iN = 0;
    if (iD < 0) iD = 1;
    if (iVer < 0) iVer = 2;
    if (iVBy < 0) iVBy = 3;
    if (iTier < 0) iTier = 4;
    if (iAuth < 0) iAuth = 5;
    if (iQual < 0) iQual = 6;
    if (iLoc < 0) iLoc = 7;
    if (iLink < 0) iLink = 8;
    if (iTags < 0) iTags = 9;
    if (iLen < 0) iLen = 10;

    const towers = [];
    const tagSet = new Set(KNOWN_TAGS);
    const typeSet = new Set();

    for (const [rowIdx, row] of json.table.rows.entries()) {
      if (rowIdx === 0) continue;

      const c = row.c || [];
      const name = cellText(c[iN]);
      if (!name) continue;

      const verifiedRaw = cellText(c[iVer]).toLowerCase();
      const verified = verifiedRaw === "verified" || verifiedRaw === "true" || verifiedRaw === "yes";
      const verifier = verified ? cellText(c[iVBy]) : "";

      const tier = cellText(c[iTier]);
      const tagsRaw = cellText(c[iTags]);
      const tags = tagsRaw ? tagsRaw.split(";").map(s => s.trim()).filter(Boolean) : [];
      tags.forEach(t => tagSet.add(t));
      if (tier) typeSet.add(tier);

      const lengthRaw = cellText(c[iLen]);

      towers.push({
        name,
        difficulty: parseDifficultyCell(c[iD], tier),
        verified,
        verifier,
        tier,
        author: cellText(c[iAuth]),
        quality: cellText(c[iQual]).toUpperCase(),
        location: cellText(c[iLoc]),
        link: cellText(c[iLink]),
        tags,
        lengthRaw
      });
    }

    state.towers = towers;
    state.allTags = Array.from(tagSet);
    state.allTypes = Array.from(typeSet).sort((a,b) => a.localeCompare(b));
    buildTagMenu();
    buildTypeMenu();
    renderList();
  } catch (e) {
    listEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
  }
}
function cellText(cell){ if(!cell) return ""; const v = cell.f ?? cell.v; return v == null ? "" : String(v).trim(); }
function cellNum(cell){
  if(!cell) return null;
  let v = cell.v;
  if (typeof v === "string") v = parseFloat(v.replace(",", "."));
  if (v == null || isNaN(v)) { const f = parseFloat(String(cell.f).replace(",", ".")); return isNaN(f) ? null : f; }
  return v;
}

function normType(t){ return (t || "").trim().toLowerCase(); }

function effectiveDifficultyValue(t){
  const d = t.difficulty;
  if (d == null) return null;
  if (isUnknownDiff(d)) return UNKNOWN;
  if (isTextOnlyDiff(d)) return textOnlyValue(d);

  const nt = normType(t.tier);
  if (isTierSubtierDiff(d)) return tierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);
  if (nt === "obby") return tierToVirtualDifficulty(Math.floor(d));
  if (nt === "jump") return jumpToVirtualDifficulty(Math.floor(d));
  return d; // regular numeric difficulty (towers, etc.)
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
    return { text: d.subtierName + " Tier " + d.tierNum, color: "#888" };
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
    if (nt === "jump") return jumpToVirtualDifficulty(Math.floor(d));
    return d;
  }
  if (TIER_TYPES.includes(nt)) return tierToVirtualDifficulty(Math.floor(d));
  return d;
}

function renderList() {
  let arr = state.towers.slice();

  if (state.search) {
    arr = arr.filter(t => t.name.toLowerCase().includes(state.search));
  }

  if (state.diffFilters.size) {
    arr = arr.filter(t => {
      const nt = normType(t.tier);
      const d = t.difficulty;

      if (state.diffFilters.has(UNKNOWN) && isUnknownDiff(d)) return true;
      if (isUnknownDiff(d)) return false;
      if (RAW_TYPES.includes(nt) || TIER_TYPES.includes(nt)) return false;

      if (isTextOnlyDiff(d)) return state.diffFilters.has(d.index);

      const ci = diffClass(d);
      return ci != null && state.diffFilters.has(ci);
    });
  }

  if (state.tagFilters.size) {
    arr = arr.filter(t => t.tags.some(tag => state.tagFilters.has(tag)));
  }

  if (state.typeFilters.size) {
    arr = arr.filter(t => state.typeFilters.has(t.tier));
  }

  if (state.tierFilters.size) {
    arr = arr.filter(t => {
      const nt = normType(t.tier);
      if (!TIER_TYPES.includes(nt) || t.difficulty == null) return false;
      if (isUnknownDiff(t.difficulty) || isTextOnlyDiff(t.difficulty)) return false;
      const raw = isTierSubtierDiff(t.difficulty) ? t.difficulty.tierNum : t.difficulty;
      const tierNum = Math.floor(raw);
      if (tierNum > 25) return state.tierFilters.has("25+");
      return state.tierFilters.has(String(tierNum));
    });
  }

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

  listEl.innerHTML = "";
  if (!arr.length) { listEl.innerHTML = '<div class="muted">There is no obby based on the selected filters</div>'; return; }

  arr.forEach((t, idx) => {
    const fd = formatDifficulty(t);
    const row = document.createElement("div");
    row.className = "row" + (state.selected === t ? " sel" : "");
    row.innerHTML = `<span class="n">#${idx + 1}</span><span class="name">${esc(t.name)}</span><span class="d" style="color:${fd.color}">${esc(fd.text)}</span>`;
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

  infoEl.innerHTML = `
    <div class="t">${esc(t.name)}</div>
    <div class="kv">
      <span>Name</span><b>${esc(t.name)}</b>
      <span>Difficulty</span><b style="color:${fd.color}">${esc(fd.text)}</b>
      <span>Status</span><b>${statusText}</b>
      ${verifierRow}
      <span>Type</span><b>${t.tier ? esc(t.tier) : "N/A"}</b>
      <span>Length</span><b>${lengthDisplay}</b>
      <span>Author(s)</span><b>${t.author ? esc(t.author) : "N/A"}</b>
      <span>Quality</span><b>${t.quality || "N/A"}</b>
      <span>Location(s)</span><b>${locHtml}</b>
      <span>Tags</span><b>${tagsHtml}</b>
    </div>`;
}

updateBtnLabels();
buildTagMenu();
buildTypeMenu();
loadTowers();