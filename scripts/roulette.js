const ROULETTE_KINDS = ["jump", "obby", "etoh"];

const rouletteState = {
  range: {
    jump: { min: null, max: null },
    obby: { min: null, max: null },
    etoh: { min: null, max: null }
  },
  shownKind: null,
  quality: new Map(),
  tags: new Map(),
  length: new Map(),
  type: new Map(),
  author: new Map(),
  picked: null,
  spinning: false
};

const rouletteKindsEl = document.getElementById("rouletteKinds");
const rouletteRangeBoxes = Array.from(document.querySelectorAll(".range-box"));
const ROULETTE_RANGE_INPUTS = {
  jump: { min: document.getElementById("rouletteJumpMin"), max: document.getElementById("rouletteJumpMax") },
  obby: { min: document.getElementById("rouletteObbyMin"), max: document.getElementById("rouletteObbyMax") },
  etoh: { min: document.getElementById("rouletteEtohMin"), max: document.getElementById("rouletteEtohMax") }
};
const rouletteCountEl = document.getElementById("rouletteCount");
const rouletteDisplayEl = document.getElementById("rouletteDisplay");
const rouletteSpinBtn = document.getElementById("rouletteSpinBtn");
const rouletteInfoEl = document.getElementById("rouletteInfo");

function rouletteDrop(prefix, label, map) {
  return {
    label,
    map,
    btn: document.getElementById(prefix + "Btn"),
    menu: document.getElementById(prefix + "Menu"),
    dd: document.getElementById(prefix + "Dropdown"),
    search: document.getElementById(prefix + "Search"),
    list: document.getElementById(prefix + "List"),
    names: []
  };
}

const ROULETTE_DROPS = {
  quality: rouletteDrop("rouletteQuality", "Quality", rouletteState.quality),
  tags: rouletteDrop("rouletteTag", "Tags", rouletteState.tags),
  length: rouletteDrop("rouletteLength", "Length", rouletteState.length),
  type: rouletteDrop("rouletteType", "Type", rouletteState.type),
  author: rouletteDrop("rouletteAuthor", "Authors", rouletteState.author)
};

function lengthMinutes(raw) {
  const m = String(raw || "").match(/(<)?\s*([\d.]+)\+?\s*(sec|min|hours?)/i);
  if (!m) return Infinity;
  let v = parseFloat(m[2]);
  const unit = m[3].toLowerCase();
  if (unit === "sec") v /= 60;
  else if (unit.startsWith("hour")) v *= 60;
  return m[1] ? v - 0.001 : v;
}

function parseRangeNumber(raw) {
  const s = String(raw || "").trim().replace(/,/g, ".");
  if (!s) return { ok: true, value: null };
  if (!/^(\d+(\.\d+)?|\.\d+)$/.test(s)) return { ok: false, value: null };
  return { ok: true, value: parseFloat(s) };
}

function parseTierOption(raw, isMax) {
  if (raw === "" || raw == null) return { ok: true, value: null };
  const n = parseInt(raw, 10);
  if (isNaN(n)) return { ok: false, value: null };
  return { ok: true, value: isMax && n > 25 ? Infinity : n };
}

function readRangeInput(kind, side) {
  const el = ROULETTE_RANGE_INPUTS[kind][side];
  if (kind === "obby") return parseTierOption(el.value, side === "max");
  return parseRangeNumber(el.value);
}

function rouletteReadRange(kind) {
  const lo = readRangeInput(kind, "min");
  const hi = readRangeInput(kind, "max");
  ROULETTE_RANGE_INPUTS[kind].min.classList.toggle("invalid", !lo.ok);
  ROULETTE_RANGE_INPUTS[kind].max.classList.toggle("invalid", !hi.ok);
  let min = lo.value, max = hi.value;
  if (min != null && max != null && min > max) {
    const tmp = min;
    min = max;
    max = tmp;
  }
  rouletteState.range[kind] = { min, max };
}

function rouletteRangeActive(kind) {
  const r = rouletteState.range[kind];
  return r.min != null || r.max != null;
}

