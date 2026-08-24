const state = {
  towers: [],
  diffFilters: new Map(),
  tagFilters: new Map(),
  typeFilters: new Map(),
  tierFilters: new Map(),
  authorFilters: new Map(),
  sort: "difficulty",
  dir: "desc",
  selected: null,
  search: "",
  allTags: [],
  allTypes: [],
  allAuthors: [],
  authorSearch: ""
};

// Splits a tower's "author" field ("A, B, C") into a trimmed array of names.
function splitAuthors(authorStr){
  if (!authorStr) return [];
  return authorStr.split(",").map(s => s.trim()).filter(Boolean);
}

// Cycles a tri-state filter entry: none -> include -> exclude -> none.
// `map` is one of the state filter Maps, `key` identifies the filter value.
// Returns the resulting state ("include", "exclude", or null).
function cycleFilterState(map, key){
  const cur = map.get(key);
  let next;
  if (cur == null) next = "include";
  else if (cur === "include") next = "exclude";
  else next = null;
  if (next == null) map.delete(key);
  else map.set(key, next);
  return next;
}



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

const authorMenu = document.getElementById("authorMenu");
const authorBtn = document.getElementById("authorBtn");
const authorDropdown = document.getElementById("authorDropdown");
const authorList = document.getElementById("authorList");
const authorSearchInput = document.getElementById("authorSearch");

// Builds a tri-state filter option: click cycles none -> include -> exclude -> none.
function buildTristateOption(container, map, key, labelText){
  const label = document.createElement("label");
  const swatch = document.createElement("span");
  swatch.className = "tristate";
  const curState = map.get(key);
  if (curState === "include") { label.classList.add("state-include"); swatch.classList.add("state-include"); }
  if (curState === "exclude") { label.classList.add("state-exclude"); swatch.classList.add("state-exclude"); }
  label.onclick = (e) => {
    e.preventDefault();
    const next = cycleFilterState(map, key);
    label.classList.remove("state-include", "state-exclude");
    swatch.classList.remove("state-include", "state-exclude");
    if (next === "include") { label.classList.add("state-include"); swatch.classList.add("state-include"); }
    if (next === "exclude") { label.classList.add("state-exclude"); swatch.classList.add("state-exclude"); }
    updateBtnLabels();
    renderList();
  };
  label.appendChild(swatch);
  label.appendChild(document.createTextNode(" " + labelText));
  container.appendChild(label);
  return label;
}

const TIER_BANDS = Array.from({length:26}, (_, i) => String(i)).concat(["25+"]);
DIFFS.forEach((d, i) => {
  buildTristateOption(diffMenu, state.diffFilters, i, d);
});

(function addUnknownFilterOption(){
  buildTristateOption(diffMenu, state.diffFilters, UNKNOWN, "Unknown");
})();

function buildTagMenu(){
  tagMenu.innerHTML = "";
  state.allTags.forEach(tag => {
    buildTristateOption(tagMenu, state.tagFilters, tag, tag);
  });
}

function buildTypeMenu(){
  typeMenu.innerHTML = "";
  state.allTypes.forEach(type => {
    buildTristateOption(typeMenu, state.typeFilters, type, type);
  });
}

// Derives the sorted unique list of individual author names from all towers,
// splitting each tower's comma-separated "author" field.
function computeAllAuthors(){
  const set = new Set();
  state.towers.forEach(t => splitAuthors(t.author).forEach(a => set.add(a)));
  return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
}

function buildAuthorMenu(){
  state.allAuthors = computeAllAuthors();
  renderAuthorList();
}

function renderAuthorList(){
  authorList.innerHTML = "";
  const q = state.authorSearch.toLowerCase();
  const names = q ? state.allAuthors.filter(a => a.toLowerCase().includes(q)) : state.allAuthors;
  if (!names.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "4px 6px";
    empty.textContent = "No authors found";
    authorList.appendChild(empty);
    return;
  }
  names.forEach(name => {
    buildTristateOption(authorList, state.authorFilters, name, name);
  });
}

