const tabTowersBtn = document.getElementById("tabTowersBtn");
const tabPacksBtn = document.getElementById("tabPacksBtn");
const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");

const filtersEl = document.getElementById("filters");
const packFiltersEl = document.getElementById("packFilters");
const leaderboardFiltersEl = document.getElementById("leaderboardFilters");
const towersMainEl = document.getElementById("towersMain");
const packsMainEl = document.getElementById("packsMain");
const leaderboardMainEl = document.getElementById("leaderboardMain");

function switchToTab(tab){
  const isTowers = tab === "towers";
  const isPacks = tab === "packs";
  const isLeaderboard = tab === "leaderboard";

  tabTowersBtn.classList.toggle("active", isTowers);
  tabPacksBtn.classList.toggle("active", isPacks);
  tabLeaderboardBtn.classList.toggle("active", isLeaderboard);

  filtersEl.style.display = isTowers ? "" : "none";
  packFiltersEl.style.display = isPacks ? "" : "none";
  leaderboardFiltersEl.style.display = isLeaderboard ? "" : "none";
  towersMainEl.style.display = isTowers ? "" : "none";
  packsMainEl.style.display = isPacks ? "" : "none";
  leaderboardMainEl.style.display = isLeaderboard ? "" : "none";
}

tabTowersBtn.onclick = () => switchToTab("towers");
tabPacksBtn.onclick = () => switchToTab("packs");
tabLeaderboardBtn.onclick = () => switchToTab("leaderboard");