function rouletteRangeValue(kind, t) {
  const nt = normType(t.tier);
  const d = t.difficulty;
  if (kind === "jump") {
    if (nt !== "jump") return null;
    return typeof d === "number" && isFinite(d) ? d : null;
  }
  if (kind === "obby") {
    if (!TIER_TYPES.includes(nt)) return null;
    if (isTierSubtierDiff(d)) return Math.floor(d.tierNum);
    return typeof d === "number" && isFinite(d) ? Math.floor(d) : null;
  }
  if (nt === "jump" || TIER_TYPES.includes(nt)) return null;
  return typeof d === "number" && isFinite(d) ? d : null;
}

function rouletteRangeMatch(kind, t) {
  const v = rouletteRangeValue(kind, t);
  if (v == null) return false;
  const r = rouletteState.range[kind];
  const eps = 1e-9;
  if (r.min != null && v < r.min - eps) return false;
  if (r.max != null && v > r.max + eps) return false;
  return true;
}

function rouletteDifficultyPass(t) {
  const active = ROULETTE_KINDS.filter(rouletteRangeActive);
  if (!active.length) return true;
  return active.some(kind => rouletteRangeMatch(kind, t));
}

function rouletteQualityKey(t) {
  return t.quality && t.quality !== "---" ? t.quality : "N/A";
}

function rouletteLengthKey(t) {
  return t.lengthRaw || "N/A";
}

function rouletteMatch(map, keys) {
  if (!map.size) return true;
  const { include, exclude } = splitFilters(map);
  if (keys.some(k => exclude.has(k))) return false;
  if (!include.size) return true;
  return keys.some(k => include.has(k));
}

function roulettePool() {
  return state.towers.filter(t => {
    if (!rouletteDifficultyPass(t)) return false;
    if (!rouletteMatch(rouletteState.quality, [rouletteQualityKey(t)])) return false;
    if (!rouletteMatch(rouletteState.tags, t.tags || [])) return false;
    if (!rouletteMatch(rouletteState.length, [rouletteLengthKey(t)])) return false;
    if (!rouletteMatch(rouletteState.type, [t.tier || ""])) return false;
    if (!rouletteMatch(rouletteState.author, splitAuthors(t.author))) return false;
    return true;
  });
}

function rouletteUpdateCount() {
  const n = roulettePool().length;
  rouletteCountEl.textContent = `Found ${n} ${n === 1 ? "obby" : "obbies"} matching your criteria`;
  rouletteSpinBtn.disabled = rouletteState.spinning || n === 0;
}

function rouletteUpdateLabels() {
  Object.values(ROULETTE_DROPS).forEach(d => {
    d.btn.textContent = filterBtnLabel(d.label, d.map);
  });
  Array.from(rouletteKindsEl.children).forEach(btn => {
    const kind = btn.dataset.kind;
    btn.classList.toggle("shown", rouletteState.shownKind === kind);
    btn.classList.toggle("applied", rouletteRangeActive(kind));
  });
  rouletteRangeBoxes.forEach(box => {
    box.style.display = box.dataset.kind === rouletteState.shownKind ? "" : "none";
  });
}

function rouletteOnChange() {
  rouletteUpdateLabels();
  rouletteUpdateCount();
}

function rouletteRenderOptions(key) {
  const d = ROULETTE_DROPS[key];
  const box = d.list || d.menu;
  box.innerHTML = "";
  const q = d.search ? d.search.value.trim().toLowerCase() : "";
  const shown = q ? d.names.filter(n => n.toLowerCase().includes(q)) : d.names;
  if (!shown.length) {
    const empty = document.createElement("div");
    empty.className = "muted";
    empty.style.padding = "4px 6px";
    empty.textContent = "Nothing found";
    box.appendChild(empty);
    return;
  }
  shown.forEach(n => buildTristateOption(box, d.map, n, n, rouletteOnChange));
}

function rouletteBuildNames() {
  const lengths = Array.from(new Set(state.towers.map(rouletteLengthKey)));
  lengths.sort((a, b) => lengthMinutes(a) - lengthMinutes(b));
  ROULETTE_DROPS.quality.names = QUALITIES.concat(["N/A"]);
  ROULETTE_DROPS.tags.names = state.allTags.slice();
  ROULETTE_DROPS.length.names = lengths;
  ROULETTE_DROPS.type.names = state.allTypes.slice();
  ROULETTE_DROPS.author.names = computeAllAuthors();
  Object.keys(ROULETTE_DROPS).forEach(rouletteRenderOptions);
}