authorSearchInput.addEventListener("click", e => e.stopPropagation());
authorSearchInput.addEventListener("input", e => {
  state.authorSearch = e.target.value;
  renderAuthorList();
});

TIER_BANDS.forEach(band => {
  buildTristateOption(tierMenu, state.tierFilters, band, "Tier " + band);
});

[[diffBtn, diffMenu, diffDropdown],[tagBtn, tagMenu, tagDropdown],[typeBtn, typeMenu, typeDropdown],[tierBtn, tierMenu, tierDropdown],[authorBtn, authorMenu, authorDropdown]].forEach(([btn, menu, dd]) => {
  btn.onclick = (e) => {
    e.stopPropagation();
    const wasOpen = menu.classList.contains("open");
    [diffMenu, tagMenu, typeMenu, tierMenu, authorMenu].forEach(m => m.classList.remove("open"));
    if (!wasOpen) {
      menu.classList.add("open");
      if (menu === authorMenu) authorSearchInput.focus();
    }
  };
});
document.addEventListener("click", (e) => {
  if (!diffDropdown.contains(e.target)) diffMenu.classList.remove("open");
  if (!tagDropdown.contains(e.target)) tagMenu.classList.remove("open");
  if (!typeDropdown.contains(e.target)) typeMenu.classList.remove("open");
  if (!tierDropdown.contains(e.target)) tierMenu.classList.remove("open");
  if (!authorDropdown.contains(e.target)) authorMenu.classList.remove("open");
});

function filterBtnLabel(base, map){
  if (!map.size) return base + " ▾";
  let inc = 0, exc = 0;
  map.forEach(v => v === "exclude" ? exc++ : inc++);
  const parts = [];
  if (inc) parts.push(inc + "+");
  if (exc) parts.push(exc + "-");
  return base + " (" + parts.join(" ") + ") ▾";
}

function updateBtnLabels(){
  diffBtn.textContent = filterBtnLabel("Difficulty", state.diffFilters);
  tagBtn.textContent = filterBtnLabel("Tags", state.tagFilters);
  typeBtn.textContent = filterBtnLabel("Type", state.typeFilters);
  tierBtn.textContent = filterBtnLabel("Tier", state.tierFilters);
  authorBtn.textContent = filterBtnLabel("Authors", state.authorFilters);
}

document.getElementById("clear").onclick = () => {
  state.diffFilters.clear();
  state.tagFilters.clear();
  state.typeFilters.clear();
  state.tierFilters.clear();
  state.authorFilters.clear();
  state.authorSearch = "";
  authorSearchInput.value = "";
  [diffMenu, tagMenu, typeMenu, tierMenu, authorMenu].forEach(menu => {
    menu.querySelectorAll("label").forEach(label => {
      label.classList.remove("state-include", "state-exclude");
      const sw = label.querySelector(".tristate");
      if (sw) sw.classList.remove("state-include", "state-exclude");
    });
  });
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
        <button onclick="window.open('https://discord.gg/D8PVcPR4Uj', '_blank')" class="discord-btn">Our Discord</button>
    </div>
  `
  siteInfoModalOverlay.classList.add("open");
};
document.getElementById("siteInfoModalClose").onclick = () => siteInfoModalOverlay.classList.remove("open");
siteInfoModalOverlay.addEventListener("click", (e) => { if (e.target === siteInfoModalOverlay) siteInfoModalOverlay.classList.remove("open"); });

document.getElementById("randomBtn").onclick = () => {
  const arr = getFilteredTowers();
  if (!arr.length) return;
  const pick = arr[Math.floor(Math.random() * arr.length)];
  state.selected = pick;
  renderList();
  renderInfo(pick);
  const row = listEl.querySelector(".row.sel");
  if (row) row.scrollIntoView({ block: "nearest" });
};
