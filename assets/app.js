/* Tunesmith — a single-page studio for the Suno API (docs.sunoapi.org). */
(() => {
  "use strict";

  /* =========================================================
   * Helpers
   * ======================================================= */
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmtTime = (s) => {
    s = Math.max(0, Math.round(Number(s) || 0));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };
  const pick = (o, ...keys) => {
    for (const k of keys) if (o && o[k] != null && o[k] !== "") return o[k];
    return undefined;
  };
  const uid = () => Math.random().toString(36).slice(2, 10);
  const clean = (o) => {
    const r = {};
    for (const [k, v] of Object.entries(o)) {
      if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length) || Number.isNaN(v)) continue;
      r[k] = v;
    }
    return r;
  };
  const safeFile = (s) => String(s || "track").replace(/[^\w\- ]+/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "track";

  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("tunesmith." + k);
        return v == null ? d : JSON.parse(v);
      } catch { return d; }
    },
    set(k, v) {
      try { localStorage.setItem("tunesmith." + k, JSON.stringify(v)); } catch { /* storage full or blocked */ }
    },
  };

  /* =========================================================
   * Static data
   * ======================================================= */
  const MODELS = [
    { id: "V6", name: "V6", desc: "Most natural vocals & richest detail", tag: "Best" },
    { id: "V6_WILD", name: "V6 Wild", desc: "Bolder, more distinctive & experimental", tag: "Bold" },
    { id: "V6_MINI", name: "V6 Mini", desc: "Lightweight & fast for quick sketches", tag: "Fast" },
    { id: "V5_5", name: "V5.5", desc: "Custom models tuned to your taste", legacy: true },
    { id: "V5", name: "V5", desc: "Superior expression, faster generation", legacy: true },
    { id: "V4_5PLUS", name: "V4.5+", desc: "Richer sound, up to 8 min", legacy: true },
    { id: "V4_5ALL", name: "V4.5 All", desc: "Smarter prompts, up to 8 min", legacy: true },
    { id: "V4_5", name: "V4.5", desc: "Smarter prompts, up to 8 min", legacy: true },
    { id: "V4", name: "V4", desc: "Improved vocals, up to 4 min", legacy: true },
  ];
  const DURATION_MODELS = ["V5_5", "V6", "V6_WILD", "V6_MINI"];
  const PERSONA_MODEL_MODELS = ["V5", "V5_5", "V6", "V6_WILD", "V6_MINI"];
  const limitsFor = (m) => (m === "V4" ? { style: 200, lyrics: 3000 } : { style: 1000, lyrics: 5000 });
  const modelName = (id) => MODELS.find((m) => m.id === id)?.name || id || "";

  const GENRES = ["Pop", "Hip-Hop", "R&B", "Rock", "Indie", "EDM", "Lo-fi", "Jazz", "Country", "Latin", "K-Pop", "Afrobeats", "Synthwave", "Metal", "Folk", "Funk", "Reggae", "Gospel", "Classical", "Cinematic"];
  const MOODS = ["Happy", "Melancholy", "Energetic", "Chill", "Romantic", "Epic", "Dark", "Dreamy", "Anthemic", "Playful"];
  const VOICES = ["Female vocals", "Male vocals", "Duet", "Choir", "Rap verses", "Acoustic guitar", "Piano", "808s", "Strings", "Saxophone"];
  const LYRIC_TAGS = ["[Intro]", "[Verse]", "[Pre-Chorus]", "[Chorus]", "[Hook]", "[Bridge]", "[Drop]", "[Instrumental]", "[Solo]", "[Outro]", "[End]"];
  const LYRIC_THEMES = ["Heartbreak", "Summer road trip", "Chasing dreams", "Late-night city", "Friendship", "Hometown", "Falling in love", "Starting over"];
  const SURPRISES = [
    { p: "A feel-good summer anthem about a spontaneous road trip with best friends, windows down, huge sing-along chorus", s: "upbeat pop, handclaps, bright guitars, female vocals" },
    { p: "A cat who secretly runs a jazz club after midnight", s: "smoky jazz, upright bass, brushed drums, crooner vocals" },
    { p: "Epic trailer music for a heist across the rings of Saturn", s: "cinematic orchestral, hybrid synths, pounding taiko, choir" },
    { p: "Lo-fi study session on a rainy Sunday with a cup of tea", s: "lo-fi hip hop, vinyl crackle, mellow keys, soft beats" },
    { p: "A heartfelt country ballad about the old pickup truck grandpa left behind", s: "country, acoustic guitar, pedal steel, warm male vocals" },
    { p: "An 80s synthwave chase through a neon city at 3am", s: "synthwave, gated drums, arpeggiated bass, dreamy female vocals" },
    { p: "A pirate sea shanty about losing the treasure map to a seagull", s: "sea shanty, stomps, accordion, gang vocals, playful" },
    { p: "A confident hip-hop track about the first day at a dream job", s: "hip hop, punchy 808s, trap hi-hats, confident rap" },
    { p: "A dreamy bedroom-pop love letter to someone you met on the last train home", s: "bedroom pop, chorus guitars, soft female vocals, reverb" },
    { p: "A high-energy K-pop banger about leveling up in life", s: "k-pop, EDM drop, bright synths, group vocals, rap bridge" },
    { p: "Latin party track for a rooftop birthday celebration", s: "reggaeton, dembow rhythm, latin pop, male vocals, festive" },
    { p: "A gentle lullaby sung by the moon to the sleepy ocean", s: "ambient lullaby, celesta, soft strings, whispery female vocals" },
  ];
  const SOUND_KEYS = ["Any", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B", "Cm", "C#m", "Dm", "D#m", "Em", "Fm", "F#m", "Gm", "G#m", "Am", "A#m", "Bm"];
  const STEM_NAMES = ["Lead Vocal", "Backing Vocals", "Drum Kit", "Kick", "Snare", "Hi-Hat", "Bass", "808", "Piano", "Electric Guitar", "Acoustic Guitar", "Synth", "Synth Pad", "Synth Bass", "Synth Lead", "Strings", "String Section", "Brass Section", "Woodwinds", "Percussion", "Organ", "Rhodes", "Choir", "Violin", "Cello", "Saxophone", "Trumpet", "Flute", "Harp", "Sound Effects"];
  const VARIETY_DESC = ["Exact style", "Balanced", "Distinct styles", "Bold exploration", "Unreasonably varied"];
  const WAIT_LINES = ["Tuning the guitars…", "Warming up the vocalist…", "Mixing the chorus…", "Adding a little sparkle…", "Finding the groove…", "Layering harmonies…", "Dialing in the bass…", "Polishing the master…", "Writing the hook…", "Counting in: 1, 2, 3, 4…"];

  /* =========================================================
   * State
   * ======================================================= */
  const state = {
    key: "",
    mode: store.get("mode", "simple"),
    model: store.get("model", "V6"),
    showLegacy: false,
    tracks: store.get("tracks", []),
    jobs: store.get("jobs", []),
    personas: store.get("personas", []),
    gender: "",
    variety: 1,
    libFilter: "all",
    libSearch: "",
    current: null,
    detailId: null,
    tool: null,
    credits: null,
  };
  const saveTracks = () => store.set("tracks", state.tracks);
  const saveJobs = () => store.set("jobs", state.jobs.slice(0, 60));
  const savePersonas = () => store.set("personas", state.personas);
  if (!MODELS.some((m) => m.id === state.model)) state.model = "V6";

  /* =========================================================
   * Theme
   * ======================================================= */
  const THEMES = [["light", "☀️", "Light"], ["dark", "🌙", "Dark"], ["system", "💻", "System"]];
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem("tunesmith.theme", t); } catch { /* ignore */ }
    $$("[data-theme-switch] button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.t === t)));
  }
  function initTheme() {
    $$("[data-theme-switch]").forEach((el) => {
      el.setAttribute("role", "group");
      el.setAttribute("aria-label", "Theme");
      el.innerHTML = THEMES.map(([t, i, n]) => `<button type="button" data-t="${t}" title="${n} theme" aria-label="${n} theme">${i}</button>`).join("");
      el.addEventListener("click", (e) => {
        const b = e.target.closest("button[data-t]");
        if (b) setTheme(b.dataset.t);
      });
    });
    setTheme(document.documentElement.dataset.theme || "system");
  }

  /* =========================================================
   * API key storage
   * ======================================================= */
  const KEY = "tunesmith.key";
  function loadKey() {
    try { return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ""; } catch { return ""; }
  }
  function saveKey(k, remember) {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      if (k) (remember ? localStorage : sessionStorage).setItem(KEY, k);
    } catch { /* ignore */ }
  }

  /* =========================================================
   * API client
   * ======================================================= */
  class ApiError extends Error {
    constructor(code, msg) { super(msg); this.code = code; }
  }
  const FRIENDLY = {
    400: "The request had invalid parameters.",
    401: "That API key wasn't accepted. Double-check it and try again.",
    404: "That endpoint wasn't found.",
    405: "Rate limit hit — give it a moment and try again.",
    413: "Your prompt or lyrics are too long for this model.",
    429: "You're out of credits. Top up your Suno API account to keep creating.",
    430: "Too many requests at once — please slow down a little.",
    455: "Suno is under maintenance right now. Please try again shortly.",
    500: "Suno had a server hiccup. Please try again.",
  };
  const DIRECT = { suno: "https://api.sunoapi.org/", upload: "https://sunoapiorg.redpandaai.co/" };
  const api = {
    mode: location.protocol === "file:" ? "direct" : "proxy",
    fellBack: false,
    base(kind, forceDirect) {
      return this.mode === "direct" || forceDirect ? DIRECT[kind] : `/api/${kind}/`;
    },
    async req(kind, path, opts = {}) {
      const { method = "GET", body, form, query, direct, key = state.key } = opts;
      const url = this.base(kind, direct) + path + (query ? "?" + new URLSearchParams(query) : "");
      const headers = { Authorization: "Bearer " + key };
      let payload;
      if (form) payload = form;
      else if (body) { headers["Content-Type"] = "application/json"; payload = JSON.stringify(body); }
      let res;
      try {
        res = await fetch(url, { method, headers, body: payload });
      } catch (err) {
        if (this.mode === "proxy" && !direct && !this.fellBack) { this.fellBack = true; this.mode = "direct"; return this.req(kind, path, opts); }
        throw new ApiError(0, "Network error — check your connection and try again.");
      }
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch { /* not JSON */ }
      if (!data) {
        // A static host without the Netlify function returns HTML — fall back to calling the API directly.
        if (this.mode === "proxy" && !direct && !this.fellBack) { this.fellBack = true; this.mode = "direct"; return this.req(kind, path, opts); }
        throw new ApiError(res.status, `Unexpected response from the server (${res.status}).`);
      }
      const code = Number(data.code ?? res.status);
      if (code !== 200 || !res.ok) {
        const base = FRIENDLY[code];
        const detail = data.msg && data.msg !== "success" ? data.msg : "";
        throw new ApiError(code, code === 400 || !base ? detail || base || `Error ${code}` : base + (detail && code !== 401 ? ` (${detail})` : ""));
      }
      return data.data;
    },
    post(path, body) { return this.req("suno", path, { method: "POST", body: { callBackUrl: CALLBACK, ...body } }); },
    get(path, query) { return this.req("suno", path, { query }); },
  };
  const CALLBACK = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname) || location.protocol === "file:"
    ? "https://example.com/callback"
    : location.origin + "/api/callback";

  async function uploadFile(file) {
    const form = new FormData();
    form.append("file", file);
    form.append("uploadPath", "tunesmith");
    form.append("fileName", `${Date.now()}-${safeFile(file.name.replace(/\.[^.]+$/, ""))}${(file.name.match(/\.[^.]+$/) || [""])[0]}`);
    // Netlify functions cap request bodies at ~6MB, so send big files straight to the upload API.
    const big = file.size > 5.5 * 1024 * 1024;
    try {
      const d = await api.req("upload", "api/file-stream-upload", { method: "POST", form, direct: big });
      const url = pick(d || {}, "fileUrl", "downloadUrl", "url");
      if (!url) throw new ApiError(0, "Upload finished but no file URL came back.");
      return url;
    } catch (e) {
      if (big && e.code === 0) throw new ApiError(0, "That file is too large to upload from the browser. Paste a public URL to it instead.");
      throw e;
    }
  }

  /* =========================================================
   * Toasts & confetti
   * ======================================================= */
  function toast(msg, type = "", ms = 4500) {
    const t = document.createElement("div");
    t.className = "toast " + type;
    t.innerHTML = msg;
    $("#toasts").appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .3s"; setTimeout(() => t.remove(), 300); }, ms);
  }
  const errToast = (e) => toast("⚠️ " + esc(e?.message || e), "err", 7000);

  function confetti() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const c = $("#confetti");
    const ctx = c.getContext("2d");
    c.width = innerWidth; c.height = innerHeight;
    const colors = ["#7c3aed", "#db2777", "#f59e0b", "#10b981", "#3b82f6"];
    const parts = Array.from({ length: 140 }, () => ({
      x: innerWidth / 2 + (Math.random() - .5) * 200, y: innerHeight * .35,
      vx: (Math.random() - .5) * 14, vy: Math.random() * -12 - 4,
      r: Math.random() * 6 + 3, c: colors[(Math.random() * colors.length) | 0], a: Math.random() * Math.PI, va: (Math.random() - .5) * .3,
    }));
    let frame = 0;
    (function tick() {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) {
        p.vy += .35; p.x += p.vx; p.y += p.vy; p.a += p.va; p.vx *= .99;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.fillStyle = p.c; ctx.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * .6); ctx.restore();
      }
      if (++frame < 110) requestAnimationFrame(tick); else ctx.clearRect(0, 0, c.width, c.height);
    })();
  }

  function busy(btn, on) {
    if (!btn) return;
    btn.disabled = on;
    btn.classList.toggle("busy", on);
  }

  /* =========================================================
   * Gate
   * ======================================================= */
  function showGate(err) {
    $("#app").hidden = true;
    $("#gate").hidden = false;
    $("#gate-error").hidden = !err;
    $("#gate-error").textContent = err || "";
    setTimeout(() => $("#gate-key").focus(), 50);
  }
  function showApp() {
    $("#gate").hidden = true;
    $("#app").hidden = false;
  }
  function initGate() {
    $("#gate-toggle").addEventListener("click", () => {
      const i = $("#gate-key");
      i.type = i.type === "password" ? "text" : "password";
    });
    $("#gate-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const key = $("#gate-key").value.trim();
      if (!key) return;
      const btn = $("#gate-submit");
      busy(btn, true);
      $("#gate-error").hidden = true;
      try {
        const credits = await api.req("suno", "api/v1/generate/credit", { key });
        state.key = key;
        saveKey(key, $("#gate-remember").checked);
        $("#gate-key").value = "";
        setCredits(credits);
        showApp();
        resumeJobs();
        toast(`🎉 You're in! <b>${esc(credits ?? "?")}</b> credits ready to go.`, "ok");
      } catch (err) {
        $("#gate-error").textContent = err.code === 401 ? "That key wasn't accepted. Check it and try again." : err.message;
        $("#gate-error").hidden = false;
      } finally {
        busy(btn, false);
      }
    });
    $("#logout").addEventListener("click", () => {
      if (!confirm("Remove your API key from this browser? Your library stays saved.")) return;
      saveKey("");
      state.key = "";
      audio.pause();
      showGate();
    });
  }

  /* =========================================================
   * Credits
   * ======================================================= */
  function setCredits(n) {
    state.credits = n;
    $("#credits-val").textContent = n == null ? "—" : Number(n).toLocaleString(undefined, { maximumFractionDigits: 2 });
    $("#credits").classList.toggle("low", n != null && n < 20);
  }
  async function refreshCredits(quiet = true) {
    try {
      setCredits(await api.get("api/v1/generate/credit"));
    } catch (e) {
      if (e.code === 401) { saveKey(""); showGate("Your API key is no longer valid. Please enter a new one."); }
      else if (!quiet) errToast(e);
    }
  }

  /* =========================================================
   * Tabs
   * ======================================================= */
  function switchTab(name) {
    $$(".tabs [data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    $$("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== name));
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function initTabs() {
    $(".tabs").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tab]");
      if (b) switchTab(b.dataset.tab);
    });
    const h = location.hash.slice(1);
    if (["create", "studio", "lyrics", "library"].includes(h)) switchTab(h);
  }

  /* =========================================================
   * Shared UI bits
   * ======================================================= */
  function bindCounter(input, root = document) {
    const c = $(`[data-count-for="${input.id}"]`, root);
    if (!c) return;
    const upd = () => {
      const max = Number(input.getAttribute("maxlength")) || 0;
      c.textContent = max ? `${input.value.length}/${max}` : String(input.value.length);
      c.classList.toggle("over", max && input.value.length >= max);
    };
    input.addEventListener("input", upd);
    input._updCount = upd;
    upd();
  }
  function setVal(input, v) {
    input.value = v;
    input._updCount?.();
    input.dispatchEvent(new Event("input"));
  }
  function tagChips(container, list, input) {
    container.innerHTML = list.map((g) => `<button type="button" class="chip" data-v="${esc(g)}">${esc(g)}</button>`).join("");
    const sync = () => {
      const parts = input.value.split(",").map((s) => s.trim().toLowerCase());
      $$(".chip", container).forEach((c) => c.classList.toggle("on", parts.includes(c.dataset.v.toLowerCase())));
    };
    container.addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (!b) return;
      let parts = input.value.split(",").map((s) => s.trim()).filter(Boolean);
      const v = b.dataset.v;
      const i = parts.findIndex((p) => p.toLowerCase() === v.toLowerCase());
      if (i >= 0) parts.splice(i, 1); else parts.push(v);
      setVal(input, parts.join(", "));
    });
    input.addEventListener("input", sync);
    sync();
  }
  function insertAtCursor(ta, text) {
    const s = ta.selectionStart ?? ta.value.length, e = ta.selectionEnd ?? s;
    const before = ta.value.slice(0, s);
    const pre = before && !before.endsWith("\n") ? "\n\n" : before.endsWith("\n") && !before.endsWith("\n\n") && before ? "\n" : "";
    const ins = pre + text + "\n";
    ta.value = before + ins + ta.value.slice(e);
    ta.selectionStart = ta.selectionEnd = s + ins.length;
    ta.focus();
    ta._updCount?.();
  }
  function segGroup(el, onChange) {
    el.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      $$("button", el).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      onChange(b.dataset.v ?? b.dataset.mode ?? b.dataset.f);
    });
  }
  function sliderHTML(k, label, lo, hi, def = 0.5) {
    return `<div class="field slider" data-slider="${k}">
      <div class="label-row">
        <label class="check"><input type="checkbox" data-on /> <span class="label">${label}</span></label>
        <b data-out>Auto</b>
      </div>
      <input type="range" min="0" max="1" step="0.01" value="${def}" disabled aria-label="${label}" />
      <div class="hint"><span>${lo}</span><span>${hi}</span></div>
    </div>`;
  }
  function bindSlider(el) {
    const on = $("[data-on]", el), r = $("input[type=range]", el), out = $("[data-out]", el);
    const upd = () => { r.disabled = !on.checked; out.textContent = on.checked ? Math.round(r.value * 100) + "%" : "Auto"; };
    on.addEventListener("change", upd);
    r.addEventListener("input", upd);
    upd();
    return () => (on.checked ? Math.round(r.value * 100) / 100 : undefined);
  }
  const SLIDERS = [
    ["styleWeight", "Style influence", "Loose", "Strict"],
    ["weirdnessConstraint", "Weirdness", "Safe", "Wild"],
    ["audioWeight", "Audio influence", "Subtle", "Strong"],
  ];
  const artHTML = (t, cls = "art") =>
    t?.imageUrl ? `<img class="${cls}" src="${esc(t.imageUrl)}" alt="" loading="lazy" />` : `<div class="${cls}${t?.pending ? " pending" : ""}"></div>`;

  /* =========================================================
   * CREATE
   * ======================================================= */
  const sliderGetters = {};
  function renderModels() {
    const list = MODELS.filter((m) => !m.legacy || state.showLegacy || m.id === state.model);
    $("#models").innerHTML = list.map((m) => `
      <button type="button" class="model${m.legacy ? " legacy" : ""}" data-m="${m.id}" aria-pressed="${m.id === state.model}">
        <span class="tag">${m.legacy ? "Legacy" : m.tag}</span>
        <b>${m.name}</b><span>${m.desc}</span>
      </button>`).join("");
  }
  function applyModel() {
    const lim = limitsFor(state.model);
    $("#s-style").maxLength = lim.style;
    $("#c-style").maxLength = lim.style;
    $("#c-lyrics").maxLength = lim.lyrics;
    ["s-style", "c-style", "c-lyrics"].forEach((id) => $("#" + id)._updCount?.());
    const dur = DURATION_MODELS.includes(state.model);
    $("#c-duration-on").disabled = !dur;
    if (!dur) $("#c-duration-on").checked = false;
    $("#c-duration").disabled = !dur || !$("#c-duration-on").checked;
    $("#duration-note").textContent = dur ? "Pick an approximate length for the song." : "Length control needs V6, V6 Wild, V6 Mini or V5.5.";
    $("#c-persona-model").disabled = !PERSONA_MODEL_MODELS.includes(state.model);
  }
  function setMode(mode) {
    state.mode = mode;
    store.set("mode", mode);
    $$("#mode-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mode === mode)));
    $$(".mode-simple").forEach((el) => (el.hidden = mode !== "simple"));
    $$(".mode-custom").forEach((el) => (el.hidden = mode !== "custom"));
  }
  function renderPersonaSelect() {
    const sel = $("#c-persona");
    const cur = sel.value;
    sel.innerHTML = `<option value="">None</option>` + state.personas.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("");
    sel.value = state.personas.some((p) => p.id === cur) ? cur : "";
  }

  function initCreate() {
    renderModels();
    $("#models").addEventListener("click", (e) => {
      const b = e.target.closest("[data-m]");
      if (!b) return;
      state.model = b.dataset.m;
      store.set("model", state.model);
      renderModels();
      applyModel();
    });
    $("#show-legacy").addEventListener("change", (e) => { state.showLegacy = e.target.checked; renderModels(); });

    segGroup($("#mode-seg"), setMode);
    setMode(state.mode);

    ["s-prompt", "s-style", "s-lyrics", "c-title", "c-style", "c-lyrics", "c-neg", "l-prompt"].forEach((id) => bindCounter($("#" + id)));
    tagChips($("#s-chips"), [...GENRES.slice(0, 12), ...MOODS.slice(0, 6), ...VOICES.slice(0, 2)], $("#s-style"));
    tagChips($("#c-chips"), [...GENRES, ...MOODS, ...VOICES], $("#c-style"));

    $("#surprise").addEventListener("click", () => {
      const s = SURPRISES[(Math.random() * SURPRISES.length) | 0];
      setVal($("#s-prompt"), s.p);
      setVal($("#s-style"), s.s);
      $("#s-prompt").animate([{ transform: "scale(.98)" }, { transform: "none" }], { duration: 200 });
    });

    $("#lyric-tags").innerHTML = LYRIC_TAGS.map((t) => `<button type="button" data-t="${t}">${t}</button>`).join("");
    $("#lyric-tags").addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]");
      if (b) insertAtCursor($("#c-lyrics"), b.dataset.t);
    });

    // Reference media lists (simple mode)
    $$(".ref-list").forEach(initRefList);

    // Advanced
    segGroup($("#c-gender"), (v) => (state.gender = v));
    segGroup($("#c-variety"), (v) => { state.variety = Number(v); $("#variety-desc").textContent = VARIETY_DESC[state.variety]; });
    $("#c-sliders").innerHTML = SLIDERS.map(([k, l, lo, hi]) => sliderHTML(k, l, lo, hi)).join("");
    $$("#c-sliders [data-slider]").forEach((el) => (sliderGetters[el.dataset.slider] = bindSlider(el)));
    const dur = $("#c-duration"), durOn = $("#c-duration-on");
    const durUpd = () => { dur.disabled = !durOn.checked; $("#c-duration-val").textContent = durOn.checked ? fmtTime(dur.value) : "Auto"; };
    dur.addEventListener("input", durUpd);
    durOn.addEventListener("change", durUpd);
    durUpd();
    renderPersonaSelect();
    $("#c-persona").addEventListener("change", (e) => {
      const p = state.personas.find((x) => x.id === e.target.value);
      if (p) { $("#c-persona-custom").value = ""; $("#c-persona-model").value = p.model || "style_persona"; }
    });
    applyModel();

    $("#instrumental").addEventListener("change", () => {
      const inst = $("#instrumental").checked;
      $("#c-lyrics").closest(".field").style.opacity = inst ? ".5" : "";
    });

    $("#boost-style").addEventListener("click", boostStyle);
    $("#write-lyrics").addEventListener("click", () => lyricsModal());
    $("#create-form").addEventListener("submit", submitCreate);
  }

  function initRefList(list) {
    const max = Number(list.dataset.max);
    const add = (val = "") => {
      if ($$(".ref-item", list).length >= max) return;
      const row = document.createElement("div");
      row.className = "ref-item";
      row.innerHTML = `<input type="url" placeholder="https://… or upload" value="${esc(val)}" />
        <label class="btn soft sm" title="Upload a file">⬆<input type="file" accept="${list.dataset.accept}" hidden /></label>
        <button type="button" class="btn ghost sm" title="Remove">✕</button>`;
      $("button", row).addEventListener("click", () => { row.remove(); ensure(); });
      $("input[type=file]", row).addEventListener("change", async (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const lbl = $("label", row);
        busy(lbl, true);
        try { $("input[type=url]", row).value = await uploadFile(f); toast("📎 Uploaded " + esc(f.name), "ok"); }
        catch (err) { errToast(err); }
        finally { busy(lbl, false); }
      });
      $("input[type=url]", row).addEventListener("input", ensure);
      list.appendChild(row);
    };
    const ensure = () => {
      const items = $$(".ref-item", list);
      if (!items.length || (items.every((r) => $("input[type=url]", r).value.trim()) && items.length < max)) add();
    };
    list._values = () => $$("input[type=url]", list).map((i) => i.value.trim()).filter(Boolean);
    list._reset = () => { list.innerHTML = ""; ensure(); };
    ensure();
  }

  async function boostStyle() {
    const input = $("#c-style");
    const content = input.value.trim() || $("#c-title").value.trim();
    if (!content) { toast("Type a few words about the style first, then Boost it ✨", "warn"); input.focus(); return; }
    const btn = $("#boost-style");
    busy(btn, true);
    try {
      const d = await api.req("suno", "api/v1/style/generate", { method: "POST", body: { content } });
      const result = d?.result;
      if (!result) throw new ApiError(0, "The style booster didn't return anything — try rephrasing.");
      setVal(input, result.slice(0, Number(input.maxLength) || 1000));
      toast("✨ Style boosted!", "ok");
      refreshCredits();
    } catch (e) { errToast(e); }
    finally { busy(btn, false); }
  }

  async function submitCreate(e) {
    e.preventDefault();
    const inst = $("#instrumental").checked;
    let body;
    let label;
    if (state.mode === "simple") {
      const prompt = $("#s-prompt").value.trim();
      const style = $("#s-style").value.trim();
      const lyrics = inst ? "" : $("#s-lyrics").value.trim();
      const imageUrls = $('[data-ref="image"]')._values();
      const audioUrls = $('[data-ref="audio"]')._values();
      const videoUrls = $('[data-ref="video"]')._values();
      if (!style && !lyrics && !imageUrls.length && !audioUrls.length && !videoUrls.length) {
        toast(prompt ? "Almost! Pick a vibe chip or type a <b>style</b> so Suno knows the sound." : "Describe your song and pick a vibe to get started 🎶", "warn");
        (prompt ? $("#s-style") : $("#s-prompt")).focus();
        return;
      }
      if (1 + (lyrics ? 1 : 0) + imageUrls.length + audioUrls.length + videoUrls.length > 10) { toast("Too many attachments — the limit is 10 in total.", "warn"); return; }
      body = clean({ customMode: false, instrumental: inst, model: state.model, prompt, style, lyrics, imageUrls, audioUrls, videoUrls });
      label = prompt || style || "New song";
    } else {
      const title = $("#c-title").value.trim();
      const style = $("#c-style").value.trim();
      const lyrics = inst ? "" : $("#c-lyrics").value.trim();
      const negativeTags = $("#c-neg").value.trim();
      if (!inst && !lyrics) {
        toast("Add some lyrics (try <b>✍️ Write with AI</b>) or switch on <b>Instrumental</b>.", "warn");
        $("#c-lyrics").focus();
        return;
      }
      if (!style && !lyrics && !negativeTags) { toast("Give it a style of music first 🎸", "warn"); $("#c-style").focus(); return; }
      const personaId = $("#c-persona-custom").value.trim() || $("#c-persona").value;
      const durOk = DURATION_MODELS.includes(state.model) && $("#c-duration-on").checked;
      body = clean({
        customMode: true, instrumental: inst, model: state.model, title, style, lyrics, negativeTags,
        vocalGender: inst ? undefined : state.gender || undefined,
        styleWeight: sliderGetters.styleWeight(),
        weirdnessConstraint: sliderGetters.weirdnessConstraint(),
        audioWeight: inst ? undefined : sliderGetters.audioWeight(),
        variety: state.variety,
        duration: durOk ? Number($("#c-duration").value) : undefined,
        personaId,
        personaModel: personaId && PERSONA_MODEL_MODELS.includes(state.model) ? $("#c-persona-model").value : undefined,
      });
      label = title || style || "Custom song";
    }
    const btn = $("#create-btn");
    busy(btn, true);
    try {
      const d = await api.post("api/v1/generate", body);
      startJob("music", d.taskId, label, { op: "generate", model: state.model });
      toast("🎶 Your song is cooking! It usually takes 1–3 minutes.", "ok");
      refreshCredits();
    } catch (err) { errToast(err); }
    finally { busy(btn, false); }
  }

  /* =========================================================
   * Jobs (task polling)
   * ======================================================= */
  const flag = (d) => {
    const f = d?.successFlag;
    if (f === "SUCCESS" || f === 1 || f === "1") return "done";
    if (f == null || f === "PENDING" || f === 0 || f === "0") return "pending";
    return "failed";
  };
  const KINDS = {
    music: {
      path: "api/v1/generate/record-info", icon: "🎵", name: "Song",
      parse(d) {
        const items = (d?.response?.sunoData || d?.response?.data || []).map(normTrack).filter((t) => t.id);
        const st = d?.status || "PENDING";
        if (st === "SUCCESS" || (st === "CALLBACK_EXCEPTION" && items.some((t) => t.audioUrl))) return { done: true, items };
        if (/FAIL|ERROR|SENSITIVE|EXCEPTION/.test(st)) return { failed: true, error: d.errorMessage || (st === "SENSITIVE_WORD_ERROR" ? "The prompt was flagged by content filters — try rewording it." : st.replace(/_/g, " ").toLowerCase()) };
        return { items, stage: { PENDING: "Queued", TEXT_SUCCESS: "Lyrics written", FIRST_SUCCESS: "First take ready — streaming!" }[st] || st };
      },
    },
    lyrics: {
      path: "api/v1/lyrics/record-info", icon: "✍️", name: "Lyrics",
      parse(d) {
        const st = d?.status || "PENDING";
        const items = (d?.response?.data || []).filter((x) => x.status !== "failed" && x.text);
        if (st === "SUCCESS" || (st === "CALLBACK_EXCEPTION" && items.length)) return { done: true, items };
        if (/FAIL|ERROR|SENSITIVE|EXCEPTION/.test(st)) return { failed: true, error: d.errorMessage || st };
        return {};
      },
    },
    wav: {
      path: "api/v1/wav/record-info", icon: "🎚️", name: "WAV",
      parse(d) { const f = flag(d); return f === "done" ? { done: true, url: d.response?.audioWavUrl } : f === "failed" ? { failed: true, error: d.errorMessage || d.successFlag } : {}; },
    },
    stems: {
      path: "api/v1/vocal-removal/record-info", icon: "🥁", name: "Stems",
      parse(d) {
        const f = flag(d);
        if (f === "failed") return { failed: true, error: d.errorMessage || d.successFlag };
        if (f !== "done") return {};
        const r = d.response || {};
        let items = (r.originData || []).filter((x) => x.audio_url || x.audioUrl).map((x) => ({ name: x.stem_type_group_name || "Stem", url: x.audio_url || x.audioUrl, id: x.id }));
        if (!items.length) {
          items = Object.entries(r).filter(([k, v]) => /Url$/.test(k) && k !== "originUrl" && v).map(([k, v]) => ({ name: k.replace(/Url$/, "").replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase()), url: v }));
        }
        return { done: true, items };
      },
    },
    mp4: {
      path: "api/v1/mp4/record-info", icon: "🎬", name: "Music video",
      parse(d) { const f = flag(d); return f === "done" ? { done: true, url: d.response?.videoUrl } : f === "failed" ? { failed: true, error: d.errorMessage || d.successFlag } : {}; },
    },
    midi: {
      path: "api/v1/midi/record-info", icon: "🎹", name: "MIDI",
      parse(d) {
        const f = flag(d);
        if (f === "failed") return { failed: true, error: d.errorMessage || "MIDI generation failed" };
        return f === "done" ? { done: true, instruments: d.midiData?.instruments || [] } : {};
      },
    },
    art: {
      path: "api/v1/suno/cover/record-info", icon: "🖼️", name: "Cover art",
      parse(d) { const f = flag(d); return f === "done" ? { done: true, images: d.response?.images || [] } : f === "failed" ? { failed: true, error: d.errorMessage || "Cover generation failed" } : {}; },
    },
  };
  const pollers = {};
  const waiters = {};

  function normTrack(s) {
    return {
      id: s.id || s.audioId,
      title: pick(s, "title") || "Untitled",
      tags: pick(s, "tags") || "",
      prompt: pick(s, "prompt", "lyric") || "",
      imageUrl: pick(s, "imageUrl", "image_url", "sourceImageUrl", "source_image_url", "imageLargeUrl"),
      audioUrl: pick(s, "audioUrl", "audio_url", "sourceAudioUrl", "source_audio_url"),
      streamUrl: pick(s, "streamAudioUrl", "stream_audio_url", "sourceStreamAudioUrl", "source_stream_audio_url"),
      duration: Number(pick(s, "duration")) || 0,
      modelName: pick(s, "modelName", "model_name") || "",
      createTime: pick(s, "createTime"),
    };
  }

  function startJob(kind, taskId, label, meta = {}) {
    if (!taskId) throw new ApiError(0, "No task ID was returned.");
    const job = { id: taskId, kind, label: String(label).slice(0, 120), meta, status: "running", stage: "Queued", created: Date.now() };
    state.jobs = [job, ...state.jobs.filter((j) => j.id !== taskId)];
    saveJobs();
    renderJobs();
    poll(job);
    return new Promise((resolve, reject) => (waiters[taskId] = { resolve, reject }));
  }

  function resumeJobs() {
    const now = Date.now();
    state.jobs.forEach((j) => {
      if (j.status !== "running") return;
      if (now - j.created > 60 * 60 * 1000) { j.status = "failed"; j.error = "Timed out"; return; }
      if (!pollers[j.id]) poll(j);
    });
    saveJobs();
    renderJobs();
  }

  async function poll(job) {
    const K = KINDS[job.kind];
    let delay = job.kind === "music" ? 5000 : 4000;
    let failures = 0;
    pollers[job.id] = true;
    let quip = 0;
    while (job.status === "running") {
      await sleep(delay);
      if (!state.key) { delete pollers[job.id]; return; }
      if (Date.now() - job.created > 30 * 60 * 1000) { finishJob(job, { failed: true, error: "Timed out waiting for Suno. Try importing the task ID later." }); break; }
      try {
        const d = await api.get(K.path, { taskId: job.id });
        failures = 0;
        const r = K.parse(d || {});
        if (r.failed) { finishJob(job, r); break; }
        if (r.done) { finishJob(job, r); break; }
        if (job.kind === "music" && r.items?.length) upsertTracks(r.items, job, true);
        job.stage = r.stage && r.stage !== "Queued" ? r.stage : WAIT_LINES[quip++ % WAIT_LINES.length];
        renderJobs();
        delay = Math.min(delay + 1000, 10000);
      } catch (e) {
        if (e.code === 401) { delete pollers[job.id]; return; }
        if (++failures >= 6) { finishJob(job, { failed: true, error: e.message }); break; }
      }
    }
    delete pollers[job.id];
  }

  function finishJob(job, r) {
    job.status = r.failed ? "failed" : "done";
    job.error = r.error;
    job.stage = r.failed ? "Failed" : "Done";
    job.finished = Date.now();
    saveJobs();
    renderJobs();
    const w = waiters[job.id];
    delete waiters[job.id];
    if (r.failed) {
      toast(`❌ ${esc(KINDS[job.kind].name)} failed: ${esc(r.error || "unknown error")}`, "err", 8000);
      w?.reject(new ApiError(0, r.error || "Task failed"));
      renderRecent();
      return;
    }
    const t = job.meta.trackId && findTrack(job.meta.trackId);
    switch (job.kind) {
      case "music": {
        const tracks = upsertTracks(r.items, job, false);
        confetti();
        toast(`🎉 <b>${esc(tracks[0]?.title || "Your song")}</b> is ready!${tracks.length > 1 ? ` (${tracks.length} takes)` : ""}`, "ok", 6000);
        if (tracks[0] && (!state.current || audio.paused)) playTrack(tracks[0].id);
        break;
      }
      case "wav": if (t) { t.extras.wav = r.url; toast("🎚️ WAV ready for " + esc(t.title), "ok"); } break;
      case "stems": if (t) { t.extras.stems = { taskId: job.id, type: job.meta.type, items: r.items }; toast(`🥁 ${r.items.length} stems ready for ${esc(t.title)}`, "ok"); } break;
      case "mp4": if (t) { t.extras.video = r.url; toast("🎬 Music video ready for " + esc(t.title), "ok"); } break;
      case "art": if (t) { t.extras.covers = r.images; toast("🖼️ New cover art options ready!", "ok"); } break;
      case "midi": if (t) { t.extras.midi = { taskId: job.id, instruments: r.instruments.map((i) => ({ name: i.name, count: i.notes?.length || 0 })) }; toast("🎹 MIDI ready for " + esc(t.title), "ok"); } break;
      case "lyrics": toast("✍️ Fresh lyrics are ready!", "ok"); break;
    }
    if (t) { saveTracks(); if (state.detailId === t.id) renderDetail(); }
    w?.resolve(r);
    refreshCredits();
    renderRecent();
  }

  function upsertTracks(items, job, pending) {
    const out = [];
    const fresh = [];
    for (const it of items) {
      if (!it.id) continue;
      let t = findTrack(it.id);
      if (!t) { t = { id: it.id, taskId: job.id, created: Date.now(), fav: false, extras: {}, op: job.meta.op, model: job.meta.model }; fresh.push(t); }
      Object.assign(t, clean(it));
      t.pending = pending && !it.audioUrl;
      out.push(t);
    }
    state.tracks.unshift(...fresh);
    saveTracks();
    renderLibrary();
    renderRecent();
    if (state.detailId && out.some((t) => t.id === state.detailId)) renderDetail();
    return out;
  }
  const findTrack = (id) => state.tracks.find((t) => t.id === id);

  function renderJobs() {
    const running = state.jobs.filter((j) => j.status === "running").length;
    $("#jobs-badge").hidden = !running;
    $("#jobs-badge").textContent = running;
    const list = $("#jobs-list");
    if (!state.jobs.length) { list.innerHTML = `<p class="muted empty">Nothing here yet. Tasks you start show up here with live progress.</p>`; return; }
    list.innerHTML = state.jobs.map((j) => {
      const K = KINDS[j.kind] || {};
      const secs = Math.round(((j.finished || Date.now()) - j.created) / 1000);
      return `<div class="job ${j.status}">
        <div class="job-top"><b>${K.icon || "•"} ${esc(K.name || j.kind)}</b><span class="status">${j.status === "running" ? "Working" : j.status === "done" ? "Done" : "Failed"}</span></div>
        <div class="tiny">${esc(j.label)}</div>
        <div class="progress"><i></i></div>
        <div class="tiny muted">${esc(j.status === "failed" ? j.error || "Failed" : j.stage || "")} · ${fmtTime(secs)}</div>
      </div>`;
    }).join("");
  }
  function initJobs() {
    $("#jobs-btn").addEventListener("click", () => { $("#jobs").hidden = !$("#jobs").hidden; renderJobs(); });
    $("[data-close]", $("#jobs")).addEventListener("click", () => ($("#jobs").hidden = true));
    $("#jobs-clear").addEventListener("click", () => { state.jobs = state.jobs.filter((j) => j.status === "running"); saveJobs(); renderJobs(); });
    setInterval(() => { if (!$("#jobs").hidden) renderJobs(); }, 1000);
  }

  /* =========================================================
   * Recent (create sidebar)
   * ======================================================= */
  function trackRow(t) {
    return `<div class="track-row" data-id="${esc(t.id)}">
      ${artHTML(t, "art")}
      <div class="info"><b>${esc(t.title)}</b><span class="muted tiny">${esc(t.pending ? "Streaming preview…" : t.tags)}</span></div>
      <button class="btn primary icon round" data-play="${esc(t.id)}" aria-label="Play" ${t.audioUrl || t.streamUrl ? "" : "disabled"}>▶</button>
      <button class="btn ghost icon" data-open="${esc(t.id)}" aria-label="Details">⋯</button>
    </div>`;
  }
  function renderRecent() {
    const running = state.jobs.filter((j) => j.status === "running" && j.kind === "music");
    const recent = state.tracks.slice(0, 6);
    const el = $("#recent");
    if (!running.length && !recent.length) {
      el.innerHTML = `<p class="muted empty">Your new songs will appear here. Hit <b>Create</b> to start!</p>`;
      return;
    }
    const pendingIds = new Set(state.tracks.filter((t) => t.pending).map((t) => t.taskId));
    el.innerHTML = running.filter((j) => !pendingIds.has(j.id)).map((j) => `
      <div class="track-row"><div class="art pending"></div>
        <div class="info"><b>${esc(j.label)}</b><span class="muted tiny">${esc(j.stage || "Composing…")}</span></div></div>`).join("") + recent.map(trackRow).join("");
  }

  /* =========================================================
   * Player
   * ======================================================= */
  const audio = $("#audio");
  function queue() { return filteredTracks().filter((t) => t.audioUrl || t.streamUrl); }
  function playTrack(id) {
    const t = findTrack(id);
    if (!t) return;
    const src = t.audioUrl || t.streamUrl;
    if (!src) { toast("This song is still being composed…", "warn"); return; }
    if (state.current === id && audio.src) { audio.paused ? audio.play() : audio.pause(); return; }
    state.current = id;
    audio.src = src;
    audio.play().catch(() => {});
    $("#player").hidden = false;
    $("#p-title").textContent = t.title;
    $("#p-tags").textContent = t.tags;
    $("#p-art").src = t.imageUrl || "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: t.title, artist: "Tunesmith", artwork: t.imageUrl ? [{ src: t.imageUrl, sizes: "512x512" }] : [] });
      navigator.mediaSession.setActionHandler("nexttrack", () => step(1));
      navigator.mediaSession.setActionHandler("previoustrack", () => step(-1));
    }
    markPlaying();
  }
  function step(dir) {
    const q = queue();
    if (!q.length) return;
    const i = q.findIndex((t) => t.id === state.current);
    playTrack(q[(i + dir + q.length) % q.length].id);
  }
  function markPlaying() {
    const playing = !audio.paused;
    $("#p-play").textContent = playing ? "❚❚" : "▶";
    $("#p-play").setAttribute("aria-label", playing ? "Pause" : "Play");
    $("#p-eq").classList.toggle("on", playing);
    $$("[data-play]").forEach((b) => {
      const on = b.dataset.play === state.current && playing;
      b.textContent = on ? "❚❚" : "▶";
      b.closest(".tcard")?.classList.toggle("playing", on);
    });
  }
  function initPlayer() {
    $("#p-play").addEventListener("click", () => (audio.paused ? audio.play() : audio.pause()));
    $("#p-prev").addEventListener("click", () => step(-1));
    $("#p-next").addEventListener("click", () => step(1));
    $("#p-open").addEventListener("click", () => state.current && openDetail(state.current));
    audio.addEventListener("play", markPlaying);
    audio.addEventListener("pause", markPlaying);
    audio.addEventListener("ended", () => step(1));
    audio.addEventListener("error", () => {
      if (!state.current) return;
      const t = findTrack(state.current);
      if (t && t.streamUrl && audio.src !== t.streamUrl) { audio.src = t.streamUrl; audio.play().catch(() => {}); }
      else toast("Couldn't load this audio — Suno keeps files for 14 days.", "warn");
    });
    audio.addEventListener("loadedmetadata", () => ($("#p-dur").textContent = fmtTime(audio.duration)));
    audio.addEventListener("timeupdate", () => {
      $("#p-cur").textContent = fmtTime(audio.currentTime);
      if (isFinite(audio.duration)) $("#p-seek").value = (audio.currentTime / audio.duration) * 100;
    });
    $("#p-seek").addEventListener("input", (e) => { if (isFinite(audio.duration)) audio.currentTime = (e.target.value / 100) * audio.duration; });
    document.addEventListener("click", (e) => {
      if (e.target.closest("[data-fav]")) return;
      const p = e.target.closest("[data-play]");
      if (p) { e.stopPropagation(); playTrack(p.dataset.play); return; }
      const o = e.target.closest("[data-open]");
      if (o) openDetail(o.dataset.open);
    });
    document.addEventListener("keydown", (e) => {
      if (e.code === "Space" && !e.target.closest("input, textarea, select, button, [contenteditable]") && state.current) { e.preventDefault(); audio.paused ? audio.play() : audio.pause(); }
    });
  }

  /* =========================================================
   * Library
   * ======================================================= */
  function filteredTracks() {
    const q = state.libSearch.toLowerCase();
    return state.tracks.filter((t) => (state.libFilter !== "fav" || t.fav) && (!q || `${t.title} ${t.tags} ${t.prompt}`.toLowerCase().includes(q)));
  }
  function renderLibrary() {
    $("#lib-count").textContent = state.tracks.length;
    const list = filteredTracks();
    const el = $("#library");
    if (!list.length) {
      el.innerHTML = `<div class="card empty" style="grid-column:1/-1">
        <p style="font-size:2rem;margin:0">🎧</p>
        <p><b>${state.tracks.length ? "No songs match." : "Your library is empty."}</b></p>
        <p class="muted">${state.tracks.length ? "Try a different search." : "Create your first song and it'll land here."}</p>
        ${state.tracks.length ? "" : `<button class="btn primary" data-goto="create">🎤 Create a song</button>`}
      </div>`;
    } else {
      el.innerHTML = list.map((t) => `
        <article class="tcard${state.current === t.id && !audio.paused ? " playing" : ""}">
          <div class="cover" data-open="${esc(t.id)}">
            ${artHTML(t)}
            <button class="fav${t.fav ? " on" : ""}" data-fav="${esc(t.id)}" aria-label="Favourite">★</button>
            ${t.duration ? `<span class="dur">${fmtTime(t.duration)}</span>` : ""}
            <button class="play-fab" data-play="${esc(t.id)}" aria-label="Play ${esc(t.title)}" ${t.audioUrl || t.streamUrl ? "" : "disabled"}>▶</button>
          </div>
          <div class="body">
            <b title="${esc(t.title)}">${esc(t.title)}</b>
            <span class="tags">${esc(t.pending ? "Composing — streaming preview available" : t.tags || "—")}</span>
            <div class="meta">
              ${t.model ? `<span class="mini-tag">${esc(modelName(t.model))}</span>` : ""}
              ${t.op && t.op !== "generate" ? `<span class="mini-tag">${esc(t.op)}</span>` : ""}
              ${t.extras?.stems ? `<span class="mini-tag">stems</span>` : ""}
              ${t.extras?.video ? `<span class="mini-tag">video</span>` : ""}
            </div>
          </div>
        </article>`).join("");
    }
    markPlaying();
  }
  function renderPersonas() {
    const el = $("#personas");
    el.innerHTML = state.personas.length
      ? state.personas.map((p) => `<span class="persona" title="${esc(p.description || "")}">🧑‍🎤 <b>${esc(p.name)}</b>
          <button class="btn ghost sm" data-use-persona="${esc(p.id)}">Use</button>
          <button class="btn ghost sm" data-copy="${esc(p.id)}" title="Copy ID">⧉</button>
          <button class="btn ghost sm danger" data-del-persona="${esc(p.id)}" aria-label="Delete">✕</button></span>`).join("")
      : `<p class="muted tiny">No personas yet — open a song and choose <b>Make persona</b>.</p>`;
    renderPersonaSelect();
  }
  function initLibrary() {
    $("#lib-search").addEventListener("input", (e) => { state.libSearch = e.target.value; renderLibrary(); });
    segGroup($("#lib-filter"), (f) => { state.libFilter = f; renderLibrary(); });
    document.addEventListener("click", (e) => {
      const f = e.target.closest("[data-fav]");
      if (f) {
        e.stopPropagation();
        const t = findTrack(f.dataset.fav);
        if (t) { t.fav = !t.fav; saveTracks(); renderLibrary(); if (state.detailId === t.id) renderDetail(); }
        return;
      }
      const g = e.target.closest("[data-goto]");
      if (g) { closeModal(); switchTab(g.dataset.goto); return; }
      const c = e.target.closest("[data-copy]");
      if (c) { navigator.clipboard?.writeText(c.dataset.copy).then(() => toast("📋 Copied!", "ok", 1800)); return; }
      const u = e.target.closest("[data-use-persona]");
      if (u) {
        setMode("custom");
        $("#c-persona").value = u.dataset.usePersona;
        $("#c-persona").dispatchEvent(new Event("change"));
        $("#advanced").open = true;
        switchTab("create");
        toast("🧑‍🎤 Persona selected in Custom mode.", "ok");
        return;
      }
      const d = e.target.closest("[data-del-persona]");
      if (d && confirm("Remove this persona from your list?")) { state.personas = state.personas.filter((p) => p.id !== d.dataset.delPersona); savePersonas(); renderPersonas(); }
    });
    $("#import-task").addEventListener("click", async () => {
      const v = await formModal("Import songs", "Paste a music task ID (e.g. from a previous session or another app) to pull its songs into your library.", [
        { k: "taskId", type: "text", label: "Task ID", required: true },
      ], "Import");
      if (!v) return;
      try {
        const d = await api.get("api/v1/generate/record-info", { taskId: v.taskId });
        const items = (d?.response?.sunoData || []).map(normTrack).filter((t) => t.id);
        if (!items.length) throw new ApiError(0, "No finished songs found for that task yet.");
        upsertTracks(items, { id: v.taskId, meta: { op: d.operationType || "generate" } }, false);
        toast(`⇣ Imported ${items.length} song${items.length > 1 ? "s" : ""}.`, "ok");
      } catch (e) { errToast(e); }
    });
    renderLibrary();
    renderPersonas();
  }

  /* =========================================================
   * Modal helpers
   * ======================================================= */
  let modalOnClose = null;
  function openModal(html, cls = "") {
    const card = $("#modal-card");
    card.className = "modal-card " + cls;
    card.style.cssText = "";
    card.onclick = null;
    card.innerHTML = html;
    $("#modal").hidden = false;
    document.body.style.overflow = "hidden";
    return card;
  }
  function closeModal() {
    if ($("#modal").hidden) return;
    $("#modal").hidden = true;
    document.body.style.overflow = "";
    state.detailId = null;
    stopKaraoke();
    const cb = modalOnClose; modalOnClose = null; cb?.();
  }
  function initModal() {
    $("#modal").addEventListener("click", (e) => { if (e.target.closest("[data-close]")) closeModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (!$("#modal").hidden) closeModal();
      else if (!$("#jobs").hidden) $("#jobs").hidden = true;
    });
  }

  /* ---------- Generic field builder (Studio + form modals) ---------- */
  function fieldHTML(f) {
    const req = f.required ? ` <span class="muted">*</span>` : "";
    const max = f.max ? ` maxlength="${f.max}"` : "";
    const cls = f.full ? " full" : "";
    const hint = f.hint ? `<span class="tiny muted">${f.hint}</span>` : "";
    const counter = f.max ? `<span class="counter" data-count-for="f-${f.k}"></span>` : "";
    switch (f.type) {
      case "text": case "number":
        return `<label class="field${cls}"><div class="label-row"><span class="label">${f.label}${req}</span>${counter}</div>
          <input id="f-${f.k}" data-k="${f.k}" type="${f.type}" ${f.min != null ? `min="${f.min}"` : ""} ${f.maxN != null ? `max="${f.maxN}"` : ""} ${f.step ? `step="${f.step}"` : ""}${max} placeholder="${esc(f.ph || "")}" value="${esc(f.value ?? "")}" />${hint}</label>`;
      case "textarea":
        return `<div class="field${cls}"><div class="label-row"><span class="label">${f.label}${req}</span>${counter}</div>
          ${f.tags ? `<div class="toolbar" data-tags-for="f-${f.k}">${LYRIC_TAGS.map((t) => `<button type="button" data-t="${t}">${t}</button>`).join("")}</div>` : ""}
          <textarea id="f-${f.k}" data-k="${f.k}" rows="${f.rows || 3}"${max} class="${f.mono ? "mono" : ""}" placeholder="${esc(f.ph || "")}">${esc(f.value ?? "")}</textarea>
          ${f.chips ? `<div class="chips" data-chips-for="f-${f.k}"></div>` : ""}${hint}</div>`;
      case "select":
        return `<label class="field${cls}"><span class="label">${f.label}${req}</span>
          <select data-k="${f.k}">${f.options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}" ${String(v) === String(f.value ?? "") ? "selected" : ""}>${esc(l)}</option>`; }).join("")}</select>${hint}</label>`;
      case "model":
        return fieldHTML({ ...f, type: "select", label: f.label || "Model", value: f.value || state.model, options: MODELS.map((m) => [m.id, m.name + (m.legacy ? " (legacy)" : "")]) });
      case "toggle":
        return `<label class="switch-row${cls}"><span><b>${f.label}</b>${f.hint ? `<br><span class="muted tiny">${f.hint}</span>` : ""}</span><input type="checkbox" class="switch" data-k="${f.k}" ${f.value ? "checked" : ""} /></label>`;
      case "track": {
        const opts = state.tracks.filter((t) => t.audioUrl && (!f.needTask || t.taskId));
        return `<label class="field${cls}"><span class="label">${f.label || "Song from your library"}${req}</span>
          <select data-k="${f.k}" data-track>${opts.length ? `<option value="">Choose a song…</option>` : `<option value="">No finished songs yet — create one first</option>`}
          ${opts.map((t) => `<option value="${esc(t.id)}" ${t.id === f.value ? "selected" : ""}>${esc(t.title)} ${t.duration ? "· " + fmtTime(t.duration) : ""}</option>`).join("")}</select>${hint}</label>`;
      }
      case "source": {
        const opts = state.tracks.filter((t) => t.audioUrl);
        return `<div class="field source${cls}" data-source="${f.k}"><span class="label">${f.label}${req}</span>
          <div class="row"><input type="url" data-k="${f.k}" placeholder="Paste an audio URL…" value="${esc(f.value || "")}" />
          <label class="btn soft" title="Upload audio">⬆ Upload<input type="file" accept="audio/*" hidden /></label></div>
          ${opts.length ? `<select data-lib><option value="">…or pick from your library</option>${opts.map((t) => `<option value="${esc(t.audioUrl)}">${esc(t.title)}</option>`).join("")}</select>` : ""}
          ${hint}</div>`;
      }
      case "advanced":
        return `<details class="fold full"><summary>🎛️ Advanced controls</summary><div class="form-grid pad-top">
          ${f.neg !== false ? fieldHTML({ k: "negativeTags", type: "text", label: "Exclude styles", max: 1000, ph: "e.g. heavy metal, autotune", required: f.negRequired }) : ""}
          ${fieldHTML({ k: "vocalGender", type: "select", label: "Vocal gender", options: [["", "Any"], ["f", "Female"], ["m", "Male"]] })}
          ${fieldHTML({ k: "variety", type: "select", label: "Variety", value: "1", options: VARIETY_DESC.map((d, i) => [String(i), `${i} · ${d}`]) })}
          ${f.duration ? fieldHTML({ k: "duration", type: "number", label: "Duration (seconds)", min: 10, maxN: 360, ph: "Auto (V6 / V5.5 only)" }) : ""}
          <div class="sliders full">${SLIDERS.map(([k, l, lo, hi]) => sliderHTML(k, l, lo, hi)).join("")}</div>
          ${f.persona !== false ? fieldHTML({ k: "personaId", type: "select", label: "Persona", options: [["", "None"], ...state.personas.map((p) => [p.id, p.name])] }) + fieldHTML({ k: "personaModel", type: "select", label: "Persona type", options: [["style_persona", "Style persona"], ["voice_persona", "Voice persona"]] }) : ""}
        </div></details>`;
      case "note":
        return `<p class="tiny muted full">${f.text}</p>`;
    }
    return "";
  }
  function bindFields(root) {
    $$("[id^=f-]", root).forEach((el) => bindCounter(el, root));
    $$("[data-tags-for]", root).forEach((tb) => tb.addEventListener("click", (e) => {
      const b = e.target.closest("[data-t]");
      if (b) insertAtCursor($("#" + tb.dataset.tagsFor, root), b.dataset.t);
    }));
    $$("[data-chips-for]", root).forEach((c) => tagChips(c, [...GENRES, ...MOODS], $("#" + c.dataset.chipsFor, root)));
    const getters = {};
    $$("[data-slider]", root).forEach((el) => (getters[el.dataset.slider] = bindSlider(el)));
    $$("[data-source]", root).forEach((src) => {
      const input = $("input[type=url]", src);
      $("select[data-lib]", src)?.addEventListener("change", (e) => { if (e.target.value) input.value = e.target.value; });
      $("input[type=file]", src).addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const lbl = $("label", src);
        busy(lbl, true);
        try { input.value = await uploadFile(file); toast("📎 Uploaded " + esc(file.name), "ok"); }
        catch (err) { errToast(err); }
        finally { busy(lbl, false); }
      });
    });
    return () => {
      const v = {};
      $$("[data-k]", root).forEach((el) => {
        const k = el.dataset.k;
        if (el.type === "checkbox") v[k] = el.checked;
        else if (el.type === "number") v[k] = el.value === "" ? undefined : Number(el.value);
        else v[k] = el.value.trim();
      });
      for (const [k, g] of Object.entries(getters)) v[k] = g();
      if (v.variety !== undefined && v.variety !== "") v.variety = Number(v.variety);
      return v;
    };
  }
  function validate(root, specs, v) {
    const walk = (list) => list.flatMap((f) => (f.type === "advanced" ? [{ k: "negativeTags", label: "Exclude styles", required: f.negRequired }] : [f]));
    for (const f of walk(specs)) {
      if (f.required && (v[f.k] === undefined || v[f.k] === "")) {
        toast(`Please fill in <b>${esc(f.label || f.k)}</b>.`, "warn");
        const el = $(`[data-k="${f.k}"]`, root);
        if (el) { el.closest("details")?.setAttribute("open", ""); el.focus(); }
        return false;
      }
    }
    return true;
  }
  function formModal(title, intro, specs, submit = "Go") {
    state.detailId = null;
    stopKaraoke();
    return new Promise((resolve) => {
      const card = openModal(`<form class="stack" novalidate>
        <div class="label-row"><h3 style="margin:0">${title}</h3><button type="button" class="btn ghost icon" data-close aria-label="Close">✕</button></div>
        ${intro ? `<p class="muted tiny" style="margin:0">${intro}</p>` : ""}
        <div class="form-grid">${specs.map((f) => fieldHTML({ ...f, full: f.full ?? true })).join("")}</div>
        <button class="btn primary" type="submit">${submit}</button></form>`, "sm");
      const read = bindFields(card);
      let done = false;
      modalOnClose = () => { if (!done) resolve(null); };
      $("form", card).addEventListener("submit", (e) => {
        e.preventDefault();
        const v = read();
        if (!validate(card, specs, v)) return;
        done = true;
        closeModal();
        resolve(v);
      });
      setTimeout(() => $("input, textarea, select", card)?.focus(), 30);
    });
  }

  /* =========================================================
   * STUDIO
   * ======================================================= */
  const MODEL_SPEC = { k: "model", type: "model" };
  const TOOLS = [
    {
      id: "extend", emoji: "➕", name: "Extend a song", desc: "Keep a song going from any point — new verse, new ending.",
      fields: (ctx) => [
        { k: "audioId", type: "track", required: true, label: "Song to extend", value: ctx.trackId, needTask: true },
        { k: "continueAt", type: "number", label: "Continue from (seconds)", min: 1, step: 1, value: ctx.continueAt, hint: "Leave empty to continue from the end." },
        MODEL_SPEC,
        { k: "instrumental", type: "toggle", label: "Instrumental", hint: "No vocals in the extension." },
        { k: "title", type: "text", label: "Title", max: 100 },
        { k: "style", type: "textarea", label: "Style", max: 1000, rows: 2, chips: true, full: true },
        { k: "lyrics", type: "textarea", label: "Lyrics for the new part", max: 5000, rows: 6, mono: true, tags: true, full: true },
        { type: "advanced" },
      ],
      build(v) {
        const t = findTrack(v.audioId);
        let continueAt = v.continueAt;
        if (continueAt == null && t?.duration) continueAt = Math.max(1, Math.floor(t.duration - 1));
        if (t?.duration && continueAt >= t.duration) throw new ApiError(0, `“Continue from” must be less than the song length (${fmtTime(t.duration)}).`);
        return { path: "api/v1/generate/extend", op: "extend", label: `Extend: ${t?.title || ""}`, body: { ...common(v), audioId: v.audioId, taskId: t?.taskId, continueAt } };
      },
    },
    {
      id: "cover", emoji: "🔁", name: "Cover / restyle", desc: "Upload any song and hear it reimagined in a new style — same melody.",
      fields: (ctx) => [
        { k: "uploadUrl", type: "source", label: "Source audio", required: true, value: ctx.url, full: true },
        MODEL_SPEC,
        { k: "instrumental", type: "toggle", label: "Instrumental" },
        { k: "title", type: "text", label: "Title", max: 80 },
        { k: "style", type: "textarea", label: "New style", max: 1000, rows: 2, chips: true, full: true, ph: "e.g. acoustic folk, warm female vocals" },
        { k: "lyrics", type: "textarea", label: "Lyrics (optional — replace the words)", max: 5000, rows: 5, mono: true, tags: true, full: true },
        { type: "advanced", duration: true },
      ],
      build(v) { return { path: "api/v1/generate/upload-cover", op: "cover", label: `Cover: ${v.title || v.style || "remix"}`, body: { ...common(v), uploadUrl: v.uploadUrl, duration: v.duration } }; },
    },
    {
      id: "upload-extend", emoji: "⏩", name: "Extend an upload", desc: "Continue your own recording while keeping its style.",
      fields: () => [
        { k: "uploadUrl", type: "source", label: "Source audio", required: true, full: true },
        { k: "continueAt", type: "number", label: "Continue from (seconds)", min: 1, step: 1, hint: "Must be shorter than the upload." },
        MODEL_SPEC,
        { k: "instrumental", type: "toggle", label: "Instrumental" },
        { k: "title", type: "text", label: "Title", max: 100 },
        { k: "style", type: "textarea", label: "Style", max: 1000, rows: 2, chips: true, full: true },
        { k: "lyrics", type: "textarea", label: "Lyrics for the new part", max: 5000, rows: 5, mono: true, tags: true, full: true },
        { type: "advanced" },
      ],
      build(v) { return { path: "api/v1/generate/upload-extend", op: "extend", label: `Extend upload: ${v.title || "track"}`, body: { ...common(v), uploadUrl: v.uploadUrl, continueAt: v.continueAt } }; },
    },
    {
      id: "add-instrumental", emoji: "🎸", name: "Add instrumental", desc: "Got vocals or a melody? Get a full backing track built around it.",
      fields: () => [
        { k: "uploadUrl", type: "source", label: "Vocal / melody audio", required: true, full: true },
        MODEL_SPEC,
        { k: "title", type: "text", label: "Title", required: true, max: 80 },
        { k: "tags", type: "textarea", label: "Instrumental style", required: true, max: 1000, rows: 2, chips: true, full: true, ph: "e.g. acoustic guitar, soft piano, warm pads" },
        { k: "lyrics", type: "textarea", label: "Lyrics (optional)", max: 5000, rows: 4, mono: true, full: true },
        { type: "advanced", negRequired: true, persona: false },
      ],
      build(v) { return { path: "api/v1/generate/add-instrumental", op: "add-instrumental", label: `Backing: ${v.title}`, body: { ...common(v, false), uploadUrl: v.uploadUrl, tags: v.tags } }; },
    },
    {
      id: "add-vocals", emoji: "🎙️", name: "Add vocals", desc: "Layer AI vocals on top of your instrumental or beat.",
      fields: () => [
        { k: "uploadUrl", type: "source", label: "Instrumental audio", required: true, full: true },
        MODEL_SPEC,
        { k: "title", type: "text", label: "Title", required: true, max: 80 },
        { k: "style", type: "textarea", label: "Vocal & music style", required: true, max: 1000, rows: 2, chips: true, full: true, ph: "e.g. soulful female R&B vocals" },
        { k: "lyrics", type: "textarea", label: "Lyrics", max: 5000, rows: 6, mono: true, tags: true, full: true },
        { type: "advanced", negRequired: true, persona: false },
      ],
      build(v) { return { path: "api/v1/generate/add-vocals", op: "add-vocals", label: `Vocals: ${v.title}`, body: { ...common(v, false), uploadUrl: v.uploadUrl } }; },
    },
    {
      id: "mashup", emoji: "🌀", name: "Mashup", desc: "Blend two tracks into something brand new.",
      fields: () => [
        { k: "url1", type: "source", label: "Track A", required: true, full: true },
        { k: "url2", type: "source", label: "Track B", required: true, full: true },
        MODEL_SPEC,
        { k: "title", type: "text", label: "Title", max: 80 },
        { k: "style", type: "textarea", label: "Style", max: 1000, rows: 2, chips: true, full: true },
        { k: "lyrics", type: "textarea", label: "Lyrics (optional)", max: 5000, rows: 4, mono: true, tags: true, full: true },
        { type: "advanced", neg: false, duration: true },
      ],
      build(v) { return { path: "api/v1/generate/mashup", op: "mashup", label: `Mashup: ${v.title || "A × B"}`, body: { ...common(v), uploadUrlList: [v.url1, v.url2], duration: v.duration } }; },
    },
    {
      id: "replace", emoji: "✂️", name: "Replace a section", desc: "Rewrite 10+ seconds of a song — fix a line, change a chorus.",
      fields: (ctx) => {
        const t = ctx.trackId && findTrack(ctx.trackId);
        return [
          { k: "audioId", type: "track", required: true, label: "Song", value: ctx.trackId, needTask: true },
          { k: "title", type: "text", label: "Title", required: true, max: 80, value: t?.title },
          { k: "infillStartS", type: "number", label: "Start (seconds)", required: true, min: 0, step: 0.01 },
          { k: "infillEndS", type: "number", label: "End (seconds)", required: true, min: 0, step: 0.01, hint: "At least 10 seconds after the start." },
          { k: "tags", type: "textarea", label: "Style", required: true, max: 1000, rows: 2, full: true, value: t?.tags },
          { k: "prompt", type: "textarea", label: "New lyrics for this section", required: true, rows: 4, mono: true, full: true },
          { k: "fullLyrics", type: "textarea", label: "Full song lyrics after the change", required: true, rows: 8, mono: true, full: true, value: t?.prompt, hint: "The complete lyrics, with your new section in place." },
          { type: "advanced", persona: true },
        ];
      },
      build(v) {
        const t = findTrack(v.audioId);
        if (!(v.infillEndS - v.infillStartS >= 10)) throw new ApiError(0, "The section must be at least 10 seconds long.");
        if (t?.duration && v.infillEndS > t.duration) throw new ApiError(0, `End must be within the song (${fmtTime(t.duration)}).`);
        const c = common(v);
        delete c.model;
        delete c.instrumental;
        return { path: "api/v1/generate/replace-section", op: "replace", label: `Replace: ${v.title}`, body: { ...c, taskId: t?.taskId, audioId: v.audioId, title: v.title, tags: v.tags, prompt: v.prompt, fullLyrics: v.fullLyrics, infillStartS: v.infillStartS, infillEndS: v.infillEndS } };
      },
    },
    {
      id: "sounds", emoji: "🔊", name: "Sound & loop maker", desc: "Make loops, one-shots and sound effects with tempo & key.",
      fields: () => [
        { k: "prompt", type: "textarea", label: "Describe the sound", required: true, max: 500, rows: 3, full: true, ph: "e.g. dusty boom-bap drum loop with vinyl crackle" },
        MODEL_SPEC,
        { k: "soundKey", type: "select", label: "Key", options: SOUND_KEYS, value: "Any" },
        { k: "soundTempo", type: "number", label: "Tempo (BPM)", min: 1, maxN: 300, ph: "Auto" },
        { k: "soundLoop", type: "toggle", label: "Seamless loop", hint: "Make it loop cleanly." },
        { k: "grabLyrics", type: "toggle", label: "Capture lyric subtitles" },
      ],
      build(v) {
        return { path: "api/v1/generate/sounds", op: "sound", label: `Sound: ${v.prompt}`, body: clean({ prompt: v.prompt, model: v.model, soundKey: v.soundKey, soundTempo: v.soundTempo, soundLoop: v.soundLoop, grabLyrics: v.grabLyrics }) };
      },
    },
  ];
  function common(v, withPersona = true) {
    const inst = !!v.instrumental;
    return clean({
      model: v.model,
      instrumental: v.instrumental,
      title: v.title,
      style: v.style,
      lyrics: inst ? undefined : v.lyrics,
      negativeTags: v.negativeTags,
      vocalGender: inst ? undefined : v.vocalGender,
      styleWeight: v.styleWeight,
      weirdnessConstraint: v.weirdnessConstraint,
      audioWeight: inst ? undefined : v.audioWeight,
      variety: v.variety,
      personaId: withPersona ? v.personaId : undefined,
      personaModel: withPersona && v.personaId && PERSONA_MODEL_MODELS.includes(v.model || "V6") ? v.personaModel : undefined,
    });
  }
  function initStudio() {
    $("#tools").innerHTML = TOOLS.map((t) => `<button type="button" class="tool" data-tool="${t.id}" aria-pressed="false">
      <div class="emoji">${t.emoji}</div><b>${t.name}</b><span>${t.desc}</span></button>`).join("");
    $("#tools").addEventListener("click", (e) => {
      const b = e.target.closest("[data-tool]");
      if (b) openTool(b.dataset.tool);
    });
  }
  function openTool(id, ctx = {}) {
    const tool = TOOLS.find((t) => t.id === id);
    state.tool = id;
    $$("#tools [data-tool]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tool === id)));
    const specs = tool.fields(ctx);
    const form = $("#tool-form");
    form.hidden = false;
    form.innerHTML = `<div class="label-row"><h3 style="margin:0">${tool.emoji} ${tool.name}</h3><button type="button" class="btn ghost sm" data-cancel>Close</button></div>
      <p class="muted tiny" style="margin:0">${tool.desc}</p>
      <div class="form-grid">${specs.map(fieldHTML).join("")}</div>
      <button class="btn primary lg" type="submit">${tool.emoji} ${tool.name}</button>`;
    const read = bindFields(form);
    $("[data-cancel]", form).addEventListener("click", () => { form.hidden = true; $$("#tools [data-tool]").forEach((b) => b.setAttribute("aria-pressed", "false")); });
    form.onsubmit = async (e) => {
      e.preventDefault();
      const v = read();
      if (!validate(form, specs, v)) return;
      const btn = $("button[type=submit]", form);
      busy(btn, true);
      try {
        const req = tool.build(v);
        const d = await api.post(req.path, req.body);
        startJob("music", d.taskId, req.label, { op: req.op, model: req.body.model });
        toast(`${tool.emoji} Started! Watch progress in Activity ⏳ — results land in your Library.`, "ok");
        refreshCredits();
      } catch (err) { errToast(err); }
      finally { busy(btn, false); }
    };
    switchTab("studio");
    setTimeout(() => form.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  /* =========================================================
   * LYRICS LAB
   * ======================================================= */
  function lyricCard(l, i) {
    return `<div class="card lyric-card">
      <div class="label-row"><h3 style="margin:0">${esc(l.title || `Option ${i + 1}`)}</h3></div>
      <pre>${esc(l.text)}</pre>
      <div class="actions">
        <button class="btn primary sm" data-use-lyrics="${i}">🎤 Use in Create</button>
        <button class="btn soft sm" data-copy-lyrics="${i}">📋 Copy</button>
      </div></div>`;
  }
  let lastLyrics = [];
  function useLyrics(l) {
    setMode("custom");
    if (l.title && !$("#c-title").value) setVal($("#c-title"), l.title.slice(0, 80));
    setVal($("#c-lyrics"), l.text.slice(0, Number($("#c-lyrics").maxLength) || 5000));
    $("#instrumental").checked = false;
    $("#instrumental").dispatchEvent(new Event("change"));
    switchTab("create");
    toast("🎤 Lyrics loaded into Custom mode — pick a style and create!", "ok");
  }
  async function runLyrics(prompt) {
    const d = await api.post("api/v1/lyrics", { prompt });
    const r = await startJob("lyrics", d.taskId, prompt, {});
    return r.items || [];
  }
  function initLyrics() {
    const input = $("#l-prompt");
    $("#l-chips").innerHTML = LYRIC_THEMES.map((t) => `<button type="button" class="chip" data-v="${esc(t)}">${esc(t)}</button>`).join("");
    $("#l-chips").addEventListener("click", (e) => {
      const b = e.target.closest(".chip");
      if (b) setVal(input, (input.value.trim() ? input.value.trim() + ", " : "A song about ") + b.dataset.v.toLowerCase());
    });
    $("#lyrics-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const prompt = input.value.trim();
      if (!prompt) { toast("Tell me what the song is about ✍️", "warn"); input.focus(); return; }
      const btn = $("#lyrics-btn");
      busy(btn, true);
      $("#lyrics-results").innerHTML = [0, 1].map(() => `<div class="card"><div class="art pending" style="height:220px;border-radius:12px"></div></div>`).join("");
      try {
        lastLyrics = await runLyrics(prompt);
        $("#lyrics-results").innerHTML = lastLyrics.length ? lastLyrics.map(lyricCard).join("") : `<p class="muted">No lyrics came back — try a different idea.</p>`;
      } catch (err) { errToast(err); $("#lyrics-results").innerHTML = ""; }
      finally { busy(btn, false); }
    });
    $("#lyrics-results").addEventListener("click", (e) => {
      const u = e.target.closest("[data-use-lyrics]");
      if (u) useLyrics(lastLyrics[u.dataset.useLyrics]);
      const c = e.target.closest("[data-copy-lyrics]");
      if (c) navigator.clipboard?.writeText(lastLyrics[c.dataset.copyLyrics].text).then(() => toast("📋 Lyrics copied!", "ok", 1800));
    });
  }
  async function lyricsModal() {
    const seed = [$("#c-title").value.trim(), $("#c-style").value.trim()].filter(Boolean).join(" — ");
    const v = await formModal("✍️ Write lyrics with AI", "Describe the theme, mood and story. You'll get two options to choose from.", [
      { k: "prompt", type: "textarea", label: "What's it about?", required: true, max: 200, rows: 3, value: seed.slice(0, 200), ph: "A bittersweet goodbye at a train station, hopeful ending" },
    ], "Write lyrics");
    if (!v) return;
    const card = openModal(`<div class="stack"><div class="label-row"><h3 style="margin:0">✍️ Writing…</h3><button class="btn ghost icon" data-close aria-label="Close">✕</button></div>
      <div class="art pending" style="height:180px;border-radius:12px"></div><p class="muted tiny center">${esc(WAIT_LINES[4])}</p></div>`, "sm");
    try {
      const items = await runLyrics(v.prompt);
      if ($("#modal").hidden || !card.isConnected) return;
      lastLyrics = items;
      openModal(`<div class="stack"><div class="label-row"><h3 style="margin:0">Pick your lyrics</h3><button class="btn ghost icon" data-close aria-label="Close">✕</button></div>
        ${items.map((l, i) => `<div class="lyric-card"><b>${esc(l.title || "Option " + (i + 1))}</b><pre>${esc(l.text)}</pre><button class="btn primary sm" data-pick="${i}">Use these</button></div>`).join("") || "<p>No lyrics came back.</p>"}</div>`, "");
      $("#modal-card").style.padding = "1.4rem";
      $("#modal-card").onclick = (e) => {
        const p = e.target.closest("[data-pick]");
        if (p) { useLyrics(items[p.dataset.pick]); closeModal(); }
      };
    } catch (err) { closeModal(); errToast(err); }
  }

  /* =========================================================
   * TRACK DETAIL
   * ======================================================= */
  function openDetail(id) {
    if (!findTrack(id)) return;
    state.detailId = id;
    renderDetail();
  }
  function renderDetail() {
    const t = findTrack(state.detailId);
    if (!t) return closeModal();
    t.extras ||= {};
    const x = t.extras;
    const ready = !!t.audioUrl;
    const canTask = ready && t.taskId;
    const wasOpen = !$("#modal").hidden && $("#modal-card .detail-head");
    const scroll = wasOpen ? $("#modal-card").scrollTop : 0;
    const card = openModal(`
      <button class="btn ghost icon detail-close" data-close aria-label="Close">✕</button>
      <div class="detail-head">
        ${artHTML(t)}
        <div class="stack" style="gap:.6rem">
          <div>
            <h2>${esc(t.title)}</h2>
            <p class="muted" style="margin:0">${esc(t.tags || "")}</p>
          </div>
          <div class="row gap-sm wrap">
            ${t.model ? `<span class="mini-tag">${esc(modelName(t.model))}</span>` : ""}
            ${t.duration ? `<span class="mini-tag">${fmtTime(t.duration)}</span>` : ""}
            ${t.op && t.op !== "generate" ? `<span class="mini-tag">${esc(t.op)}</span>` : ""}
            ${t.pending ? `<span class="mini-tag">still composing</span>` : ""}
          </div>
          <div class="actions">
            <button class="btn primary" data-play="${esc(t.id)}" ${ready || t.streamUrl ? "" : "disabled"}>▶ Play</button>
            <button class="btn soft" data-act="mp3" ${ready ? "" : "disabled"}>⬇ MP3</button>
            <button class="btn soft" data-fav="${esc(t.id)}">${t.fav ? "★ Favourited" : "☆ Favourite"}</button>
            <button class="btn soft" data-act="share" ${ready ? "" : "disabled"}>🔗 Share link</button>
          </div>
        </div>
      </div>
      <div class="detail-body">
        <div>
          <p class="section-title">Create more</p>
          <div class="actions">
            <button class="btn soft sm" data-act="extend" ${canTask ? "" : "disabled"}>➕ Extend</button>
            <button class="btn soft sm" data-act="cover" ${ready ? "" : "disabled"}>🔁 Cover / restyle</button>
            <button class="btn soft sm" data-act="replace" ${canTask ? "" : "disabled"}>✂️ Replace section</button>
            <button class="btn soft sm" data-act="reuse">♻️ Reuse settings</button>
            <button class="btn soft sm" data-act="persona" ${canTask ? "" : "disabled"}>🧑‍🎤 Make persona</button>
          </div>
        </div>
        <div>
          <p class="section-title">Pro tools</p>
          <div class="actions">
            <button class="btn soft sm" data-act="wav" ${canTask ? "" : "disabled"}>🎚️ Get WAV</button>
            <button class="btn soft sm" data-act="vocals" ${canTask ? "" : "disabled"}>🎤 Split vocals</button>
            <button class="btn soft sm" data-act="stems" ${canTask ? "" : "disabled"}>🥁 All stems</button>
            <button class="btn soft sm" data-act="stem1" ${canTask ? "" : "disabled"}>🎯 One instrument</button>
            <button class="btn soft sm" data-act="midi" ${x.stems ? "" : "disabled"} title="${x.stems ? "" : "Split stems first"}">🎹 MIDI</button>
            <button class="btn soft sm" data-act="video" ${canTask ? "" : "disabled"}>🎬 Music video</button>
            <button class="btn soft sm" data-act="art" ${canTask ? "" : "disabled"}>🖼️ New cover art</button>
          </div>
        </div>
        ${extrasHTML(t)}
        <div>
          <div class="label-row"><p class="section-title">Lyrics</p>
            <div class="row gap-sm">${t.prompt ? `<button class="btn ghost sm" data-act="copy-lyrics">📋 Copy</button>` : ""}
            <button class="btn ghost sm" data-act="karaoke" ${canTask ? "" : "disabled"}>🎤 Sing-along</button></div></div>
          <div class="lyrics-view" id="lyrics-view">${t.prompt ? esc(t.prompt) : `<span class="muted">${t.op === "sound" ? "No lyrics for this sound." : "Instrumental — no lyrics."}</span>`}</div>
        </div>
        <details class="fold"><summary>ℹ️ Details & IDs</summary>
          <dl class="kv pad-top"><dt>Audio ID</dt><dd>${esc(t.id)}</dd><dt>Task ID</dt><dd>${esc(t.taskId || "—")}</dd>
          <dt>Created</dt><dd>${new Date(t.created).toLocaleString()}</dd>${t.audioUrl ? `<dt>Audio</dt><dd>${esc(t.audioUrl)}</dd>` : ""}</dl>
          <p class="tiny muted">Suno keeps generated files for 14 days — download anything you want to keep.</p>
        </details>
        <div class="row" style="justify-content:flex-end"><button class="btn ghost sm danger" data-act="delete">🗑 Remove from library</button></div>
      </div>`);
    card.scrollTop = scroll;
    card.onclick = (e) => {
      const b = e.target.closest("[data-act]");
      if (b) detailAction(t, b.dataset.act, b);
    };
  }
  function extrasHTML(t) {
    const x = t.extras;
    const running = state.jobs.filter((j) => j.status === "running" && j.meta.trackId === t.id);
    const parts = [];
    running.forEach((j) => parts.push(`<div class="extra"><span>${KINDS[j.kind].icon} ${esc(KINDS[j.kind].name)} — ${esc(j.stage || "working…")}</span><div class="progress" style="width:120px"><i></i></div></div>`));
    if (x.wav) parts.push(`<div class="extra"><span>🎚️ <b>WAV</b> (lossless)</span><button class="btn soft sm" data-act="dl" data-url="${esc(x.wav)}" data-name="${esc(safeFile(t.title))}.wav">⬇ Download</button></div>`);
    if (x.stems?.items?.length) parts.push(`<div class="extra" style="flex-direction:column;align-items:stretch"><b>🥁 Stems</b><div class="stems">${x.stems.items.map((s) => `
      <div class="extra"><span>${esc(s.name)}</span><audio controls preload="none" src="${esc(s.url)}"></audio>
      <button class="btn ghost sm" data-act="dl" data-url="${esc(s.url)}" data-name="${esc(safeFile(t.title + "-" + s.name))}.mp3">⬇</button></div>`).join("")}</div></div>`);
    if (x.midi) parts.push(`<div class="extra"><span>🎹 <b>MIDI</b> · ${x.midi.instruments.map((i) => `${esc(i.name)} (${i.count})`).join(", ") || "no notes detected"}</span><button class="btn soft sm" data-act="midi-dl">⬇ .mid</button></div>`);
    if (x.video) parts.push(`<div class="extra" style="flex-direction:column;align-items:stretch"><b>🎬 Music video</b><video controls preload="none" src="${esc(x.video)}"></video>
      <div><button class="btn soft sm" data-act="dl" data-url="${esc(x.video)}" data-name="${esc(safeFile(t.title))}.mp4">⬇ Download MP4</button></div></div>`);
    if (x.covers?.length) parts.push(`<div class="extra" style="flex-direction:column;align-items:stretch"><b>🖼️ Cover art — click one to use it</b><div class="cover-choices">${x.covers.map((u) => `<img src="${esc(u)}" alt="Cover option" data-act="use-cover" data-url="${esc(u)}" />`).join("")}</div></div>`);
    return parts.length ? `<div><p class="section-title">Your extras</p><div class="extras">${parts.join("")}</div></div>` : "";
  }

  async function detailAction(t, act, btn) {
    const run = async (kind, path, body, label, meta = {}) => {
      busy(btn, true);
      try {
        const d = await api.post(path, body);
        const p = startJob(kind, d.taskId, `${label} · ${t.title}`, { trackId: t.id, ...meta });
        p.catch(() => {});
        toast(`${KINDS[kind].icon} ${esc(KINDS[kind].name)} started — this usually takes under a minute.`, "ok");
        renderDetail();
      } catch (e) { errToast(e); busy(btn, false); }
    };
    switch (act) {
      case "mp3": return download(t.audioUrl, safeFile(t.title) + ".mp3", btn);
      case "dl": return download(btn.dataset.url, btn.dataset.name, btn);
      case "share": return navigator.clipboard?.writeText(t.audioUrl).then(() => toast("🔗 Audio link copied — valid for ~14 days.", "ok"));
      case "copy-lyrics": return navigator.clipboard?.writeText(t.prompt).then(() => toast("📋 Lyrics copied!", "ok", 1800));
      case "extend": closeModal(); return openTool("extend", { trackId: t.id });
      case "cover": closeModal(); return openTool("cover", { url: t.audioUrl });
      case "replace": closeModal(); return openTool("replace", { trackId: t.id });
      case "reuse":
        closeModal();
        setMode("custom");
        setVal($("#c-title"), (t.title || "").slice(0, 80));
        setVal($("#c-style"), (t.tags || "").slice(0, Number($("#c-style").maxLength) || 1000));
        setVal($("#c-lyrics"), t.prompt || "");
        $("#instrumental").checked = !t.prompt;
        $("#instrumental").dispatchEvent(new Event("change"));
        switchTab("create");
        return toast("♻️ Settings loaded into Custom mode — tweak and create!", "ok");
      case "wav": return run("wav", "api/v1/wav/generate", { taskId: t.taskId, audioId: t.id }, "WAV");
      case "vocals": return run("stems", "api/v1/vocal-removal/generate", { taskId: t.taskId, audioId: t.id, type: "separate_vocal" }, "Vocals split", { type: "separate_vocal" });
      case "stems": return run("stems", "api/v1/vocal-removal/generate", { taskId: t.taskId, audioId: t.id, type: "split_stem" }, "All stems", { type: "split_stem" });
      case "stem1": {
        const v = await formModal("🎯 Isolate one instrument", "Pull a single instrument or vocal out of the mix.", [
          { k: "stemName", type: "select", label: "Instrument", options: STEM_NAMES },
        ], "Isolate");
        if (!v) return openDetail(t.id);
        openDetail(t.id);
        return run("stems", "api/v1/vocal-removal/generate", { taskId: t.taskId, audioId: t.id, type: "split_stem_advanced", stemName: v.stemName }, v.stemName, { type: "split_stem_advanced" });
      }
      case "midi": return run("midi", "api/v1/midi/generate", { taskId: t.extras.stems.taskId }, "MIDI");
      case "midi-dl": {
        busy(btn, true);
        try {
          const d = await api.get("api/v1/midi/record-info", { taskId: t.extras.midi.taskId });
          const bytes = buildMidi(d?.midiData?.instruments || []);
          saveBlob(new Blob([bytes], { type: "audio/midi" }), safeFile(t.title) + ".mid");
        } catch (e) { errToast(e); }
        finally { busy(btn, false); }
        return;
      }
      case "video": {
        const v = await formModal("🎬 Make a music video", "Creates an MP4 with animated visuals for this song.", [
          { k: "author", type: "text", label: "Artist name (optional)", max: 50 },
          { k: "domainName", type: "text", label: "Watermark / website (optional)", max: 50 },
        ], "Create video");
        openDetail(t.id);
        if (!v) return;
        return run("mp4", "api/v1/mp4/generate", clean({ taskId: t.taskId, audioId: t.id, author: v.author, domainName: v.domainName }), "Video");
      }
      case "art": return run("art", "api/v1/suno/cover/generate", { taskId: t.taskId }, "Cover art");
      case "use-cover": t.imageUrl = btn.dataset.url; saveTracks(); renderLibrary(); renderDetail(); if (state.current === t.id) $("#p-art").src = t.imageUrl; return toast("🖼️ Cover updated!", "ok", 2000);
      case "persona": {
        const v = await formModal("🧑‍🎤 Make a persona", "Capture this song's voice & vibe so you can reuse it in new songs.", [
          { k: "name", type: "text", label: "Persona name", required: true, max: 60, value: t.title },
          { k: "description", type: "textarea", label: "Describe the voice & style", required: true, rows: 3, max: 500, value: t.tags },
          { k: "style", type: "text", label: "Style label (optional)", value: (t.tags || "").split(",")[0] },
          { k: "vocalStart", type: "number", label: "Analyse from (s)", min: 0, step: 0.1, value: 0, full: false },
          { k: "vocalEnd", type: "number", label: "Analyse to (s)", min: 1, step: 0.1, value: Math.min(30, Math.floor(t.duration || 30)), full: false },
        ], "Create persona");
        openDetail(t.id);
        if (!v) return;
        if (v.vocalEnd != null && v.vocalStart != null && v.vocalEnd <= v.vocalStart) return toast("“Analyse to” must be after “Analyse from”.", "warn");
        busy(btn, true);
        try {
          const d = await api.req("suno", "api/v1/generate/generate-persona", { method: "POST", body: clean({ taskId: t.taskId, audioId: t.id, name: v.name, description: v.description, style: v.style, vocalStart: v.vocalStart, vocalEnd: v.vocalEnd }) });
          if (!d?.personaId) throw new ApiError(0, "No persona ID came back.");
          state.personas.unshift({ id: d.personaId, name: d.name || v.name, description: d.description || v.description, model: "style_persona", from: t.id });
          savePersonas();
          renderPersonas();
          toast(`🧑‍🎤 Persona <b>${esc(v.name)}</b> created! Find it in Custom → Advanced.`, "ok", 6000);
          refreshCredits();
        } catch (e) { errToast(e); }
        finally { busy(btn, false); }
        return;
      }
      case "karaoke": return karaoke(t, btn);
      case "delete":
        if (!confirm(`Remove “${t.title}” from your library?`)) return;
        state.tracks = state.tracks.filter((x) => x.id !== t.id);
        saveTracks();
        if (state.current === t.id) { audio.pause(); $("#player").hidden = true; state.current = null; }
        closeModal();
        renderLibrary();
        renderRecent();
        return toast("🗑 Removed.", "", 2000);
    }
  }

  async function download(url, name, btn) {
    if (!url) return;
    busy(btn, true);
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error();
      saveBlob(await r.blob(), name);
    } catch {
      window.open(url, "_blank", "noopener");
    } finally { busy(btn, false); }
  }
  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  /* ---------- Karaoke (timestamped lyrics) ---------- */
  let karaokeRaf = 0;
  function stopKaraoke() { cancelAnimationFrame(karaokeRaf); karaokeRaf = 0; }
  async function karaoke(t, btn) {
    busy(btn, true);
    try {
      const d = await api.req("suno", "api/v1/generate/get-timestamped-lyrics", { method: "POST", body: { taskId: t.taskId, audioId: t.id } });
      const words = (d?.alignedWords || []).filter((w) => w.word);
      if (!words.length) throw new ApiError(0, "No timed lyrics available for this song (instrumentals have none).");
      const view = $("#lyrics-view");
      view.classList.add("karaoke");
      view.innerHTML = words.map((w, i) => `<span class="w" data-i="${i}">${esc(w.word)}</span>`).join("");
      const spans = $$(".w", view);
      view.onclick = (e) => {
        const s = e.target.closest(".w");
        if (s && state.current === t.id) audio.currentTime = words[s.dataset.i].startS;
      };
      if (state.current !== t.id || audio.paused) playTrack(t.id);
      let last = -1;
      const tick = () => {
        if (state.detailId !== t.id) return stopKaraoke();
        if (state.current === t.id) {
          const ct = audio.currentTime;
          let idx = -1;
          for (let i = 0; i < words.length; i++) { if (words[i].startS <= ct) idx = i; else break; }
          if (idx !== last) {
            spans.forEach((s, i) => { s.classList.toggle("past", i < idx); s.classList.toggle("now", i === idx); });
            spans[idx]?.scrollIntoView({ block: "center", behavior: "smooth" });
            last = idx;
          }
        }
        karaokeRaf = requestAnimationFrame(tick);
      };
      stopKaraoke();
      tick();
      toast("🎤 Sing along! Tap any word to jump there.", "ok", 3000);
    } catch (e) { errToast(e); }
    finally { busy(btn, false); }
  }

  /* ---------- MIDI file writer ---------- */
  function vlq(n) {
    n = Math.max(0, Math.round(n));
    const out = [n & 0x7f];
    while ((n >>= 7)) out.unshift((n & 0x7f) | 0x80);
    return out;
  }
  function buildMidi(instruments) {
    const PPQ = 480, TPS = PPQ * 2; // 120 bpm → 2 beats per second
    const chunk = (type, data) => [...type].map((c) => c.charCodeAt(0)).concat([(data.length >>> 24) & 255, (data.length >>> 16) & 255, (data.length >>> 8) & 255, data.length & 255], data);
    const tracks = [[0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20, 0x00, 0xff, 0x2f, 0x00]];
    let melodic = 0;
    instruments.forEach((ins) => {
      const drum = /drum|kick|snare|hat|perc|cymbal|clap|tom/i.test(ins.name || "");
      let ch = 9;
      if (!drum) { ch = melodic % 15; if (ch >= 9) ch++; melodic++; }
      const ev = [];
      for (const n of ins.notes || []) {
        const on = n.start * TPS, off = Math.max(on + 1, n.end * TPS);
        const vel = Math.max(1, Math.min(127, Math.round(n.velocity <= 1 ? n.velocity * 127 : n.velocity)));
        const p = Math.max(0, Math.min(127, n.pitch | 0));
        ev.push([Math.round(on), 0x90 | ch, p, vel], [Math.round(off), 0x80 | ch, p, 0]);
      }
      ev.sort((a, b) => a[0] - b[0] || (a[1] & 0xf0) - (b[1] & 0xf0));
      const name = [...new TextEncoder().encode(ins.name || "Track")];
      const data = [0x00, 0xff, 0x03, ...vlq(name.length), ...name];
      let last = 0;
      for (const e of ev) { data.push(...vlq(e[0] - last), e[1], e[2], e[3]); last = e[0]; }
      data.push(0x00, 0xff, 0x2f, 0x00);
      tracks.push(data);
    });
    const header = chunk("MThd", [0, 1, (tracks.length >> 8) & 255, tracks.length & 255, (PPQ >> 8) & 255, PPQ & 255]);
    return new Uint8Array(header.concat(...tracks.map((t) => chunk("MTrk", t))));
  }

  /* =========================================================
   * Boot
   * ======================================================= */
  function init() {
    initTheme();
    initGate();
    initTabs();
    initCreate();
    initStudio();
    initLyrics();
    initLibrary();
    initPlayer();
    initJobs();
    initModal();
    renderRecent();
    renderJobs();
    $("#credits").addEventListener("click", () => refreshCredits(false).then(() => toast(`💳 ${esc($("#credits-val").textContent)} credits available.`, "", 2500)));
    setInterval(() => { if (state.jobs.some((j) => j.status === "running")) renderRecent(); }, 4000);

    state.key = loadKey();
    if (!state.key) return showGate();
    showApp();
    resumeJobs();
    refreshCredits();
  }
  init();
})();