function rouletteRenderInfo() {
  if (!rouletteState.picked) {
    rouletteInfoEl.innerHTML = '<div class="muted">Press "Random Obby" to pick an obby</div>';
    return;
  }
  renderInfo(rouletteState.picked, rouletteInfoEl);
}

function refreshRoulette() {
  if (rouletteState.picked) rouletteRenderInfo();
}

function rouletteSpin() {
  if (rouletteState.spinning) return;
  const pool = roulettePool();
  if (!pool.length) return;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  rouletteState.spinning = true;
  rouletteSpinBtn.disabled = true;
  let ticks = 0;
  const total = 14;
  const timer = setInterval(() => {
    ticks++;
    if (ticks >= total) {
      clearInterval(timer);
      rouletteState.spinning = false;
      rouletteState.picked = pick;
      rouletteDisplayEl.textContent = pick.name;
      rouletteRenderInfo();
      rouletteUpdateCount();
      return;
    }
    rouletteDisplayEl.textContent = pool[Math.floor(Math.random() * pool.length)].name;
  }, 55);
}

function rouletteClear() {
  rouletteState.shownKind = null;
  ROULETTE_KINDS.forEach(kind => {
    ["min", "max"].forEach(side => {
      const el = ROULETTE_RANGE_INPUTS[kind][side];
      el.value = "";
      el.classList.remove("invalid");
    });
    rouletteState.range[kind] = { min: null, max: null };
  });
  Object.values(ROULETTE_DROPS).forEach(d => {
    d.map.clear();
    if (d.search) d.search.value = "";
  });
  Object.keys(ROULETTE_DROPS).forEach(rouletteRenderOptions);
  rouletteOnChange();
}

function rouletteBuildTierOptions() {
  ["min", "max"].forEach(side => {
    const sel = ROULETTE_RANGE_INPUTS.obby[side];
    sel.innerHTML = "";
    const any = document.createElement("option");
    any.value = "";
    any.textContent = "Any";
    sel.appendChild(any);
    for (let i = 1; i <= 26; i++) {
      const o = document.createElement("option");
      o.value = String(i);
      o.textContent = i === 26 ? "25+" : String(i);
      sel.appendChild(o);
    }
  });
}

function initRoulette() {
  rouletteBuildNames();
  rouletteOnChange();
}

rouletteBuildTierOptions();

Array.from(rouletteKindsEl.children).forEach(btn => {
  btn.onclick = () => {
    const kind = btn.dataset.kind;
    rouletteState.shownKind = rouletteState.shownKind === kind ? null : kind;
    rouletteUpdateLabels();
  };
});

ROULETTE_KINDS.forEach(kind => {
  ["min", "max"].forEach(side => {
    const el = ROULETTE_RANGE_INPUTS[kind][side];
    el.addEventListener(kind === "obby" ? "change" : "input", () => {
      rouletteReadRange(kind);
      rouletteOnChange();
    });
  });
});

Object.entries(ROULETTE_DROPS).forEach(([key, d]) => {
  d.btn.onclick = e => {
    e.stopPropagation();
    const wasOpen = d.menu.classList.contains("open");
    Object.values(ROULETTE_DROPS).forEach(x => x.menu.classList.remove("open"));
    if (!wasOpen) {
      d.menu.classList.add("open");
      if (d.search) d.search.focus();
    }
  };
  if (d.search) {
    d.search.addEventListener("click", e => e.stopPropagation());
    d.search.addEventListener("input", () => rouletteRenderOptions(key));
  }
});

document.addEventListener("click", e => {
  Object.values(ROULETTE_DROPS).forEach(d => {
    if (!d.dd.contains(e.target)) d.menu.classList.remove("open");
  });
});

document.getElementById("rouletteClear").onclick = rouletteClear;
rouletteSpinBtn.onclick = rouletteSpin;
rouletteSpinBtn.disabled = true;
