const leaderboardState = {
  players: [],
  sort: "level",
  dir: "desc",
  selected: null,
  search: ""
};

const leaderboardListEl = document.getElementById("leaderboardList");
const leaderboardInfoEl = document.getElementById("leaderboardInfo");

document.getElementById("leaderboardSort").onchange = e => {
  leaderboardState.sort = e.target.value;
  renderLeaderboardList();
};

document.getElementById("leaderboardSearch").oninput = e => {
  leaderboardState.search = e.target.value.trim().toLowerCase();
  renderLeaderboardList();
};

const leaderboardDirBtn = document.getElementById("leaderboardDir");
leaderboardDirBtn.onclick = () => {
  leaderboardState.dir = leaderboardState.dir === "asc" ? "desc" : "asc";
  leaderboardDirBtn.textContent = leaderboardState.dir === "asc" ? "▲ Low → High" : "▼ High → Low";
  renderLeaderboardList();
};

function leaderboardSortValue(p) {
  if (leaderboardState.sort === "completions") return p.completionCount;
  if (leaderboardState.sort === "hardest") return p.hardestDifficultyValue == null ? -Infinity : p.hardestDifficultyValue;
  return p.totalXp;
}

function getFilteredLeaderboard() {
  let arr = leaderboardState.players.slice();
  if (leaderboardState.search) {
    arr = arr.filter(p => p.nickname.toLowerCase().includes(leaderboardState.search));
  }
  return arr;
}

function sortLeaderboard(arr) {
  arr.sort((a, b) => {
    const r = leaderboardSortValue(a) - leaderboardSortValue(b);
    return leaderboardState.dir === "desc" ? -r : r;
  });
  return arr;
}

let globalLeaderboardRankByPlayer = new Map();
let globalLeaderboardRankSortKey = null;

function ensureGlobalLeaderboardRanks() {
  const key = leaderboardState.sort + "|" + leaderboardState.dir;
  if (globalLeaderboardRankSortKey === key && globalLeaderboardRankByPlayer.size === leaderboardState.players.length) return;
  const allRanked = sortLeaderboard(leaderboardState.players.slice());
  globalLeaderboardRankByPlayer = new Map();
  allRanked.forEach((p, idx) => globalLeaderboardRankByPlayer.set(p, idx + 1));
  globalLeaderboardRankSortKey = key;
}

function leaderboardSummaryText(p) {
  if (leaderboardState.sort === "completions") return p.completionCount + " completed";
  if (leaderboardState.sort === "hardest") {
    return p.hardestTowerName ? p.hardestTowerName : "N/A";
  }
  return "Level " + p.level + " · " + p.totalXp + " xp";
}

function renderLeaderboardList() {
  ensureGlobalLeaderboardRanks();

  let arr = sortLeaderboard(getFilteredLeaderboard());

  const countEl = document.getElementById("leaderboardListCount");
  if (countEl) {
    countEl.textContent = leaderboardState.search
      ? `(${arr.length} of ${leaderboardState.players.length})`
      : `(${arr.length})`;
  }

  leaderboardListEl.innerHTML = "";
  if (!arr.length) { leaderboardListEl.innerHTML = '<div class="muted">There is no player based on the selected filters</div>'; return; }

  arr.forEach((p) => {
    const row = document.createElement("div");
    row.className = "row" + (leaderboardState.selected === p ? " sel" : "");
    row.innerHTML = `<span class="n">#${globalLeaderboardRankByPlayer.get(p)}</span><span class="name">${esc(p.nickname)}</span><span class="d">${esc(leaderboardSummaryText(p))}</span>`;
    row.onclick = () => { leaderboardState.selected = p; renderLeaderboardList(); renderLeaderboardInfo(p); };
    leaderboardListEl.appendChild(row);
  });
}

