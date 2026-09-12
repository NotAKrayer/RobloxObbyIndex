import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SHEET_ID = "1kgdrqZLb7jtTXm7bjwIjjmE415aXnEpiF3XfsZ8oQfM";
const GVIZ_URL = (gid) => `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${gid}`;
const PACKS_GID = "815863793";
const PLAYERS_GID = "1367978855";

const XP_ANCHORS = [
  [8, 100],
  [9, 250],
  [10, 500],
  [11, 1000],
  [12, 2000],
  [13, 4000],
  [14, 7000],
  [15, 10000],
  [16, 15000]
];
const XP_LAST_ANCHOR = XP_ANCHORS[XP_ANCHORS.length - 1];
const XP_TAIL_GROWTH_RATE = 1.35;

function xpForDifficulty(effectiveDiff) {
  if (effectiveDiff == null || isNaN(effectiveDiff)) return 0;

  if (effectiveDiff <= XP_ANCHORS[0][0]) {
    const raw = XP_ANCHORS[0][1] * Math.pow(1.15, effectiveDiff - XP_ANCHORS[0][0]);
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  if (effectiveDiff >= XP_LAST_ANCHOR[0]) {
    const raw = XP_LAST_ANCHOR[1] * Math.pow(XP_TAIL_GROWTH_RATE, effectiveDiff - XP_LAST_ANCHOR[0]);
    return Math.max(0, Math.round(raw * 100) / 100);
  }

  let lower = XP_ANCHORS[0], upper = XP_ANCHORS[XP_ANCHORS.length - 1];
  for (let i = 0; i < XP_ANCHORS.length - 1; i++) {
    if (effectiveDiff >= XP_ANCHORS[i][0] && effectiveDiff <= XP_ANCHORS[i + 1][0]) {
      lower = XP_ANCHORS[i];
      upper = XP_ANCHORS[i + 1];
      break;
    }
  }
  const [dLo, xLo] = lower, [dHi, xHi] = upper;
  const t = (effectiveDiff - dLo) / (dHi - dLo);
  const raw = xLo * Math.pow(xHi / xLo, t);
  return Math.max(0, Math.round(raw * 100) / 100);
}

function xpThresholdForLevel(n) {
  if (n <= 0) return 0;
  return Math.round(50 * Math.pow(n, 1.5));
}

function levelForTotalXp(totalXp) {
  if (!totalXp || totalXp <= 0) return { level: 0, currentLevelXp: 0, xpIntoLevel: 0, xpForNextLevel: xpThresholdForLevel(1) };
  let level = 0;
  while (xpThresholdForLevel(level + 1) <= totalXp) level++;
  const floorXp = xpThresholdForLevel(level);
  const nextXp = xpThresholdForLevel(level + 1);
  return {
    level,
    currentLevelXp: floorXp,
    xpIntoLevel: Math.round((totalXp - floorXp) * 100) / 100,
    xpForNextLevel: Math.round((nextXp - floorXp) * 100) / 100
  };
}

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

function tierToVirtualDifficulty(tierNum, subtierName) {
  const idx = TIER_SUBTIER_NAMES.indexOf(subtierName);
  const frac = idx < 0 ? 0 : idx / (TIER_SUBTIER_NAMES.length - 1);
  return tierNum + frac;
}
function jumpToVirtualDifficulty(jumpNum) { return jumpNum; }

function sortValueOfTower(t) {
  const nt = normType(t.tier);
  const d = t.difficulty;
  if (d == null) return -Infinity;
  if (d === UNKNOWN) return -Infinity + 1;
  if (d != null && typeof d === "object" && d.textOnly) return d.index - 0.001;
  if (d != null && typeof d === "object" && d.tierSubtier) return tierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);

  if (TIER_TYPES.concat(["jump"]).includes(nt)) {
    if (nt === "jump") return jumpToVirtualDifficulty(d);
    return d;
  }
  return d;
}

function sortValueByName(nameOrList, towerByName) {
  const t = towerByName.get(nameKey(nameOrList));
  return t ? sortValueOfTower(t) : -Infinity;
}

function realSubtierFraction(subtierName) {
  const i = TIER_SUBTIER_NAMES.indexOf(subtierName);
  return (i < 0 ? 0 : i) / (TIER_SUBTIER_NAMES.length - 1);
}

