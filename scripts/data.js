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
    const res = await fetch(GVIZ_URL, { cache: "no-store" });
    if (!res.ok) throw new Error(res.status);
    const raw = await res.json();
    const json = JSON.parse(raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")));
    const cols = json.table.cols.map(c => (c.label || "").toLowerCase());

    let iN    = cols.indexOf("name");
    let iD    = cols.indexOf("difficulty");
    let iVer  = cols.indexOf("verified");
    let iVBy  = cols.indexOf("verifier");
    let iTier = cols.indexOf("type");
    let iAuth = cols.indexOf("author");
    let iQual = cols.indexOf("quality");
    let iLoc  = cols.indexOf("location");
    let iLink = cols.indexOf("link");
    let iTags = cols.indexOf("tags");
    let iLen  = cols.indexOf("length");

    if (iN < 0) iN = 0;
    if (iD < 0) iD = 1;
    if (iVer < 0) iVer = 2;
    if (iVBy < 0) iVBy = 3;
    if (iTier < 0) iTier = 4;
    if (iAuth < 0) iAuth = 5;
    if (iQual < 0) iQual = 6;
    if (iLoc < 0) iLoc = 7;
    if (iLink < 0) iLink = 8;
    if (iTags < 0) iTags = 9;
    if (iLen < 0) iLen = 10;

    const towers = [];
    const tagSet = new Set(KNOWN_TAGS);
    const typeSet = new Set();

    for (const [rowIdx, row] of json.table.rows.entries()) {
      if (rowIdx === 0) continue;

      const c = row.c || [];
      const name = cellText(c[iN]);
      if (!name) continue;

      const verifiedRaw = cellText(c[iVer]).toLowerCase();
      const verified = verifiedRaw === "verified" || verifiedRaw === "true" || verifiedRaw === "yes";
      const verifier = verified ? cellText(c[iVBy]) : "";

      const tier = cellText(c[iTier]);
      const tagsRaw = cellText(c[iTags]);
      const tags = tagsRaw ? tagsRaw.split(";").map(s => s.trim()).filter(Boolean) : [];
      tags.forEach(t => tagSet.add(t));
      if (tier) typeSet.add(tier);

      const lengthRaw = cellText(c[iLen]);

      towers.push({
        name,
        difficulty: parseDifficultyCell(c[iD], tier),
        verified,
        verifier,
        tier,
        author: cellText(c[iAuth]),
        quality: cellText(c[iQual]).toUpperCase(),
        location: cellText(c[iLoc]),
        link: cellText(c[iLink]),
        tags,
        lengthRaw
      });
    }

    state.towers = towers;
    state.allTags = Array.from(tagSet);
    state.allTypes = Array.from(typeSet).sort((a,b) => a.localeCompare(b));
    buildTagMenu();
    buildTypeMenu();
    renderList();
  } catch (e) {
    listEl.innerHTML = '<div class="muted">Failed to load the list, please try again later</div>';
  }
}
