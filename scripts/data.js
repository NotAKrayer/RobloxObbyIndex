const DATA_URL = "data/data.json";

function cellText(cell){ if(!cell) return ""; const v = cell.f ?? cell.v; return v == null ? "" : String(v).trim(); }
function cellNum(cell){
  if(!cell) return null;
  let v = cell.v;
  if (typeof v === "string") v = parseFloat(v.replace(",", "."));
  if (v == null || isNaN(v)) { const f = parseFloat(String(cell.f).replace(",", ".")); return isNaN(f) ? null : f; }
  return v;
}

function normType(t){ return (t || "").trim().toLowerCase(); }

let GAMES_MAP = {};
function setGamesMap(games){ GAMES_MAP = games || {}; }

function resolveTowerLinks(t){
  if (t._linkList) return t._linkList;
  const locs = splitLocations(t.location);
  const links = splitLocations(t.link);
  let out;
  if (links.length >= locs.length) {
    out = links;
  } else {
    let j = 0;
    out = locs.map(loc => {
      const known = GAMES_MAP[baseGameName(loc).toLowerCase()];
      return known || links[j++] || "";
    });
  }
  t._linkList = out;
  return out;
}

async function loadTowers() {
  try {
    const freshUrl = DATA_URL + "?_=" + Date.now();
    const res = await fetch(freshUrl, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", "Pragma": "no-cache" }
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    setGamesMap(data.games || {});
    state.towers = Array.isArray(data.towers) ? data.towers : [];
    state.allTags = Array.isArray(data.allTags) ? data.allTags : [];
    state.allTypes = Array.isArray(data.allTypes) ? data.allTypes : [];
    if (typeof globalRankByTower !== "undefined") {
      globalRankByTower = new Map();
      globalRankSortKey = null;
    }
    buildTagMenu();
    buildTypeMenu();
    buildAuthorMenu();
    buildGameMenu();
    renderList();
    if (typeof initRoulette === "function") initRoulette();
    if (typeof setLeaderboardUpdated === "function") setLeaderboardUpdated(data.fetchedAt);
    if (typeof loadPacksFromData === "function") loadPacksFromData(data.packs || []);
    if (typeof loadLeaderboardFromData === "function") loadLeaderboardFromData(data.players || []);
  } catch (e) {
    listEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
    const packListEl = document.getElementById("packList");
    if (packListEl) packListEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
    const leaderboardListEl = document.getElementById("leaderboardList");
    if (leaderboardListEl) leaderboardListEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
  }
}