const REAL_TIER_RANGES = [
  [1, 0.00, 0.50], [2, 0.51, 1.00], [3, 1.01, 2.00], [4, 2.01, 3.00],
  [5, 3.01, 3.50], [6, 3.51, 4.00], [7, 4.01, 5.00], [8, 5.01, 6.00],
  [9, 6.01, 7.00], [10, 7.01, 8.00], [11, 8.01, 8.50], [12, 8.51, 9.00],
  [13, 9.01, 9.50], [14, 9.51, 10.00], [15, 10.01, 11.00], [16, 11.01, 12.00],
  [17, 12.01, 13.00], [18, 13.01, 13.50], [19, 13.51, 14.00], [20, 14.01, 14.30],
  [21, 14.31, 14.60], [22, 14.61, 15.00], [23, 15.01, 15.30], [24, 15.31, 15.60],
  [25, 15.61, 16.00]
];
const REAL_TIER_RANGE_MAP = new Map(REAL_TIER_RANGES.map(r => [r[0], r]));
const REAL_LAST_TIER = REAL_TIER_RANGES[REAL_TIER_RANGES.length - 1];
const REAL_LAST_TIER_SPAN = REAL_LAST_TIER[2] - REAL_LAST_TIER[1];
const realExtrapolatedRangeCache = new Map();

function realExtrapolatedTierRange(tierNum) {
  if (realExtrapolatedRangeCache.has(tierNum)) return realExtrapolatedRangeCache.get(tierNum);
  const prevMax = tierNum === REAL_LAST_TIER[0] + 1
    ? REAL_LAST_TIER[2]
    : realExtrapolatedTierRange(tierNum - 1).max;
  const stepsAbove = tierNum - REAL_LAST_TIER[0];
  const growth = 1 + stepsAbove * 0.08;
  const span = REAL_LAST_TIER_SPAN * growth;
  const min = prevMax + 0.01;
  const max = min + span;
  const range = { min, max };
  realExtrapolatedRangeCache.set(tierNum, range);
  return range;
}

function realGetTierRange(tierNum) {
  if (REAL_TIER_RANGE_MAP.has(tierNum)) {
    const [, min, max] = REAL_TIER_RANGE_MAP.get(tierNum);
    return { min, max };
  }
  if (tierNum < 1) return { min: 0, max: REAL_TIER_RANGES[0][1] };
  return realExtrapolatedTierRange(tierNum);
}

function realTierToVirtualDifficulty(tierNum, subtierName) {
  const range = realGetTierRange(tierNum);
  const frac = realSubtierFraction(subtierName);
  return range.min + (range.max - range.min) * frac;
}

function diffIndexOf(name) { return DIFFS.indexOf(name); }
function midOf(a, b) { return (diffIndexOf(a) + diffIndexOf(b)) / 2; }

const REAL_JUMP_ANCHORS = [
  [0, midOf("Easy", "Medium") - 0.15],
  [1, midOf("Easy", "Medium") + 0.15],
  [2, midOf("Hard", "Difficult")],
  [3, midOf("Remorseless", "Insane")],
  [4, midOf("Insane", "Extreme") - 0.15],
  [5, midOf("Insane", "Extreme") + 0.15],
  [6, midOf("Extreme", "Terrifying")],
  [7, midOf("Catastrophic", "Horrific")],
  [8, midOf("Horrific", "Unreal") - 0.20],
  [9, midOf("Unreal", "Nil")]
];
const REAL_JUMP_ANCHOR_MAP = new Map(REAL_JUMP_ANCHORS);
const REAL_UNREAL_IDX = diffIndexOf("Unreal");

function realJumpToVirtualDifficulty(jumpNum) {
  if (REAL_JUMP_ANCHOR_MAP.has(jumpNum)) return REAL_JUMP_ANCHOR_MAP.get(jumpNum);
  if (jumpNum < 0) return REAL_JUMP_ANCHOR_MAP.get(0);
  if (jumpNum >= 10) {
    const stepsAbove = jumpNum - 9;
    const growth = 1 + stepsAbove * 0.08;
    return REAL_UNREAL_IDX + stepsAbove * growth * 0.5;
  }
  const known = REAL_JUMP_ANCHORS.map(a => a[0]).sort((a, b) => a - b);
  let lower = null, upper = null;
  for (const k of known) {
    if (k <= jumpNum) lower = k;
    if (k >= jumpNum && upper == null) upper = k;
  }
  if (lower == null) return REAL_JUMP_ANCHOR_MAP.get(upper);
  if (upper == null) return REAL_JUMP_ANCHOR_MAP.get(lower);
  if (lower === upper) return REAL_JUMP_ANCHOR_MAP.get(lower);
  const lv = REAL_JUMP_ANCHOR_MAP.get(lower), uv = REAL_JUMP_ANCHOR_MAP.get(upper);
  const t = (jumpNum - lower) / (upper - lower);
  return lv + (uv - lv) * t;
}

function formatDifficultyForLeaderboard(t) {
  const nt = normType(t.tier);
  const d = t.difficulty;

  if (d == null) return "N/A";
  if (d === UNKNOWN) return "Unknown";
  if (typeof d === "object" && d.textOnly) return DIFFS[d.index];
  if (typeof d === "object" && d.tierSubtier) {
    const prefix = d.subtierName ? d.subtierName + " " : "";
    return prefix + "Tier " + d.tierNum;
  }
  if (nt === "jump") return String(d);
  if (TIER_TYPES.includes(nt)) return "Tier " + Math.floor(d);
  return String(d);
}

