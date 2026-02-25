// -------------------- Kana Data --------------------
const hiragana = [
  "あ","い","う","え","お",
  "か","き","く","け","こ",
  "さ","し","す","せ","そ",
  "た","ち","つ","て","と",
  "な","に","ぬ","ね","の",
  "は","ひ","ふ","へ","ほ",
  "ま","み","む","め","も",
  "や","ゆ","よ",
  "ら","り","る","れ","ろ",
  "わ","を","ん"
];

const katakana = [
  "ア","イ","ウ","エ","オ",
  "カ","キ","ク","ケ","コ",
  "サ","シ","ス","セ","ソ",
  "タ","チ","ツ","テ","ト",
  "ナ","ニ","ヌ","ネ","ノ",
  "ハ","ヒ","フ","ヘ","ホ",
  "マ","ミ","ム","メ","モ",
  "ヤ","ユ","ヨ",
  "ラ","リ","ル","レ","ロ",
  "ワ","ヲ","ン"
];

const romaji = [
  "a","i","u","e","o",
  "ka","ki","ku","ke","ko",
  "sa","shi","su","se","so",
  "ta","chi","tsu","te","to",
  "na","ni","nu","ne","no",
  "ha","hi","fu","he","ho",
  "ma","mi","mu","me","mo",
  "ya","yu","yo",
  "ra","ri","ru","re","ro",
  "wa","wo","n"
];

const GRID_SIZE = 50;

// -------------------- Dakuten / Handakuten Builder --------------------
function buildExtendedKana(baseKana, baseRomaji) {
  const dakutenMap = {
    // Hiragana
    "か":"が","き":"ぎ","く":"ぐ","け":"げ","こ":"ご",
    "さ":"ざ","し":"じ","す":"ず","せ":"ぜ","そ":"ぞ",
    "た":"だ","ち":"ぢ","つ":"づ","て":"で","と":"ど",
    "は":"ば","ひ":"び","ふ":"ぶ","へ":"べ","ほ":"ぼ",

    // Katakana
    "カ":"ガ","キ":"ギ","ク":"グ","ケ":"ゲ","コ":"ゴ",
    "サ":"ザ","シ":"ジ","ス":"ズ","セ":"ゼ","ソ":"ゾ",
    "タ":"ダ","チ":"ヂ","ツ":"ヅ","テ":"デ","ト":"ド",
    "ハ":"バ","ヒ":"ビ","フ":"ブ","ヘ":"ベ","ホ":"ボ"
  };

  const handakutenMap = {
    // Hiragana
    "は":"ぱ","ひ":"ぴ","ふ":"ぷ","へ":"ぺ","ほ":"ぽ",

    // Katakana
    "ハ":"パ","ヒ":"ピ","フ":"プ","ヘ":"ペ","ホ":"ポ"
  };

  const extendedKana = [...baseKana];
  const extendedRomaji = [...baseRomaji];

  baseKana.forEach((kana, i) => {
    const baseR = baseRomaji[i];

    // Dakuten
    if (dakutenMap[kana]) {
      extendedKana.push(dakutenMap[kana]);

      let r = baseR;
      if (r.startsWith("h")) r = "b" + r.slice(1);
      if (r === "shi") r = "ji";
      if (r === "chi") r = "ji";
      if (r === "tsu") r = "zu";

      extendedRomaji.push(r);
    }

    // Handakuten
    if (handakutenMap[kana]) {
      extendedKana.push(handakutenMap[kana]);

      let r = baseR;
      if (r.startsWith("h")) r = "p" + r.slice(1);

      extendedRomaji.push(r);
    }
  });

  return { extendedKana, extendedRomaji };
}

// -------------------- Seeded PRNG --------------------
function hashStringToUint32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createPRNG(seedStr) {
  let state = hashStringToUint32(seedStr || "default");
  return function () {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// -------------------- URL Params --------------------
function getUrlParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    type: params.get("type") || "",
    seed: params.get("seed") || ""
  };
}

