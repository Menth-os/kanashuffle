// Kana Shuffle - rebuilt (clean, consistent)

const I18N_CACHE = new Map();
let I18N = {};
let I18N_EN = {};

async function loadI18nFile(lang) {
  if (I18N_CACHE.has(lang)) return I18N_CACHE.get(lang);
  const res = await fetch(`./i18n/${lang}.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error("missing");
  const data = await res.json();
  I18N_CACHE.set(lang, data);
  return data;
}

async function setLanguage(lang) {
  if (!Object.keys(I18N_EN).length) {
    try { I18N_EN = await loadI18nFile("en"); } catch { I18N_EN = {}; }
  }
  let normalized = (lang === "de" || lang === "ja") ? lang : "en";
  try { I18N = await loadI18nFile(normalized); } catch { I18N = I18N_EN; normalized = "en"; }
  state.lang = normalized;
  document.documentElement.lang = normalized;
}

function t(key) {
  return (I18N && I18N[key]) || (I18N_EN && I18N_EN[key]) || key;
}

const PREF_KEY = "kanaShufflePrefs_v9";
const SEED_KEY = "kanaShuffleSeed_v7";

function loadPrefs() { try { return JSON.parse(localStorage.getItem(PREF_KEY) || "{}"); } catch { return {}; } }
function savePrefs(prefs) { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); }

function todaySeed() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `day${y}${m}${day}`;
}

function loadDailySeed() {
  try {
    const s = JSON.parse(localStorage.getItem(SEED_KEY) || "{}");
    if (s.day === todaySeed()) return sanitizeSeed(s.seed || "");
  } catch {}
  return "";
}
function saveDailySeed(seed) { localStorage.setItem(SEED_KEY, JSON.stringify({ day: todaySeed(), seed: sanitizeSeed(seed || "") })); }

function sanitizeSeed(raw) { return (raw || "").toLowerCase().replace(/[^a-z0-9]/g, ""); }

function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function prngFrom(seedStr) {
  let s = hash32(seedStr || "default");
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}

function debounce(fn, ms) {
  let tmr = null;
  return (...args) => { if (tmr) clearTimeout(tmr); tmr = setTimeout(() => fn(...args), ms); };
}

function toast(msg) {
  const el = document.getElementById("appToast");
  document.getElementById("toastBody").textContent = msg;
  bootstrap.Toast.getOrCreateInstance(el, { delay: 1400 }).show();
}

function applyTheme(isDark) { document.documentElement.setAttribute("data-bs-theme", isDark ? "dark" : "light"); }

function clampTimerSeconds(sec) {
  if (!Number.isFinite(sec) || sec < 0) return 0;
  const max = 99 * 60 + 59; // 99:59
  return Math.min(max, Math.floor(sec));
}

function formatTime(sec) {
  sec = clampTimerSeconds(sec);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function secondsToTimeInput(sec) {
  sec = clampTimerSeconds(sec);
  const mm = Math.floor(sec / 60);
  const ss = sec % 60;
  return `00:${String(mm).padStart(2,"0")}:${String(ss).padStart(2,"0")}`; // HH fixed to 00
}

function parseTimeInput(value) {
  const v = String(value || "").trim();
  if (!v) return null;
  const parts = v.split(":").map(x => Number.parseInt(x, 10));
  if (parts.some(n => !Number.isFinite(n))) return null;
  // type=time returns HH:MM or HH:MM:SS
  if (parts.length === 2) {
    const hh = parts[0], mm = parts[1];
    return clampTimerSeconds(hh * 3600 + mm * 60);
  }
  const hh = parts[0], mm = parts[1], ss = parts[2] || 0;
  return clampTimerSeconds(hh * 3600 + mm * 60 + ss);
}

const BASE = {
  hiragana: {
    kana: ["あ","い","う","え","お","か","き","く","け","こ","さ","し","す","せ","そ","た","ち","つ","て","と","な","に","ぬ","ね","の","は","ひ","ふ","へ","ほ","ま","み","む","め","も","や","ゆ","よ","ら","り","る","れ","ろ","わ","を","ん"],
    romaji: ["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so","ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho","ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"]
  },
  katakana: {
    kana: ["ア","イ","ウ","エ","オ","カ","キ","ク","ケ","コ","サ","シ","ス","セ","ソ","タ","チ","ツ","テ","ト","ナ","ニ","ヌ","ネ","ノ","ハ","ヒ","フ","ヘ","ホ","マ","ミ","ム","メ","モ","ヤ","ユ","ヨ","ラ","リ","ル","レ","ロ","ワ","ヲ","ン"],
    romaji: ["a","i","u","e","o","ka","ki","ku","ke","ko","sa","shi","su","se","so","ta","chi","tsu","te","to","na","ni","nu","ne","no","ha","hi","fu","he","ho","ma","mi","mu","me","mo","ya","yu","yo","ra","ri","ru","re","ro","wa","wo","n"]
  }
};

const MAPS = {
  dakuten: {
    "か":"が","き":"ぎ","く":"ぐ","け":"げ","こ":"ご",
    "さ":"ざ","し":"じ","す":"ず","せ":"ぜ","そ":"ぞ",
    "た":"だ","ち":"ぢ","つ":"づ","て":"で","と":"ど",
    "は":"ば","ひ":"び","ふ":"ぶ","へ":"べ","ほ":"ぼ",
    "カ":"ガ","キ":"ギ","ク":"グ","ケ":"ゲ","コ":"ゴ",
    "サ":"ザ","シ":"ジ","ス":"ズ","セ":"ゼ","ソ":"ゾ",
    "タ":"ダ","チ":"ヂ","ツ":"ヅ","テ":"デ","ト":"ド",
    "ハ":"バ","ヒ":"ビ","フ":"ブ","ヘ":"ベ","ホ":"ボ"
  },
  handakuten: {
    "は":"ぱ","ひ":"ぴ","ふ":"ぷ","へ":"ぺ","ほ":"ぽ",
    "ハ":"パ","ヒ":"ピ","フ":"プ","ヘ":"ペ","ホ":"ポ"
  }
};

const ROW_FILTERS = {
  vowels: (k, r) => ["a","i","u","e","o"].includes(r),
  k: (k, r) => r.startsWith("k"),
  s: (k, r) => r.startsWith("s") || r === "shi",
  t: (k, r) => r.startsWith("t") || r === "chi" || r === "tsu",
  n: (k, r) => r.startsWith("n"),
  h: (k, r) => r.startsWith("h") || r === "fu",
  m: (k, r) => r.startsWith("m"),
  y: (k, r) => r.startsWith("y"),
  r: (k, r) => r.startsWith("r"),
  w: (k, r) => r === "wa" || r === "wo" || r === "n"
};
const ROW_KEYS = ["vowels","k","s","t","n","h","m","y","r","w"];

function combinedRowPredicate(selectedKeys) {
  const keys = (selectedKeys || []).filter(k => ROW_FILTERS[k]);
  if (keys.length === 0) return () => true;
  return (kana, romaji) => keys.some(k => ROW_FILTERS[k](kana, romaji));
}

function extendWithDakuten(kanaArr, romajiArr) {
  const kana = kanaArr.slice();
  const romaji = romajiArr.slice();
  for (let i = 0; i < kanaArr.length; i++) {
    const k = kanaArr[i];
    const r = romajiArr[i];
    if (MAPS.dakuten[k]) {
      kana.push(MAPS.dakuten[k]);
      let rr = r;
      if (rr.startsWith("h")) rr = "b" + rr.slice(1);
      if (rr === "shi") rr = "ji";
      if (rr === "chi") rr = "ji";
      if (rr === "tsu") rr = "zu";
      romaji.push(rr);
    }
    if (MAPS.handakuten[k]) {
      kana.push(MAPS.handakuten[k]);
      let rr = r;
      if (rr.startsWith("h")) rr = "p" + rr.slice(1);
      romaji.push(rr);
    }
  }
  return { kana, romaji };
}

function buildPool({ type, dakuten, rows }) {
  const base = BASE[type];
  const pred = combinedRowPredicate(rows);
  const isFiltered = Array.isArray(rows) && rows.length > 0;

  const k = [];
  const r = [];
  for (let i = 0; i < base.kana.length; i++) {
    if (pred(base.kana[i], base.romaji[i])) { k.push(base.kana[i]); r.push(base.romaji[i]); }
  }
  if (dakuten) {
    const ext = extendWithDakuten(k, r);
    return { ...ext, isFiltered };
  }
  return { kana: k, romaji: r, isFiltered };
}

function getResponsiveCols() {
  const w = window.innerWidth;
  if (w < 380) return 3;
  if (w < 576) return 4;
  if (w < 768) return 5;
  if (w < 992) return 7;
  return 10;
}

function generateFixedIndices(rand, poolSize, total, { maxPerSymbol, avoidImmediateRepeat = true } = {}) {
  const counts = new Uint16Array(poolSize);
  const out = new Uint16Array(total);

  const minNeeded = Math.ceil(total / Math.max(1, poolSize));
  if (!Number.isFinite(maxPerSymbol) || maxPerSymbol < minNeeded) maxPerSymbol = minNeeded;

  let prev = 65535;

  for (let i = 0; i < total; i++) {
    let idx = 0;
    let placed = false;

    for (let tries = 0; tries < 5000; tries++) {
      idx = (rand() * poolSize) | 0;
      if (avoidImmediateRepeat && idx === prev) continue;
      if (counts[idx] >= maxPerSymbol) continue;
      placed = true;
      break;
    }

    if (!placed) {
      // pick first available that isn't prev
      let found = false;
      for (let j = 0; j < poolSize; j++) {
        if ((!avoidImmediateRepeat || j !== prev) && counts[j] < maxPerSymbol) { idx = j; found = true; break; }
      }
      // if impossible (e.g., poolSize=1 or all others hit cap), allow prev
      if (!found) {
        for (let j = 0; j < poolSize; j++) {
          if (counts[j] < maxPerSymbol) { idx = j; break; }
        }
      }
    }

    counts[idx]++;
    out[i] = idx;
    prev = idx;
  }

  return out;
}

function buildUrlWithParams(s) {
  const url = new URL(window.location.href);
  const p = url.searchParams;
  const setOrDel = (key, val, isDefaultish = false) => {
    if (val === undefined || val === null || val === "" || isDefaultish) p.delete(key);
    else p.set(key, String(val));
  };

  setOrDel("lang", s.lang, s.lang === "en");
  setOrDel("type", s.type, s.type === "hiragana");
  setOrDel("seed", s.seed, false);
  setOrDel("d", s.dakuten ? "1" : "", false);
  setOrDel("font", s.font, s.font === "system-ui");

  const rowsVal = (s.rows && s.rows.length) ? s.rows.join(",") : "";
  setOrDel("rows", rowsVal, false);

  setOrDel("r", s.romaji ? "1" : "", false);
  setOrDel("n", s.numbers ? "1" : "", false);
  setOrDel("dark", s.dark ? "1" : "", false);
  setOrDel("endless", s.endless ? "1" : "", false);
  setOrDel("t", s.timerSeconds !== 60 ? s.timerSeconds : "", false);

  url.search = p.toString();
  return url.toString();
}

function readParams() {
  const p = new URLSearchParams(window.location.search);
  const rowsRaw = p.get("rows") || "";
  const rows = rowsRaw.split(",").map(s => s.trim()).filter(s => ROW_KEYS.includes(s));
  const lang = (p.get("lang") || "en").toLowerCase();
  const langNorm = (lang === "de" || lang === "ja") ? lang : "en";
  const tsec = parseInt(p.get("t") || "60", 10);
  return {
    lang: langNorm,
    type: (p.get("type") === "katakana") ? "katakana" : "hiragana",
    seed: sanitizeSeed(p.get("seed") || ""),
    dakuten: p.get("d") === "1",
    font: p.get("font") || "system-ui",
    rows,
    romaji: p.get("r") === "1",
    numbers: p.get("n") === "1",
    dark: p.get("dark") === "1",
    endless: p.get("endless") === "1",
    timerSeconds: Number.isFinite(tsec) && tsec > 0 ? clampTimerSeconds(tsec) : 60
  };
}

let state = {
  lang: "en",
  type: "hiragana",
  dakuten: false,
  font: "system-ui",
  rows: [],
  seed: "",
  romaji: false,
  numbers: false,
  dark: false,
  endless: false,
  timerSeconds: 60
};

let session = {
  seedUsed: "",
  poolKey: "",
  pool: null,
  rand: null,
  fixedIndices: null,
  gauntletIndices: [],
  observer: null
};

function renderRowCheckboxes(selectedRows) {
  const box = document.getElementById("rowFilterBox");
  box.replaceChildren();
  const sel = new Set((selectedRows || []).filter(k => ROW_KEYS.includes(k)));

  for (const key of ROW_KEYS) {
    const col = document.createElement("div");
    col.className = "col-6";
    const id = `row_${key}`;

    const wrap = document.createElement("div");
    wrap.className = "form-check";

    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.id = id;
    input.value = key;
    input.checked = sel.has(key);

    const label = document.createElement("label");
    label.className = "form-check-label";
    label.htmlFor = id;
    label.textContent = t(`row_${key}`);

    wrap.appendChild(input);
    wrap.appendChild(label);
    col.appendChild(wrap);
    box.appendChild(col);
  }
}

function readSelectedRowsFromUI() {
  const box = document.getElementById("rowFilterBox");
  return [...box.querySelectorAll('input[type="checkbox"]:checked')].map(x => x.value).filter(k => ROW_KEYS.includes(k));
}

function applyLanguageToUI() {
  document.getElementById("txtTitle").textContent = t("title");
  document.getElementById("settingsLabel").textContent = t("settings");
  document.getElementById("toastTitle").textContent = t("title");

  document.getElementById("txtShuffle").textContent = t("shuffle");
  document.getElementById("txtRomaji").textContent = t("romaji");
  document.getElementById("txtNumbers").textContent = t("numbers");
  document.getElementById("txtCopyLink").textContent = t("copyLink");
  document.getElementById("txtShortcuts").innerHTML = t("shortcutsHTML");
  document.getElementById("txtTip").textContent = t("tip");

  document.getElementById("lblLang").textContent = t("language");
  document.getElementById("lblKanaType").textContent = t("kanaType");
  document.getElementById("optHira").textContent = t("hiragana");
  document.getElementById("optKata").textContent = t("katakana");

  document.getElementById("lblDakutenTitle").textContent = t("dakutenTitle");
  document.getElementById("lblDakutenDesc").textContent = t("dakutenDesc");

  document.getElementById("lblTimerTitle").textContent = t("timerTitle");
  document.getElementById("txtTimerReset").textContent = t("timerReset");

  document.getElementById("lblGauntletTitle").textContent = t("gauntletTitle");
  document.getElementById("lblGauntletDesc").textContent = t("gauntletDesc");

  document.getElementById("lblRowsTitle").textContent = t("rowsTitle");
  document.getElementById("lblRowsDesc").textContent = t("rowsDesc");
  document.getElementById("btnRowsAll").textContent = t("rowsAll");
  document.getElementById("btnRowsNone").textContent = t("rowsNone");

  document.getElementById("lblFont").textContent = t("font");
  document.getElementById("lblSeed").textContent = t("seed");
  document.getElementById("seedInput").placeholder = t("seedPh");

  document.getElementById("lblDarkTitle").textContent = t("darkTitle");
  document.getElementById("lblDarkDesc").textContent = t("darkDesc");
  document.getElementById("txtResetPrefs").textContent = t("resetPrefs");

  document.getElementById("timesUpTitle").textContent = t("timesUpTitle");
  document.getElementById("timesUpBody").textContent = t("timesUpBody");
  document.getElementById("timesUpNext").textContent = t("timesUpNext");
  document.getElementById("timesUpClose").textContent = t("timesUpClose");

  renderRowCheckboxes(state.rows);
}

function syncUIFromState() {
  document.getElementById("langSelect").value = state.lang;
  document.getElementById("kanaType").value = state.type;
  document.getElementById("chkDakuten").checked = !!state.dakuten;
  document.getElementById("fontSelect").value = state.font || "system-ui";
  document.getElementById("chkDark").checked = !!state.dark;
  document.getElementById("chkEndless").checked = !!state.endless;
  document.getElementById("seedInput").value = state.seed || "";

  const card = document.getElementById("kanaCard");
  card.classList.toggle("show-romaji", !!state.romaji);
  card.classList.toggle("show-numbers", !!state.numbers);
  document.getElementById("btnToggleRomaji").setAttribute("aria-pressed", String(!!state.romaji));
  document.getElementById("btnToggleNumbers").setAttribute("aria-pressed", String(!!state.numbers));

  applyTheme(!!state.dark);

  const ti = document.getElementById("timerInput");
  if (ti) ti.value = secondsToTimeInput(state.timerSeconds);
}

function persist() {
  savePrefs({
    lang: state.lang,
    type: state.type,
    dakuten: state.dakuten,
    font: state.font,
    rows: state.rows,
    dark: state.dark
  });
  saveDailySeed(state.seed);

  const seedUsed = state.seed || todaySeed();
  const url = buildUrlWithParams({ ...state, seed: seedUsed });
  window.history.replaceState(null, "", url);
}

function resetSession() {
  session.seedUsed = "";
  session.poolKey = "";
  session.pool = null;
  session.rand = null;
  session.fixedIndices = null;
  session.gauntletIndices = [];
}

function ensureSession() {
  const seedUsed = state.seed || todaySeed();
  const key = JSON.stringify({ type: state.type, dakuten: state.dakuten, rows: state.rows, seedUsed });

  if (session.seedUsed !== seedUsed || session.poolKey !== key) {
    session.seedUsed = seedUsed;
    session.poolKey = key;
    session.pool = buildPool(state);
    session.rand = prngFrom(seedUsed);
    session.fixedIndices = null;
    session.gauntletIndices = [];
  }
}

function clearGrid() {
  document.getElementById("kanaGrid").replaceChildren();
}

function buildCell(idx, number) {
  const pool = session.pool;

  const cell = document.createElement("div");
  cell.className = "kana-cell";
  cell.setAttribute("role", "gridcell");

  const num = document.createElement("span");
  num.className = "kana-num";
  num.textContent = String(number);

  const k = document.createElement("span");
  k.className = "kana-char";
  k.textContent = pool.kana[idx];
  k.style.fontFamily = `"${state.font}", system-ui, sans-serif`;

  const r = document.createElement("span");
  r.className = "kana-romaji";
  r.textContent = pool.romaji[idx];

  cell.appendChild(num);
  cell.appendChild(k);
  cell.appendChild(r);

  return cell;
}

function renderFixed() {
  ensureSession();
  const grid = document.getElementById("kanaGrid");
  grid.style.setProperty("--cols", getResponsiveCols());
  clearGrid();

  const pool = session.pool;
  if (!pool || pool.kana.length === 0) return;

  if (!session.fixedIndices) {
    const maxPer = pool.isFiltered ? 9999 : 2;
    const rand = prngFrom(session.seedUsed); // deterministic and stable
    session.fixedIndices = generateFixedIndices(rand, pool.kana.length, 50, { maxPerSymbol: maxPer, avoidImmediateRepeat: true });
  }

  const frag = document.createDocumentFragment();
  for (let i = 0; i < session.fixedIndices.length; i++) {
    frag.appendChild(buildCell(session.fixedIndices[i], i + 1));
  }
  grid.appendChild(frag);
}

function appendGauntlet(amount) {
  ensureSession();
  const grid = document.getElementById("kanaGrid");
  grid.style.setProperty("--cols", getResponsiveCols());

  const pool = session.pool;
  if (!pool || pool.kana.length === 0) return;

  const frag = document.createDocumentFragment();
  const start = session.gauntletIndices.length;

  // Avoid immediate repeats (unless pool size is 1).
  let prev = (start > 0) ? session.gauntletIndices[start - 1] : -1;

  for (let i = 0; i < amount; i++) {
    let idx = -1;

    for (let tries = 0; tries < 50; tries++) {
      const candidate = (session.rand() * pool.kana.length) | 0;
      if (pool.kana.length === 1 || candidate !== prev) {
        idx = candidate;
        break;
      }
    }
    if (idx === -1) idx = (session.rand() * pool.kana.length) | 0;

    session.gauntletIndices.push(idx);
    frag.appendChild(buildCell(idx, start + i + 1));
    prev = idx;
  }
  grid.appendChild(frag);
}

function ensureGauntletScrollable() {
  if (!state.endless) return;
  let guard = 0;
  while (guard < 10) {
    const doc = document.documentElement;
    const scrollH = doc.scrollHeight;
    if (scrollH > window.innerHeight + 120) break;
    appendGauntlet(40);
    guard++;
  }
}

function setupGauntletObserver() {
  if (session.observer) session.observer.disconnect();
  const sentinel = document.getElementById("scrollSentinel");

  session.observer = new IntersectionObserver((entries) => {
    if (!state.endless) return;
    if (!entries.some(e => e.isIntersecting)) return;

    // re-arm pattern to keep firing even when sentinel stays visible
    try { session.observer.unobserve(sentinel); } catch {}
    appendGauntlet(60);
    ensureGauntletScrollable();
    requestAnimationFrame(() => {
      if (state.endless && session.observer) {
        try { session.observer.observe(sentinel); } catch {}
      }
    });
  }, { root: null, rootMargin: "1200px 0px", threshold: 0.01 });

  session.observer.observe(sentinel);
}

function render() {
  const seedUsed = state.seed || todaySeed();
  document.getElementById("seedHint").textContent = `Seed: ${seedUsed}`;

  if (state.endless) {
    ensureSession();
    const grid = document.getElementById("kanaGrid");
    grid.style.setProperty("--cols", getResponsiveCols());
    clearGrid();
    session.gauntletIndices = [];
    appendGauntlet(80);
    setupGauntletObserver();
    ensureGauntletScrollable();
  } else {
    if (session.observer) { session.observer.disconnect(); session.observer = null; }
    renderFixed();
  }
}

let running = false;
let remaining = 60;
let interval = null;

function updateTimer() {
  document.getElementById("timerDisplay").textContent = formatTime(remaining);
}

function clearTimesUpSignal() {
  document.getElementById("topHeader").classList.remove("header-timesup");
}

function showTimesUp() {
  document.getElementById("topHeader").classList.add("header-timesup");
  // refresh text in case language changed
  document.getElementById("timesUpTitle").textContent = t("timesUpTitle");
  document.getElementById("timesUpBody").textContent = t("timesUpBody");
  document.getElementById("timesUpNext").textContent = t("timesUpNext");
  document.getElementById("timesUpClose").textContent = t("timesUpClose");
  bootstrap.Modal.getOrCreateInstance(document.getElementById("timesUpModal")).show();
}

function startTimer() {
  if (running) return;
  running = true;
  document.querySelector("#btnPlayPause i").classList.replace("fa-play", "fa-pause");
  interval = setInterval(() => {
    if (remaining > 0) {
      remaining--;
      updateTimer();
      if (remaining === 0) {
        pauseTimer();
        showTimesUp();
        toast(t("toastTime"));
      }
    }
  }, 1000);
}

function pauseTimer() {
  running = false;
  document.querySelector("#btnPlayPause i").classList.replace("fa-pause", "fa-play");
  if (interval) clearInterval(interval);
  interval = null;
}

function resetTimer(toSeconds) {
  pauseTimer();
  clearTimesUpSignal();
  remaining = clampTimerSeconds(Number.isFinite(toSeconds) ? toSeconds : state.timerSeconds);
  updateTimer();
}

document.addEventListener("DOMContentLoaded", async () => {
  const params = readParams();
  const prefs = loadPrefs();
  const seedFromDaily = loadDailySeed();

  state.lang = params.lang || prefs.lang || "en";
  state.type = params.type || prefs.type || "hiragana";
  state.dakuten = (typeof params.dakuten === "boolean") ? params.dakuten : !!prefs.dakuten;
  state.font = params.font || prefs.font || "system-ui";
  state.rows = (params.rows && params.rows.length) ? params.rows : (prefs.rows || []);
  state.seed = params.seed || seedFromDaily || "";
  state.romaji = !!params.romaji;
  state.numbers = !!params.numbers;
  state.dark = (typeof params.dark === "boolean") ? params.dark : !!prefs.dark;
  state.endless = !!params.endless;
  state.timerSeconds = clampTimerSeconds(params.timerSeconds || 60);

  await setLanguage(state.lang);
  syncUIFromState();
  applyLanguageToUI();

  resetTimer(state.timerSeconds);
  render();
  persist();

  const rerenderSettings = async ({ reset = false } = {}) => {
    state.lang = document.getElementById("langSelect").value || "en";
    state.type = document.getElementById("kanaType").value;
    state.dakuten = document.getElementById("chkDakuten").checked;
    state.font = document.getElementById("fontSelect").value;
    state.dark = document.getElementById("chkDark").checked;
    state.rows = readSelectedRowsFromUI();
    state.seed = sanitizeSeed(document.getElementById("seedInput").value);
    state.endless = document.getElementById("chkEndless").checked;

    applyTheme(!!state.dark);
    await setLanguage(state.lang);
    applyLanguageToUI();

    if (reset) resetSession();
    render();
    persist();
  };

  document.getElementById("btnShuffle").addEventListener("click", async () => {
    await rerenderSettings({ reset: true });
    toast(t("toastShuffled"));
  });

  document.getElementById("btnToggleRomaji").addEventListener("click", () => {
    state.romaji = !state.romaji;
    const card = document.getElementById("kanaCard");
    card.classList.toggle("show-romaji", !!state.romaji);
    document.getElementById("btnToggleRomaji").setAttribute("aria-pressed", String(!!state.romaji));
    persist();
  });

  document.getElementById("btnToggleNumbers").addEventListener("click", () => {
    state.numbers = !state.numbers;
    const card = document.getElementById("kanaCard");
    card.classList.toggle("show-numbers", !!state.numbers);
    document.getElementById("btnToggleNumbers").setAttribute("aria-pressed", String(!!state.numbers));
    persist();
  });

  document.getElementById("btnCopyLink").addEventListener("click", async () => {
    const seedUsed = state.seed || todaySeed();
    const url = buildUrlWithParams({ ...state, seed: seedUsed });
    try {
      await navigator.clipboard.writeText(url);
      toast(t("toastLinkCopied"));
    } catch {
      toast(t("toastClipboardBlocked"));
    }
  });

  document.getElementById("btnPlayPause").addEventListener("click", () => { running ? pauseTimer() : startTimer(); });
  document.getElementById("btnReset").addEventListener("click", () => resetTimer(state.timerSeconds));

  document.getElementById("btnClearSeed").addEventListener("click", async () => {
    document.getElementById("seedInput").value = "";
    await rerenderSettings({ reset: true });
  });

  // Settings changes that affect generation
  ["langSelect","kanaType","chkDakuten","fontSelect","chkDark","chkEndless"].forEach(id => {
    document.getElementById(id).addEventListener("change", () => rerenderSettings({ reset: true }));
  });
  document.getElementById("rowFilterBox").addEventListener("change", () => rerenderSettings({ reset: true }));
  document.getElementById("seedInput").addEventListener("input", debounce(() => rerenderSettings({ reset: true }), 200));

  document.getElementById("btnRowsAll").addEventListener("click", () => {
    state.rows = ROW_KEYS.slice();
    renderRowCheckboxes(state.rows);
    rerenderSettings({ reset: true });
  });
  document.getElementById("btnRowsNone").addEventListener("click", () => {
    state.rows = [];
    renderRowCheckboxes(state.rows);
    rerenderSettings({ reset: true });
  });

  // Timer settings (not persisted)
  const timerInput = document.getElementById("timerInput");
  const applyTimerSeconds = (sec) => {
    state.timerSeconds = clampTimerSeconds(sec);
    if (timerInput) timerInput.value = secondsToTimeInput(state.timerSeconds);
    resetTimer(state.timerSeconds);
    persist(); // updates URL param t, but doesn't touch seed/kana
  };
  if (timerInput) {
    timerInput.addEventListener("change", () => {
      const sec = parseTimeInput(timerInput.value);
      if (sec === null) return;
      applyTimerSeconds(sec);
    });
  }
  document.getElementById("btnTimerReset").addEventListener("click", () => applyTimerSeconds(60));

  document.getElementById("btnResetPrefs").addEventListener("click", () => {
    localStorage.removeItem(PREF_KEY);
    localStorage.removeItem(SEED_KEY);
    window.location.href = window.location.pathname;
  });

  document.getElementById("timesUpNext").addEventListener("click", () => {
    bootstrap.Modal.getOrCreateInstance(document.getElementById("timesUpModal")).hide();
    resetTimer(state.timerSeconds);
    startTimer();
  });

  document.getElementById("timesUpModal").addEventListener("hidden.bs.modal", () => {
    clearTimesUpSignal();
  });

  window.addEventListener("resize", debounce(() => { render(); ensureGauntletScrollable(); }, 120));

  window.addEventListener("keydown", (e) => {
    const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
    const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
    if (typing) return;

    if (e.code === "Space") { e.preventDefault(); running ? pauseTimer() : startTimer(); }
    if (e.key.toLowerCase() === "m") document.getElementById("btnToggleRomaji").click();
    if (e.key === "#") document.getElementById("btnToggleNumbers").click();
  });
});