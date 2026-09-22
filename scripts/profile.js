const profileState = {
  nicknameRaw: "",
  player: null
};

const profileNickInput = document.getElementById("profileNickInput");
const profileStatusEl = document.getElementById("profileStatus");
const profileClearBtn = document.getElementById("profileClearBtn");

function findPlayerByNick(raw) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) return null;
  const players = (typeof leaderboardState !== "undefined" && leaderboardState.players) || [];
  return players.find(p => p.nickname === trimmed) || null;
}

function isTowerCompletedByProfile(t) {
  return playerCompletedTower(profileState.player, t);
}

function packTowerObjects(pack) {
  if (typeof packState === "undefined" || !packState.towerByName) return [];
  return pack.towers
    .map(n => packState.towerByName.get(n.toLowerCase()))
    .filter(Boolean);
}

function isPackCompletedByProfile(pack) {
  return playerCompletedPack(profileState.player, pack);
}

function packBonusXp(pack) {
  const towers = packTowerObjects(pack);
  if (!towers.length) return 0;
  const sum = towers.reduce((acc, t) => acc + (xpForTower(t) || 0), 0);
  return Math.round(sum / Math.sqrt(towers.length));
}

function saveNickToStorage(nick) {
  try { localStorage.setItem("robloxObbyIndexNickname", nick); } catch (e) {}
}
function loadNickFromStorage() {
  try { return localStorage.getItem("robloxObbyIndexNickname") || ""; } catch (e) { return ""; }
}

function renderProfileStatus() {
  if (!profileStatusEl) return;
  profileStatusEl.classList.remove("found", "notfound");
  if (!profileState.nicknameRaw.trim()) {
    profileStatusEl.textContent = "";
    return;
  }
  if (profileState.player) {
    profileStatusEl.classList.add("found");
    profileStatusEl.textContent = `✓ ${profileState.player.nickname} · Level ${profileState.player.level} · ${profileState.player.completionCount} completions`;
  } else {
    profileStatusEl.classList.add("notfound");
    profileStatusEl.textContent = "Nickname not found on the leaderboard";
  }
}

function refreshProfile() {
  profileState.player = findPlayerByNick(profileState.nicknameRaw);

  if (profileState.player && typeof leaderboardState !== "undefined") {
    leaderboardState.selected = profileState.player;
    if (typeof renderLeaderboardList === "function") renderLeaderboardList();
    if (typeof renderLeaderboardInfo === "function") renderLeaderboardInfo(profileState.player);
  }

  renderProfileStatus();

  if (typeof state !== "undefined" && state.towers && state.towers.length && typeof renderList === "function") renderList();
  if (typeof state !== "undefined" && state.selected && typeof renderInfo === "function") renderInfo(state.selected);
  if (typeof packState !== "undefined" && packState.packs && packState.packs.length && typeof renderPackList === "function") renderPackList();
  if (typeof packState !== "undefined" && packState.selected && typeof renderPackInfo === "function") renderPackInfo(packState.selected);
}

if (profileNickInput) {
  profileNickInput.oninput = e => {
    profileState.nicknameRaw = e.target.value;
    saveNickToStorage(profileState.nicknameRaw);
    refreshProfile();
  };
}
if (profileClearBtn) {
  profileClearBtn.onclick = () => {
    profileState.nicknameRaw = "";
    if (profileNickInput) profileNickInput.value = "";
    saveNickToStorage("");
    refreshProfile();
  };
}

(function initProfileFromStorage() {
  const saved = loadNickFromStorage();
  if (saved && profileNickInput) {
    profileNickInput.value = saved;
    profileState.nicknameRaw = saved;
  }
})();
