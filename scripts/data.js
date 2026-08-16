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

async function loadTowers() {
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();

    state.towers = data.towers;
    state.allTags = data.allTags;
    state.allTypes = data.allTypes;
    buildTagMenu();
    buildTypeMenu();
    renderList();
  } catch (e) {
    listEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
  }
}
