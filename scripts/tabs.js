const tabTowersBtn = document.getElementById("tabTowersBtn");
const tabPacksBtn = document.getElementById("tabPacksBtn");

const filtersEl = document.getElementById("filters");
const packFiltersEl = document.getElementById("packFilters");
const towersMainEl = document.getElementById("towersMain");
const packsMainEl = document.getElementById("packsMain");

function switchToTab(tab){
  const isTowers = tab === "towers";

  tabTowersBtn.classList.toggle("active", isTowers);
  tabPacksBtn.classList.toggle("active", !isTowers);

  filtersEl.style.display = isTowers ? "" : "none";
  packFiltersEl.style.display = isTowers ? "none" : "";
  towersMainEl.style.display = isTowers ? "" : "none";
  packsMainEl.style.display = isTowers ? "none" : "";
}

tabTowersBtn.onclick = () => switchToTab("towers");
tabPacksBtn.onclick = () => switchToTab("packs");