function buildUrlWithParams(type, seed) {
  const url = new URL(window.location.href);
  const params = url.searchParams;

  type ? params.set("type", type) : params.delete("type");
  seed ? params.set("seed", seed) : params.delete("seed");

  url.search = params.toString();
  return url.toString();
}

// -------------------- Seed Helpers --------------------
function sanitizeSeed(raw) {
  return raw ? raw.toLowerCase().replace(/[^a-z0-9]/g, "") : "";
}

function getDefaultDailySeed() {
  const d = new Date();
  return `day${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`;
}

// -------------------- Responsive Columns --------------------
function getResponsiveColumns() {
  const w = window.innerWidth;
  if (w < 400) return 4;
  if (w < 576) return 5;
  if (w < 768) return 6;
  if (w < 992) return 8;
  return 10;
}

// -------------------- Kana Grid Generation --------------------
function generateKanaIndices(prng, poolSize) {
  const counts = new Array(poolSize).fill(0);
  const result = [];

  for (let i = 0; i < GRID_SIZE; i++) {
    let candidate;
    let attempts = 0;

    do {
      attempts++;
      if (attempts > 1000) break;

      const weighted = [];

      for (let k = 0; k < poolSize; k++) {
        if (counts[k] >= 2) continue;
        if (i > 0 && k === result[i - 1]) continue;

        const weight = (2 - counts[k]) + 1;
        for (let w = 0; w < weight; w++) {
          weighted.push(k);
        }
      }

      candidate = weighted[Math.floor(prng() * weighted.length)];

    } while (candidate === undefined);

    counts[candidate]++;
    result.push(candidate);
  }

  return result;
}

function renderKanaGrid(type, seed) {
  const container = document.getElementById("kanaTableBody");
  container.innerHTML = "";

  const baseKana = type === "katakana" ? katakana : hiragana;
  const baseRomaji = romaji;

  const includeDakuten = document.getElementById("chkDakuten").checked;

  let kanaSet = baseKana;
  let romajiSet = baseRomaji;

  if (includeDakuten) {
    const ext = buildExtendedKana(baseKana, baseRomaji);
    kanaSet = ext.extendedKana;
    romajiSet = ext.extendedRomaji;
  }

  const prng = createPRNG(seed);
  const indices = generateKanaIndices(prng, kanaSet.length);

  const cols = getResponsiveColumns();
  container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let i = 0; i < GRID_SIZE; i++) {
    const idx = indices[i];
    const cell = document.createElement("div");
    cell.className = "kana-cell";

    const spanKana = document.createElement("span");
    spanKana.className = "kana-char";
    spanKana.textContent = kanaSet[idx];

    const spanRomaji = document.createElement("span");
    spanRomaji.className = "kana-romaji";
    spanRomaji.textContent = romajiSet[idx];

    cell.appendChild(spanKana);
    cell.appendChild(spanRomaji);
    container.appendChild(cell);
  }
}

// -------------------- Timer --------------------
let timerSecondsDefault = 60;
let timerSecondsRemaining = timerSecondsDefault;
let timerInterval = null;
let timerRunning = false;

function formatTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
}

function updateTimerDisplay() {
  document.getElementById("timerDisplay").textContent = formatTime(timerSecondsRemaining);
}

function startTimer() {
  if (timerRunning) return;
  timerRunning = true;
  document.querySelector("#btnPlayPause i").classList.replace("fa-play", "fa-pause");

  timerInterval = setInterval(() => {
    if (timerSecondsRemaining > 0) {
      timerSecondsRemaining--;
      updateTimerDisplay();
    } else {
      pauseTimer();
      document.querySelector("header").classList.add("header-blink");
    }
  }, 1000);
}

function pauseTimer() {
  timerRunning = false;
  document.querySelector("#btnPlayPause i").classList.replace("fa-pause", "fa-play");
  clearInterval(timerInterval);
  timerInterval = null;
}

function resetTimer() {
  pauseTimer();
  timerSecondsRemaining = timerSecondsDefault;
  updateTimerDisplay();
  document.querySelector("header").classList.remove("header-blink");
}

