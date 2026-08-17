import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHEET_ID = "1kgdrqZLb7jtTXm7bjwIjjmE415aXnEpiF3XfsZ8oQfM";
const GVIZ_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=0`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.join(__dirname, "..", "data", "data.json");

const KNOWN_TAGS = ["Purist","Wallhop","Checkpoints","Speedrun","Jank","Camera Control","CO Based","Buff","Nerf","Old Version","Segment"];

const DIFFS = ["Effortless","Easy","Medium","Hard","Difficult","Challenging","Intense",
"Remorseless","Insane","Extreme","Terrifying","Catastrophic","Horrific","Unreal","Nil",
"Error","Literal","WHY", "No", "DEATH", "HELL", "TARTARUS", "Unimaginable", "Omega", "Aleph-Null", "Immeasurable", "Malicious", "Impossible"];

const TIER_SUBTIER_NAMES = ["Baseline","Bottom","Bottom-Low","Low","Low-Mid","Mid","Mid-High","High","High-Peak","Peak"];
const TIER_TYPES = ["obby", "wallhop"];
const UNKNOWN = "UNKNOWN";

const DIFF_NAME_TO_INDEX = new Map();
DIFFS.forEach((name, i) => DIFF_NAME_TO_INDEX.set(name.toLowerCase(), i));

function cellText(cell) { if (!cell) return ""; const v = cell.f ?? cell.v; return v == null ? "" : String(v).trim(); }
function cellNum(cell) {
  if (!cell) return null;
  let v = cell.v;
  if (typeof v === "string") v = parseFloat(v.replace(",", "."));
  if (v == null || isNaN(v)) { const f = parseFloat(String(cell.f).replace(",", ".")); return isNaN(f) ? null : f; }
  return v;
}
function normType(t) { return (t || "").trim().toLowerCase(); }
function normLoose(s) { return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

const TIER_SUBTIER_SORTED = TIER_SUBTIER_NAMES.slice().sort((a, b) => b.length - a.length);
const TIER_SUBTIER_LOOKUP = TIER_SUBTIER_SORTED.map(name => ({ name, key: normLoose(name) }));

function parseTierSubtierCell(raw) {
  if (!raw) return null;
  const loose = normLoose(raw);
  if (!loose) return null;

  let subtierName = null;
  let rest = loose;
  for (const { name, key } of TIER_SUBTIER_LOOKUP) {
    if (loose.includes(key)) {
      subtierName = name;
      rest = loose.replace(key, "");
      break;
    }
  }

  const numMatch = rest.match(/\d+(\.\d+)?/);
  if (!numMatch) return null;
  const tierNum = parseFloat(numMatch[0]);
  if (isNaN(tierNum)) return null;

  return { tierNum, subtierName };
}

function parseDifficultyCell(cell, typeHint) {
  const raw = cellText(cell);
  if (!raw) {
    const n = cellNum(cell);
    return n == null ? null : n;
  }

  const trimmed = raw.trim();

  if (trimmed === "?" || trimmed.toLowerCase() === "unknown") {
    return UNKNOWN;
  }

  const nameIdx = DIFF_NAME_TO_INDEX.get(trimmed.toLowerCase());
  if (nameIdx != null) {
    return { textOnly: true, index: nameIdx };
  }

  const nt = normType(typeHint);
  if (TIER_TYPES.includes(nt)) {
    const parsed = parseTierSubtierCell(trimmed);
    if (parsed && parsed.subtierName) {
      return { tierSubtier: true, tierNum: parsed.tierNum, subtierName: parsed.subtierName };
    }
  }

  const n = cellNum(cell);
  return n == null ? null : n;
}

async function main() {
  const res = await fetch(GVIZ_URL);
  if (!res.ok) throw new Error("Google Sheets responded " + res.status);
  const raw = await res.text();
  const json = JSON.parse(raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")));

  const cols = json.table.cols.map(c => (c.label || "").toLowerCase().trim());

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

  const headerRow = json.table.rows[0]?.c || [];
  const headerTexts = headerRow.map(c => cellText(c).toLowerCase().trim());
  let iAlt = headerTexts.indexOf("alt name");

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

    const altName = iAlt >= 0 ? cellText(c[iAlt]) : "";

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
      altName,
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

  const output = {
    towers,
    allTags: Array.from(tagSet),
    allTypes: Array.from(typeSet).sort((a, b) => a.localeCompare(b)),
    fetchedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(output), "utf8");
  console.log(`Wrote ${towers.length} towers to ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
