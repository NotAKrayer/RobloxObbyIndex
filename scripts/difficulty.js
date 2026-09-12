const DIFFS = ["Effortless","Easy","Medium","Hard","Difficult","Challenging","Intense",
"Remorseless","Insane","Extreme","Terrifying","Catastrophic","Horrific","Unreal","Nil",
"Error","Literal","WHY", "No", "DEATH", "HELL", "TARTARUS", "Unimaginable", "Omega", "Aleph-Null", "Immeasurable", "Malicious", "Impossible"];

const COLORS = [
  "rgb(0,206,0)",
  "rgb(117,243,71)",
  "rgb(255,254,0)",
  "rgb(253,124,0)",
  "rgb(255,50,50)",
  "rgb(160,0,0)",
  "rgb(25,35,45)",
  "rgb(200,0,200)",
  "rgb(0,0,255)",
  "rgb(3,137,255)",
  "rgb(0,255,255)",
  "rgb(255,255,255)",
  "rgb(150,149,255)",
  "rgb(81,0,203)",
  "rgb(101,102,109)",
  "rgb(86,36,36)",
  "rgb(25,55,86)",
  "rgb(255,255,255)",
  "rgb(80,80,80)",
  "rgb(236, 89, 88)",
  "rgb(7, 168, 229)",
  "rgb(194, 223, 241)",
  "rgb(67,0,0)",
  "rgb(71, 71, 71)",
  "rgb(39, 38, 38)",
  "rgb(18,0,0)",
  "rgb(146, 146, 146)",
  "rgb(0, 0, 0)"
];

const TIER_SUBTIER_NAMES = [
  "Baseline","Bottom","Bottom-Low","Low","Low-Mid","Mid","Mid-High","High","High-Peak","Peak"
];

const SUBTIERS = [
  { key:"Baseline",   test:f => f === 0 },
  { key:"Bottom",     test:f => f >= 0.01 && f <= 0.11 },
  { key:"Bottom-Low", test:f => f >= 0.12 && f <= 0.22 },
  { key:"Low",        test:f => f >= 0.23 && f <= 0.33 },
  { key:"Low-Mid",    test:f => f >= 0.34 && f <= 0.44 },
  { key:"Mid",        test:f => f >= 0.45 && f <= 0.55 },
  { key:"Mid-High",   test:f => f >= 0.56 && f <= 0.66 },
  { key:"High",       test:f => f >= 0.67 && f <= 0.77 },
  { key:"High-Peak",  test:f => f >= 0.78 && f <= 0.88 },
  { key:"Peak",       test:f => f >= 0.89 && f <= 0.99 }
];

const QUALITIES = ["SS","S+","S","S-","A+","A","A-","B+","B","B-","C+","C","C-","D+","D","D-","F+","F","F-","X"];
const KNOWN_TAGS = ["Purist","Wallhop","Checkpoints","Speedrun","Jank","Camera Control","CO Based","Buff","Nerf","Old Version","Segment"];
const RAW_TYPES = ["jump"];
const TIER_TYPES = ["obby", "wallhop"];
const NO_SUBTIER_TYPES = ["jump","obby","wallhop"];

const UNKNOWN = "UNKNOWN";
const DIFF_NAME_TO_INDEX = new Map();
DIFFS.forEach((name, i) => DIFF_NAME_TO_INDEX.set(name.toLowerCase(), i));

function diffIndex(name){ return DIFFS.indexOf(name); }
function mid(a, b){ return (diffIndex(a) + diffIndex(b)) / 2; }

function subtierFor(diffValue){
  if (diffValue == null) return null;
  let frac = diffValue - Math.floor(diffValue);
  frac = Math.round(frac * 100) / 100;
  for (const st of SUBTIERS){ if (st.test(frac)) return st.key; }
  return null;
}

const TIER_SUBTIER_SORTED = TIER_SUBTIER_NAMES.slice().sort((a, b) => b.length - a.length);

function normLoose(s){ return String(s).toLowerCase().replace(/[^a-z0-9]/g, ""); }

const TIER_SUBTIER_LOOKUP = TIER_SUBTIER_SORTED.map(name => ({
  name,
  key: normLoose(name)
}));

function subtierIndexFromName(name){
  if (!name) return 0;
  const i = TIER_SUBTIER_NAMES.indexOf(name);
  return i < 0 ? 0 : i;
}

function subtierFraction(subtierName){
  return subtierIndexFromName(subtierName) / (TIER_SUBTIER_NAMES.length - 1);
}