function effectiveDifficultyValue(t) {
  const d = t.difficulty;
  if (d == null) return null;
  if (d === UNKNOWN) return null;
  if (typeof d === "object" && d.textOnly) return d.index - 0.001;

  const nt = normType(t.tier);
  if (typeof d === "object" && d.tierSubtier) return realTierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);
  if (nt === "obby" || nt === "wallhop") return realTierToVirtualDifficulty(Math.floor(d));
  if (nt === "jump") return realJumpToVirtualDifficulty(Math.floor(d));
  return d;
}

async function fetchSheet(gid) {
  const res = await fetch(GVIZ_URL(gid));
  if (!res.ok) throw new Error("Google Sheets responded " + res.status + " for gid " + gid);
  const raw = await res.text();
  return JSON.parse(raw.slice(raw.indexOf("(") + 1, raw.lastIndexOf(")")));
}

function nameKey(s) {
  return String(s || "").trim().toLowerCase();
}

function parsePacksSheet(json) {
  const rows = json.table?.rows || [];
  const packs = [];

  for (const [rowIdx, row] of rows.entries()) {
    const c = row.c || [];
    if (!c.length) continue;

    const packName = cellText(c[0]);
    if (!packName) continue;

    if (rowIdx === 0 && /^pack(\s*name)?$/i.test(packName)) continue;

    const towerNames = [];
    for (let i = 1; i < c.length; i++) {
      const v = cellText(c[i]);
      if (v) towerNames.push(v);
    }
    if (!towerNames.length) continue;

    packs.push({ packName, towerNames });
  }

  return packs;
}

function parsePlayersSheet(json) {
  const rows = json.table?.rows || [];
  const players = [];

  for (const [rowIdx, row] of rows.entries()) {
    const c = row.c || [];
    if (!c.length) continue;

    const nickname = cellText(c[0]);
    if (!nickname) continue;

    if (rowIdx === 0 && /^nick(name)?$/i.test(nickname)) continue;

    const nationality = cellText(c[1]);
    const idsRaw = cellText(c[2]);
    const completedIds = idsRaw
      ? idsRaw.split(",").map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n))
      : [];

    const complimentsRaw = cellText(c[3]);
    const compliments = complimentsRaw
      ? complimentsRaw.split(";").map(s => s.trim()).filter(Boolean)
      : [];

    players.push({ nickname, nationality, completedIds, compliments });
  }

  return players;
}

