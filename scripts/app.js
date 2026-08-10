const GVIZ_URL = "https://robloxobbyindex.kirillrahimov80.workers.dev";

const DIFFS = ["Effortless","Easy","Medium","Hard","Difficult","Challenging","Intense","Remorseless","Insane","Extreme","Terrifying","Catastrophic","Horrific","Unreal","Nil","Error","Literal"];
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
  "rgb(12,27,43)"       // Literal
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

const QUALITIES = ["SS","S+","S","S-","A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F+","F","F-","X"];
const KNOWN_TAGS = ["Purist","Wallhop","Checkpoints","Speedrun","Jank","Camera control","CO Based","Buff","Nerf","Old Version","Segment","Obby","Tower","Jump"];
const RAW_TYPES = ["jump", "wallhop"];      // number shown as-is, no formatting
const TIER_TYPES = ["obby"];     // shown as "Tier N"
const NO_SUBTIER_TYPES = ["jump","obby","wallhop"];

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
        difficulty: cellNum(c[iD]),
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

function diffClass(d){
  if (d == null) return null;
  const i = Math.floor(d);
  return (i < 0 || i >= DIFFS.length) ? null : i;
}
function qualityRank(q){ if(!q) return null; const i = QUALITIES.indexOf(q); return i < 0 ? null : i; }
function esc(s){ return String(s).replace(/[&<>"']/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m])); }

function formatDifficulty(t){
  const nt = normType(t.tier);
  if (t.difficulty == null) return { text: "N/A", color: "#888" };

  if (RAW_TYPES.includes(nt)) {
    return { text: String(t.difficulty), color: "#888" };
  }

  if (TIER_TYPES.includes(nt)) {
    const tierNum = Math.floor(t.difficulty);
    return { text: "Tier " + tierNum, color: "#888" };
  }

  const ci = diffClass(t.difficulty);
  const col = ci == null ? "#888" : COLORS[ci];
  const name = ci == null ? "N/A" : DIFFS[ci];
  let text = String(t.difficulty) + (ci != null ? " · " + name : "");
  if (!NO_SUBTIER_TYPES.includes(nt)) {
    const st = subtierFor(t.difficulty);
    if (st) text += " (" + st + ")";
  }
  return { text, color: col };
}

function sortValue(t){
  const nt = normType(t.tier);
  if (t.difficulty == null) return -Infinity;
  if (RAW_TYPES.includes(nt)) return t.difficulty;
  if (TIER_TYPES.includes(nt)) return Math.floor(t.difficulty);
  return t.difficulty;
}

function renderList() {
  let arr = state.towers.slice();

  if (state.search) {
    arr = arr.filter(t => t.name.toLowerCase().includes(state.search));
  }

  if (state.diffFilters.size) {
    arr = arr.filter(t => {
      const nt = normType(t.tier);
      if (RAW_TYPES.includes(nt) || TIER_TYPES.includes(nt)) return false;
      const ci = diffClass(t.difficulty);
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
      const tierNum = Math.floor(t.difficulty);
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
