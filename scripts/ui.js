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