function renderLeaderboardInfo(p) {
  if (!p) { leaderboardInfoEl.innerHTML = '<div class="muted">Select a player to view details</div>'; return; }

  ensureGlobalLeaderboardRanks();
  const rankLevel = (function(){
    const key = "level|desc";
    if (globalLeaderboardRankSortKey === key) return globalLeaderboardRankByPlayer.get(p);
    const ranked = sortLeaderboard(leaderboardState.players.slice().sort((a,b) => leaderboardSortValue(b)-leaderboardSortValue(a)));
    return ranked.indexOf(p) + 1;
  })();

  const completionRows = p.completions.map((c, idx) => {
    const towerObj = (typeof state !== "undefined" && state.towers)
      ? state.towers.find(tt => (c.towerId != null && tt.id === c.towerId) || tt.name.toLowerCase() === c.towerName.toLowerCase())
      : null;
    const diffColor = towerObj ? formatDifficulty(towerObj).color : "#888";
    return `<div class="pack-tower-row">
      <span class="pn">#${idx + 1}</span>
      <span class="pname" data-tower="${esc(c.towerName)}">${esc(c.towerName)}</span>
      <span class="pd" style="color:${diffColor}">${esc(c.difficultyText)}${c.xp != null ? " · " + c.xp + "xp" : ""}</span>
    </div>`;
  }).join("");

  const xpIntoLevel = p.xpIntoLevel != null ? p.xpIntoLevel : 0;
  const xpForNextLevel = p.xpForNextLevel != null ? p.xpForNextLevel : null;
  const xpProgressText = xpForNextLevel != null ? ` (${xpIntoLevel} / ${xpForNextLevel} xp)` : "";

  const allPacks = (typeof packState !== "undefined" && packState.packs) || [];
  const completedPacks = completedPacksForPlayer(p);
  const totalBonusXp = completedPacks.reduce((acc, pk) => acc + packBonusXp(pk), 0);

  const packRows = completedPacks.length
    ? completedPacks.map(pk => `<div class="pack-tower-row">
        <span class="done-check" title="Pack completed">✓</span>
        <span class="pname" data-pack="${esc(pk.name)}">${esc(pk.name)}</span>
        <span class="pd">${pk.obbyCount} obbies · +${packBonusXp(pk)} bonus xp</span>
      </div>`).join("")
    : '<div class="muted">No packs completed yet</div>';

  leaderboardInfoEl.innerHTML = `
    <div class="t">${esc(p.nickname)}</div>
    <div class="kv">
      <span>Nickname</span><b>${esc(p.nickname)}</b>
      <span>Nationality</span><b>${p.nationality ? esc(p.nationality) : "N/A"}</b>
      <span>Rank</span><b>#${rankLevel}</b>
      <span>Level</span><b>${p.level}${esc(xpProgressText)}</b>
      <span>Total XP</span><b>${p.totalXp}</b>
      <span>Completions</span><b>${p.completionCount}</b>
      <span>Hardest</span><b>${p.hardestTowerName ? esc(p.hardestTowerName) : "N/A"}</b>
      <span>Packs Completed</span><b>${completedPacks.length} / ${allPacks.length}</b>
      <span>Pack Bonus XP</span><b>+${totalBonusXp}</b>
    </div>
    <div class="kv section"><span>Packs (${completedPacks.length})</span><b></b></div>
    <div class="pack-tower-list">${packRows}</div>
    <div class="kv section"><span>Obbies (${p.completions.length})</span><b></b></div>
    <div class="pack-tower-list">${completionRows || '<div class="muted">No completions yet</div>'}</div>
  `;

  leaderboardInfoEl.querySelectorAll(".pname[data-tower]").forEach(el => {
    el.onclick = () => {
      const name = el.getAttribute("data-tower");
      const t = state.towers.find(tt => tt.name.toLowerCase() === name.toLowerCase());
      if (!t) return;
      switchToTab("towers");
      state.selected = t;
      renderList();
      renderInfo(t);
      const row = listEl.querySelector(".row.sel");
      if (row) row.scrollIntoView({ block: "nearest" });
    };
  });

  leaderboardInfoEl.querySelectorAll(".pname[data-pack]").forEach(el => {
    el.onclick = () => {
      const name = el.getAttribute("data-pack");
      const pk = packState.packs.find(pp => pp.name === name);
      if (!pk) return;
      switchToTab("packs");
      packState.selected = pk;
      renderPackList();
      renderPackInfo(pk);
      const row = packListEl.querySelector(".row.sel");
      if (row) row.scrollIntoView({ block: "nearest" });
    };
  });
}

function loadLeaderboardFromData(rawPlayers) {
  leaderboardState.players = rawPlayers || [];
  renderLeaderboardList();
  if (leaderboardState.selected) renderLeaderboardInfo(leaderboardState.selected);
  if (state.selected) renderInfo(state.selected);
  if (typeof refreshProfile === "function") refreshProfile();
}

function playerCompletedTower(p, t){
  if (!p || !t) return false;
  return (p.completions || []).some(c =>
    (t.id != null && c.towerId === t.id) ||
    (c.towerName && c.towerName.toLowerCase() === t.name.toLowerCase())
  );
}

function playerCompletedPack(p, pack){
  if (!p || !pack || !pack.towers.length || typeof packState === "undefined") return false;
  return pack.towers.every(name => {
    const t = packState.towerByName.get(name.toLowerCase());
    return t ? playerCompletedTower(p, t) : false;
  });
}

function completedPacksForPlayer(p){
  if (!p || typeof packState === "undefined") return [];
  return packState.packs.filter(pk => playerCompletedPack(p, pk));
}

function victorsWhere(completed){
  if (!leaderboardState.players.length) return [];
  const ranked = sortLeaderboard(leaderboardState.players.slice().sort(
    (a, b) => leaderboardSortValue(b) - leaderboardSortValue(a)
  ));
  const out = [];
  ranked.forEach((p, idx) => {
    if (completed(p)) out.push({ player: p, rank: idx + 1 });
  });
  return out;
}

function victorsForTower(t){
  if (!t) return [];
  return victorsWhere(p => playerCompletedTower(p, t));
}

function victorsForPack(pack){
  if (!pack) return [];
  return victorsWhere(p => playerCompletedPack(p, pack));
}