// -------------------- UI Wiring --------------------
document.addEventListener("DOMContentLoaded", () => {
  const kanaTypeSelect = document.getElementById("kanaType");
  const fontSelect = document.getElementById("fontSelect");
  const seedInput = document.getElementById("seedInput");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnToggleRomaji = document.getElementById("btnToggleRomaji");
  const btnCopyLink = document.getElementById("btnCopyLink");
  const btnPlayPause = document.getElementById("btnPlayPause");
  const btnReset = document.getElementById("btnReset");
  const btnClearSeed = document.getElementById("btnClearSeed");
  const chkDakuten = document.getElementById("chkDakuten");
  const kanaCard = document.querySelector(".kana-card");

  // URL params
  const params = getUrlParams();
  const initialType = ["hiragana", "katakana"].includes(params.type) ? params.type : "hiragana";
  kanaTypeSelect.value = initialType;

  const cleanedSeed = sanitizeSeed(params.seed);
  const effectiveSeed = cleanedSeed || getDefaultDailySeed();
  if (cleanedSeed) seedInput.value = cleanedSeed;

  renderKanaGrid(initialType, effectiveSeed);

  // Apply font after initial render
  document.querySelectorAll(".kana-char").forEach(el => {
    el.style.fontFamily = `"${fontSelect.value}"`;
  });

  updateTimerDisplay();

  // Regenerate
  btnGenerate.addEventListener("click", () => {
    const type = kanaTypeSelect.value;
    const cleaned = sanitizeSeed(seedInput.value);
    renderKanaGrid(type, cleaned || getDefaultDailySeed());

    document.querySelectorAll(".kana-char").forEach(el => {
      el.style.fontFamily = `"${fontSelect.value}"`;
    });
  });

  // Change type
  kanaTypeSelect.addEventListener("change", () => {
    const type = kanaTypeSelect.value;
    const cleaned = sanitizeSeed(seedInput.value);
    renderKanaGrid(type, cleaned || getDefaultDailySeed());

    document.querySelectorAll(".kana-char").forEach(el => {
      el.style.fontFamily = `"${fontSelect.value}"`;
    });
  });

  // Dakuten toggle
  chkDakuten.addEventListener("change", () => {
    const type = kanaTypeSelect.value;
    const cleaned = sanitizeSeed(seedInput.value);
    renderKanaGrid(type, cleaned || getDefaultDailySeed());

    document.querySelectorAll(".kana-char").forEach(el => {
      el.style.fontFamily = `"${fontSelect.value}"`;
    });
  });

  // Font change
  fontSelect.addEventListener("change", () => {
    document.querySelectorAll(".kana-char").forEach(el => {
      el.style.fontFamily = `"${fontSelect.value}"`;
    });
  });

  // Toggle romaji
  btnToggleRomaji.addEventListener("click", () => {
    kanaCard.classList.toggle("show-romaji");
  });

  // Copy link
  btnCopyLink.addEventListener("click", async () => {
    const type = kanaTypeSelect.value;
    const cleaned = sanitizeSeed(seedInput.value);
    const seedToUse = cleaned || getDefaultDailySeed();
    const url = buildUrlWithParams(type, seedToUse);

    try {
      await navigator.clipboard.writeText(url);
      btnCopyLink.innerHTML = '<i class="fa-solid fa-check me-1"></i> Copied';
      setTimeout(() => {
        btnCopyLink.innerHTML = '<i class="fa-solid fa-link me-1"></i> Copy link';
      }, 1500);
    } catch {
      alert("Clipboard copy failed.");
    }
  });

  // Timer
  btnPlayPause.addEventListener("click", () => {
    timerRunning ? pauseTimer() : startTimer();
  });

  btnReset.addEventListener("click", resetTimer);

  // Clear seed button
  btnClearSeed.addEventListener("click", () => {
    seedInput.value = "";
    seedInput.focus();
  });

  // Re-render on resize
  window.addEventListener("resize", () => {
    const type = kanaTypeSelect.value;
    const cleaned = sanitizeSeed(seedInput.value);
    renderKanaGrid(type, cleaned || getDefaultDailySeed());

    document.querySelectorAll(".kana-char").forEach(el => {
      el.style.fontFamily = `"${fontSelect.value}"`;
    });
  });
});