async function main() {
  const json = await fetchSheet(0);

  const cols = json.table.cols.map(c => (c.label || "").toLowerCase().trim());
  const colsLoose = cols.map(c => normLoose(c));

  const firstRow = json.table.rows[0]?.c || [];
  const firstRowTextsLoose = firstRow.map(c => normLoose(cellText(c)));
  const HEADER_HINTS = ["name", "difficulty", "ranked", "id", "verified", "type", "author"];
  const firstRowLooksLikeHeader = firstRowTextsLoose.some(t => HEADER_HINTS.includes(t));

  const headerTextsLoose = colsLoose.some(Boolean) ? colsLoose : (firstRowLooksLikeHeader ? firstRowTextsLoose : []);

  function findHeaderIdx(...candidates) {
    const wanted = candidates.map(normLoose);
    for (const w of wanted) {
      const idx = headerTextsLoose.indexOf(w);
      if (idx >= 0) return idx;
    }
    return -1;
  }

  let iN    = findHeaderIdx("name");
  let iD    = findHeaderIdx("difficulty");
  let iVer  = findHeaderIdx("verified");
  let iVBy  = findHeaderIdx("verifier");
  let iTier = findHeaderIdx("type");
  let iAuth = findHeaderIdx("author");
  let iQual = findHeaderIdx("quality");
  let iLoc  = findHeaderIdx("location");
  let iLink = findHeaderIdx("link");
  let iTags = findHeaderIdx("tags");
  let iLen  = findHeaderIdx("length");
  let iAlt = findHeaderIdx("alt name", "altname", "alternate name");
  let iRanked = findHeaderIdx("ranked", "rank", "is ranked");
  let iId = findHeaderIdx("id", "tower id", "towerid", "#");

  if (iId < 0) console.warn('Could not find an "ID" column in the towers sheet header - tower.id will be null for every row, which breaks victors/leaderboard matching.');
  if (iRanked < 0) console.warn('Could not find a "Ranked" column in the towers sheet header - tower.ranked will be false for every row.');

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

  const shouldSkipFirstDataRow = !colsLoose.some(Boolean) && firstRowLooksLikeHeader;

  for (const [rowIdx, row] of json.table.rows.entries()) {
    if (rowIdx === 0 && shouldSkipFirstDataRow) continue;

    const c = row.c || [];
    const name = cellText(c[iN]);
    if (!name) continue;

    const altName = iAlt >= 0 ? cellText(c[iAlt]) : "";

    const rankedRaw = iRanked >= 0 ? cellText(c[iRanked]).trim().toLowerCase() : "";
    const ranked = ["yes", "true", "ranked", "1", "y", "✓", "x"].includes(rankedRaw);

    const idRaw = iId >= 0 ? cellText(c[iId]) : "";
    const idDigitsOnly = idRaw.replace(/[^0-9.\-]/g, "");
    const idNum = idDigitsOnly ? parseInt(idDigitsOnly, 10) : null;
    const towerId = idNum != null && !isNaN(idNum) ? idNum : null;

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
      lengthRaw,
      ranked,
      id: towerId
    });
  }

  const towerByName = new Map();
  towers.forEach(t => {
    towerByName.set(nameKey(t.name), t);
    if (t.altName) {
      const k = nameKey(t.altName);
      if (!towerByName.has(k)) towerByName.set(k, t);
    }
  });

  let packs = [];
  try {
    const packsJson = await fetchSheet(PACKS_GID);
    const rawPacks = parsePacksSheet(packsJson);

    packs = rawPacks.map(({ packName, towerNames }) => {
      const resolved = [];
      towerNames.forEach(n => {
        const t = towerByName.get(nameKey(n));
        if (t) resolved.push(t.name);
      });

      resolved.sort((a, b) => sortValueByName(b, towerByName) - sortValueByName(a, towerByName));

      const diffValues = resolved
        .map(n => sortValueByName(n, towerByName))
        .filter(v => v != null && v !== -Infinity);
      const hardestValue = diffValues.length ? Math.max(...diffValues) : null;
      const hardestTowerName = hardestValue == null
        ? null
        : resolved.find(n => sortValueByName(n, towerByName) === hardestValue) || null;

      return {
        name: packName,
        towers: resolved,
        obbyCount: resolved.length,
        hardestTowerName,
        hardestDifficultyValue: hardestValue
      };
    });
  } catch (err) {
    console.warn("Skipping packs: " + err.message);
  }

  const towerById = new Map();
  towers.forEach(t => { if (t.id != null) towerById.set(t.id, t); });

  let players = [];
  const victorsByTowerId = new Map();
  try {
    const playersJson = await fetchSheet(PLAYERS_GID);
    const rawPlayers = parsePlayersSheet(playersJson);

    players = rawPlayers.map(p => {
      const completions = [];
      let totalXp = 0;
      let hardestValue = null;
      let hardestTowerName = null;

      p.completedIds.forEach(id => {
        const t = towerById.get(id);
        if (!t) return;

        victorsByTowerId.set(id, (victorsByTowerId.get(id) || 0) + 1);

        const effDiff = effectiveDifficultyValue(t);
        const xp = xpForDifficulty(effDiff);
        totalXp += xp;

        if (effDiff != null && (hardestValue == null || effDiff > hardestValue)) {
          hardestValue = effDiff;
          hardestTowerName = t.name;
        }

        completions.push({
          towerId: id,
          towerName: t.name,
          difficultyText: formatDifficultyForLeaderboard(t),
          xp
        });
      });

      completions.sort((a, b) => {
        const ta = towerById.get(a.towerId), tb = towerById.get(b.towerId);
        const va = ta ? (effectiveDifficultyValue(ta) ?? -Infinity) : -Infinity;
        const vb = tb ? (effectiveDifficultyValue(tb) ?? -Infinity) : -Infinity;
        return vb - va;
      });

      totalXp = Math.round(totalXp * 100) / 100;
      const levelInfo = levelForTotalXp(totalXp);

      return {
        nickname: p.nickname,
        nationality: p.nationality,
        totalXp,
        level: levelInfo.level,
        xpIntoLevel: levelInfo.xpIntoLevel,
        xpForNextLevel: levelInfo.xpForNextLevel,
        completionCount: completions.length,
        hardestTowerName,
        hardestDifficultyValue: hardestValue,
        completions,
        compliments: p.compliments || []
      };
    });
  } catch (err) {
    console.warn("Skipping players/leaderboard: " + err.message);
  }

  towers.forEach(t => {
    t.victors = t.id != null ? (victorsByTowerId.get(t.id) || 0) : 0;
  });

  const output = {
    towers,
    packs,
    players,
    allTags: Array.from(tagSet),
    allTypes: Array.from(typeSet).sort((a, b) => a.localeCompare(b)),
    fetchedAt: new Date().toISOString()
  };

  await mkdir(path.dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(output), "utf8");
  console.log(`Wrote ${towers.length} towers, ${packs.length} packs and ${players.length} players to ${OUT_PATH}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
