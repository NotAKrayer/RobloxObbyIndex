const tabTowersBtn = document.getElementById("tabTowersBtn");
const tabPacksBtn = document.getElementById("tabPacksBtn");
const tabLeaderboardBtn = document.getElementById("tabLeaderboardBtn");
const tabRouletteBtn = document.getElementById("tabRouletteBtn");

const filtersEl = document.getElementById("filters");
const packFiltersEl = document.getElementById("packFilters");
const leaderboardFiltersEl = document.getElementById("leaderboardFilters");
const rouletteFiltersEl = document.getElementById("rouletteFilters");
const towersMainEl = document.getElementById("towersMain");
const packsMainEl = document.getElementById("packsMain");
const leaderboardMainEl = document.getElementById("leaderboardMain");
const rouletteMainEl = document.getElementById("rouletteMain");

function switchToTab(tab){
  const isTowers = tab === "towers";
  const isPacks = tab === "packs";
  const isLeaderboard = tab === "leaderboard";
  const isRoulette = tab === "roulette";

  tabTowersBtn.classList.toggle("active", isTowers);
  tabPacksBtn.classList.toggle("active", isPacks);
  tabLeaderboardBtn.classList.toggle("active", isLeaderboard);
  tabRouletteBtn.classList.toggle("active", isRoulette);

  filtersEl.style.display = isTowers ? "" : "none";
  packFiltersEl.style.display = isPacks ? "" : "none";
  leaderboardFiltersEl.style.display = isLeaderboard ? "" : "none";
  rouletteFiltersEl.style.display = isRoulette ? "" : "none";
  towersMainEl.style.display = isTowers ? "" : "none";
  packsMainEl.style.display = isPacks ? "" : "none";
  leaderboardMainEl.style.display = isLeaderboard ? "" : "none";
  rouletteMainEl.style.display = isRoulette ? "" : "none";
}

tabTowersBtn.onclick = () => switchToTab("towers");
tabPacksBtn.onclick = () => switchToTab("packs");
tabLeaderboardBtn.onclick = () => switchToTab("leaderboard");
tabRouletteBtn.onclick = () => switchToTab("roulette");