function parseTierSubtierCell(raw){
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

function parseDifficultyCell(cell, typeHint){
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

function isTextOnlyDiff(d){ return d != null && typeof d === "object" && d.textOnly; }
function isUnknownDiff(d){ return d === UNKNOWN; }
function isTierSubtierDiff(d){ return d != null && typeof d === "object" && d.tierSubtier; }

function textOnlyValue(d){
  return d.index - 0.001;
}
const TIER_RANGES = [
  [1,  0.00, 0.50],
  [2,  0.51, 1.00],
  [3,  1.01, 2.00],
  [4,  2.01, 3.00],
  [5,  3.01, 3.50],
  [6,  3.51, 4.00],
  [7,  4.01, 5.00],
  [8,  5.01, 6.00],
  [9,  6.01, 7.00],
  [10, 7.01, 8.00],
  [11, 8.01, 8.50],
  [12, 8.51, 9.00],
  [13, 9.01, 9.50],
  [14, 9.51, 10.00],
  [15, 10.01, 11.00],
  [16, 11.01, 12.00],
  [17, 12.01, 13.00],
  [18, 13.01, 13.50],
  [19, 13.51, 14.00],
  [20, 14.01, 14.30],
  [21, 14.31, 14.60],
  [22, 14.61, 15.00],
  [23, 15.01, 15.30],
  [24, 15.31, 15.60],
  [25, 15.61, 16.00]
];

const TIER_RANGE_MAP = new Map(TIER_RANGES.map(r => [r[0], r]));

const LAST_TIER = TIER_RANGES[TIER_RANGES.length - 1];
const LAST_TIER_SPAN = LAST_TIER[2] - LAST_TIER[1];

const extrapolatedRangeCache = new Map();

function extrapolatedTierRange(tierNum){
  if (extrapolatedRangeCache.has(tierNum)) return extrapolatedRangeCache.get(tierNum);

  const prevMax = tierNum === LAST_TIER[0] + 1
    ? LAST_TIER[2]
    : extrapolatedTierRange(tierNum - 1).max;

  const stepsAbove = tierNum - LAST_TIER[0];
  const growth = 1 + stepsAbove * 0.08;
  const span = LAST_TIER_SPAN * growth;

  const min = prevMax + 0.01;
  const max = min + span;

  const range = { min, max };
  extrapolatedRangeCache.set(tierNum, range);
  return range;
}

function getTierRange(tierNum){
  if (TIER_RANGE_MAP.has(tierNum)) {
    const [, min, max] = TIER_RANGE_MAP.get(tierNum);
    return { min, max };
  }
  if (tierNum < 1) return { min: 0, max: TIER_RANGES[0][1] };
  return extrapolatedTierRange(tierNum);
}

function tierToVirtualDifficulty(tierNum, subtierName){
  const range = getTierRange(tierNum);
  const frac = subtierFraction(subtierName);
  return range.min + (range.max - range.min) * frac;
}
const JUMP_ANCHORS = [
  [0, mid("Easy","Medium") - 0.15],
  [1, mid("Easy","Medium") + 0.15],
  [2, mid("Hard","Difficult")],
  [3, mid("Remorseless","Insane")],
  [4, mid("Insane","Extreme") - 0.15],
  [5, mid("Insane","Extreme") + 0.15],
  [6, mid("Extreme","Terrifying")],
  [7, mid("Catastrophic","Horrific")],
  [8, mid("Horrific","Unreal") - 0.20],
  [9, mid("Unreal","Nil")]
];
const JUMP_ANCHOR_MAP = new Map(JUMP_ANCHORS);
const UNREAL_IDX = diffIndex("Unreal");

function jumpToVirtualDifficulty(jumpNum){
  if (JUMP_ANCHOR_MAP.has(jumpNum)) return JUMP_ANCHOR_MAP.get(jumpNum);
  if (jumpNum < 0) return JUMP_ANCHOR_MAP.get(0);
  if (jumpNum >= 10) {
    const stepsAbove = jumpNum - 9;
    const growth = 1 + stepsAbove * 0.08;
    return UNREAL_IDX + stepsAbove * growth * 0.5;
  }
  const known = JUMP_ANCHORS.map(a => a[0]).sort((a,b) => a-b);
  let lower = null, upper = null;
  for (const k of known) {
    if (k <= jumpNum) lower = k;
    if (k >= jumpNum && upper == null) upper = k;
  }
  if (lower == null) return JUMP_ANCHOR_MAP.get(upper);
  if (upper == null) return JUMP_ANCHOR_MAP.get(lower);
  if (lower === upper) return JUMP_ANCHOR_MAP.get(lower);
  const lv = JUMP_ANCHOR_MAP.get(lower), uv = JUMP_ANCHOR_MAP.get(upper);
  const t = (jumpNum - lower) / (upper - lower);
  return lv + (uv - lv) * t;
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
  const frac = subtierFraction(subtierName);
  return range.min + (range.max - range.min) * frac;
}

const REAL_JUMP_ANCHORS = [
  [0, mid("Easy", "Medium") - 0.15],
  [1, mid("Easy", "Medium") + 0.15],
  [2, mid("Hard", "Difficult")],
  [3, mid("Remorseless", "Insane")],
  [4, mid("Insane", "Extreme") - 0.15],
  [5, mid("Insane", "Extreme") + 0.15],
  [6, mid("Extreme", "Terrifying")],
  [7, mid("Catastrophic", "Horrific")],
  [8, mid("Horrific", "Unreal") - 0.20],
  [9, mid("Unreal", "Nil")]
];
const REAL_JUMP_ANCHOR_MAP = new Map(REAL_JUMP_ANCHORS);
const REAL_UNREAL_IDX = diffIndex("Unreal");

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

function realEffectiveDifficultyValue(t) {
  const d = t.difficulty;
  if (d == null) return null;
  if (isUnknownDiff(d)) return null;
  if (isTextOnlyDiff(d)) return d.index - 0.001;

  const nt = normType(t.tier);
  if (isTierSubtierDiff(d)) return realTierToVirtualDifficulty(Math.floor(d.tierNum), d.subtierName);
  if (nt === "obby" || nt === "wallhop") return realTierToVirtualDifficulty(Math.floor(d));
  if (nt === "jump") return realJumpToVirtualDifficulty(Math.floor(d));
  return d;
}

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

function xpForTower(t){
  return xpForDifficulty(realEffectiveDifficultyValue(t));
}
