// Policy tool template: renders content.js into the panel and data/layers.js onto the map.
// No analysis happens here; numbers and layers come from the team's own work.
(function () {
  "use strict";
  // Two sides in one app: ?mode=residents shows content.residents.js and only "audience": "public"
  // layers; ?mode=policy the policy side (content.js, all layers). No mode = start screen to choose.
  // The separate public edition (tools/build_public.py) has one audience only: no roles there.
  const ROLES = Boolean(window.TOOL_RESIDENTS) && window.TOOL_AUDIENCE !== "public";
  const asked = new URLSearchParams(location.search).get("mode");
  const MODE = ROLES && asked === "residents" ? "residents" : "policy";
  const T = (MODE === "residents" ? window.TOOL_RESIDENTS : window.TOOL) || {};
  const LAYERS = (window.TOOL_LAYERS || []).filter((l) => MODE === "policy" || l.audience === "public");
  // Residents: buildings in the 1-in-500-year flood per 250 m square (teammate's v3 analysis, data/impact_map.js).
  // Aggregates only: a square with fewer than 5 buildings shows no count and no depth, so no home can be picked out.
  if (MODE === "residents" && window.TOOL_IMPACT_MAP) {
    const depth = ["fewer than 5 buildings", "≤ 0.5 m", "0.5–1.5 m", "1.5–3 m", "> 3 m"];
    const colors = ["#bdbdbd", "#9ecae1", "#4292c6", "#2171b5", "#08306b"];
    LAYERS.push({
      id: "squares_rp500", name: "Buildings in the 1-in-500-year flood, per 250 m square", type: "geojson",
      visible: false, weight: 0.5, fillOpacity: 0.6,
      style: { by: "Usual water depth (model)", classes: depth.map((d, i) => ({ value: d, color: colors[i] })) },
      data: { type: "FeatureCollection", features: window.TOOL_IMPACT_MAP.residents.map(([s, w, n, e, count, d]) => ({
        type: "Feature",
        properties: { Buildings: count ? `about ${count}` : "fewer than 5", "Usual water depth (model)": depth[count ? d : 0],
          Note: "Modelled extreme flood, not a forecast. Follow BE-Alert and your municipality." },
        geometry: { type: "Polygon", coordinates: [[[w, s], [e, s], [e, n], [w, n], [w, s]]] },
      })) },
    });
  }
  const $ = (id) => document.getElementById(id);
  if (!ROLES) document.querySelector("nav.mode").hidden = true;
  $("mode-label").textContent = MODE === "residents" ? "🏠 Resident" : "🏛️ Policy maker";
  if (ROLES && asked !== "residents" && asked !== "policy") $("start").hidden = false;

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }

  // Scroll inside the bottom sheet only: scrollIntoView also scrolls the page and pushes the header away.
  function showInSheet(node) {
    // The nearest ancestor that scrolls: the sheet body on phones, the side panel on laptops
    let body = node.parentElement;
    while (body && !(body.scrollHeight > body.clientHeight && /auto|scroll/.test(getComputedStyle(body).overflowY))) {
      body = body.parentElement;
    }
    if (!body) return;
    const top = body.scrollTop + node.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
    body.scrollTo({ top, behavior: "smooth" });
  }

  function textOr(node, value, placeholder) {
    node.textContent = value || placeholder;
    node.classList.toggle("placeholder", !value);
  }

  // ---- Panel content ----
  textOr($("title"), T.title, "Policy tool title");
  textOr($("subtitle"), T.subtitle, "One sentence: what this shows and for whom");
  if (T.title) document.title = T.title;

  // Key numbers: the team's own values in content.js win; while those are empty, the policy side shows the three
  // computed from the team's analysis (data/impact.js, work/analysis/build_impact.py).
  const IMPACT = window.TOOL_IMPACT;
  const NUMBERS = (T.numbers || []).some((n) => n.value) || MODE !== "policy" || !IMPACT ? (T.numbers || []) : IMPACT.numbers;
  // Computed numbers: value + a short label per card; the scope, the check and the sources once (not per card)
  const COMPUTED = Boolean(IMPACT) && NUMBERS === IMPACT.numbers;
  const SHORT = ["buildings in the 1-in-100-year flood zone", "people living in them",
    "of them with no dry walking route to a shelter"];
  NUMBERS.forEach((n, i) => {
    const box = el("div", "number");
    const v = el("div", "value");
    // A range breaks after its dash, never inside a number; long values a size smaller
    textOr(v, n.value && n.value.replace("–", "–\u200b"), "—");
    if (n.value && n.value.length > 8) v.classList.add("long");
    const l = el("div", "label");
    textOr(l, COMPUTED ? SHORT[i] || n.label : n.label, "Key number " + (i + 1));
    if (COMPUTED) {
      box.append(v, l);
      $("numbers").append(box);
      return;
    }
    const s = el("div", "source");
    textOr(s, n.source, "source needed");
    box.append(v, l, s);
    // How the number was verified (responsible-AI criterion). Placeholder only in the internal edition.
    if (n.check || (window.TOOL_AUDIENCE !== "public" && MODE === "policy")) {
      const c = el("div", "check");
      textOr(c, n.check && "Checked: " + n.check, "how was it checked?");
      box.append(c);
    }
    $("numbers").append(box);
  });
  if (COMPUTED) {
    // One sentence of sources: the longest one already contains the others (the third adds the walking routes)
    const srcs = [...new Set(NUMBERS.map((n) => n.source).filter(Boolean))];
    const all = srcs.find((x) => srcs.every((y) => x.includes(y)));
    $("numbers-src-text").textContent = all || srcs.join("; ");
    ["numbers-scope", "numbers-check", "numbers-src"].forEach((id) => { $(id).hidden = false; });
  }

  // Optional small label under the title (e.g. "Draft" while testing); none when empty.
  // Version label at the very end of the panel (the header keeps only the buttons people need)
  if (T.badge) document.querySelector(".sheet-body").append(el("p", "edition-foot", "walert " + T.badge));
  if (T.title) document.title = `${T.title} · walert`;

  // The team's recommendation (named actor, action, why): policy side only, above Priority issues; none when null.
  const REC = T.recommendation;
  if (MODE === "policy" && REC && REC.actor) {
    $("rec-actor").textContent = REC.actor;
    $("rec-action").textContent = REC.action || "";
    $("rec-why").textContent = REC.why || "";
    $("rec").hidden = false;
  }
  if (NUMBERS.length === 0) $("numbers").closest("section").hidden = true;

  const limits = T.limits || [];
  if (limits.length === 0) {
    const li = el("li", "placeholder", "What the data cannot show");
    $("limits").append(li);
  }
  limits.forEach((t) => $("limits").append(el("li", null, t)));

  const sources = T.sources || [];
  if (sources.length === 0) $("sources").append(el("li", "placeholder", "Every number and layer needs a source"));
  sources.forEach((s) => {
    const li = el("li");
    if (s.url) {
      const a = el("a", null, s.text || s.url);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener";
      li.append(a);
    } else {
      li.textContent = s.text;
    }
    $("sources").append(li);
  });

  // ---- Residents side: official advice, links and a labelled demo alert ----
  function toast(text) {
    const t = $("toast");
    t.textContent = text;
    t.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { t.hidden = true; }, 6000);
  }

  // Android app: native notification through the bridge in MainActivity. Browser: Notification API,
  // else an in-page message.
  function notify(title, text) {
    if (window.AndroidBridge) return window.AndroidBridge.notify(title, text);
    if ("Notification" in window) {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification(title, { body: text });
        else toast(title + ": " + text);
      });
      return;
    }
    toast(title + ": " + text);
  }

  const R = T.residents;
  if (R) {
    $("residents").hidden = false;
    (R.advice || []).forEach((t) => $("advice").append(el("li", null, t)));
    (R.links || []).forEach((s) => {
      const a = el("a", null, s.text);
      a.href = s.url;
      a.target = "_blank";
      a.rel = "noopener";
      const li = el("li");
      li.append(a);
      $("res-links").append(li);
    });
    if (R.demoAlert) $("demo-alert").addEventListener("click", () => notify(R.demoAlert.title, R.demoAlert.text));
    else $("demo-alert").hidden = true;
  }

  const store = {
    get(k, d) { try { return localStorage.getItem(k) ?? d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: memory only */ } },
  };

  // Read aloud: the phone's own text-to-speech (offline) through the Android bridge, or the browser's.
  // `voice` = a language tag from content.residents.js "languages" (e.g. "fr-BE"); English otherwise.
  function speak(text, voice) {
    const plain = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, "").trim();
    if (!plain) return;
    const bridge = window.AndroidBridge;
    if (bridge && bridge.speakIn && voice) return bridge.speakIn(plain, voice);
    if (bridge && bridge.speak) return bridge.speak(plain);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(plain);
      if (voice) u.lang = voice;
      window.speechSynthesis.speak(u);
    }
  }

  // Language of the video and the "In a flood" card: chosen once on the first open, remembered on this
  // phone, so in a crisis the app opens straight in it. The rest of the app is in English for now.
  const RES = (window.TOOL_RESIDENTS || {}).residents || {};
  const LANGS = RES.languages || [];
  const langOf = () => { const l = store.get("lang", ""); return LANGS.some(([c]) => c === l) ? l : "en"; };
  const voiceOf = (l) => (LANGS.find(([c]) => c === l) || [])[3];

  // "Elderly or disabled" (residents): ONE setting for bigger text, strong contrast, fewer panels, everything
  // read aloud and shelters reachable without stairs. Set under "I live here" on the start screen or on the
  // "In a flood" card; remembered on this phone. The "No stairs" box in the shelter panel follows it.
  const START = ROLES && asked !== "residents" && asked !== "policy";
  // "Closest dry shelter" from the start screen's "No internet" screen: residents side, straight to the shelter
  const WANT_SHELTER = MODE === "residents" && new URLSearchParams(location.search).has("shelter");
  let easy = store.get("easy", "0") === "1";
  function setEasy(on) {
    easy = on;
    store.set("easy", on ? "1" : "0");
    if (MODE === "residents") document.body.classList.toggle("easy", on);
    ["start-easy", "ess-easy"].forEach((id) => { $(id).checked = on; });
    if ($("no-stairs").checked !== on) {
      $("no-stairs").checked = on;
      $("no-stairs").dispatchEvent(new Event("change"));
    }
  }

  // Policy side: quick info before the map, on the first open (then via "? How it works").
  // Its button starts the 4-step story at step 1.
  if (MODE === "policy" && T.intro) {
    $("intro-title").textContent = T.intro.title || "";
    (T.intro.steps || []).forEach((s) => $("intro-steps").append(el("li", null, s)));
    if (T.intro.button) $("intro-close").textContent = T.intro.button;
    $("help-btn").hidden = false;
    $("help-btn").addEventListener("click", () => { $("intro").hidden = false; });
    $("intro-close").addEventListener("click", () => {
      $("intro").hidden = true;
      store.set("introSeen", "1");
      document.dispatchEvent(new Event("story:start"));
    });
    // Not behind the start screen; on the policy side's first open on this device.
    if (asked === "policy" && store.get("introSeen", "0") !== "1") $("intro").hidden = false;
  }

  if (MODE === "residents" && ROLES) {
    setEasy(new URLSearchParams(location.search).get("easy") === "1" || easy);
  }

  // ---- Start screen: language (first open) -> video -> "Who are you?" ----
  // "I live here" opens in place: the "Elderly or disabled" switch, then Continue.
  function showStep(which) {
    $("start-lang").hidden = which !== "lang";
    $("start-who").hidden = which !== "who";
    if (which === "who") whoInLanguage();
  }
  // "Who are you?" in the language chosen on the first screen (content.residents.js card[lang].who)
  function whoInLanguage() {
    const l = langOf();
    const c = (RES.card || {})[l] || (RES.card || {}).en;
    if (!c || !c.who) return;
    $("start-who").lang = l;
    [["h-who", c.who.title], ["who-live", c.who.live], ["who-live-sub", c.who.liveSub], ["start-easy-label", c.easy],
      ["start-easy-sub", c.easySub], ["res-go", c.who.go], ["who-policy", c.who.policy], ["who-policy-sub", c.who.policySub],
      ["watch-text", c.who.watch]].forEach(([id, text]) => { if (text) $(id).textContent = text; });
  }
  if (START) {
    $("res-open").addEventListener("click", () => {
      const open = $("res-more").hidden;
      $("res-more").hidden = !open;
      $("res-open").setAttribute("aria-expanded", String(open));
      $("res-choice").classList.toggle("open", open);
    });
    $("start-easy").checked = easy;
    $("start-easy").addEventListener("change", () => setEasy($("start-easy").checked));
  }

  // ---- Essentials, every time the residents side opens (people forget in a crisis) ----
  // The 18 s animation (motion/, muted, skippable at any moment), then a one-screen card.
  // Reduced motion, no video for the language, or any playback problem -> straight to the card.
  // On the start screen the same video comes first: on the first open on this phone right after the
  // language, then with the "▶ What to do" button; it ends on "Who are you?", not on the card. A resident
  // who picks their side right after watching gets the card without a second play.
  document.documentElement.classList.remove("first-open", "booting");   // early loading screen (index.html)
  const E = START ? RES : R;
  const JUST_WATCHED_MS = 2 * 60 * 1000;
  const textOnly = window.TOOL_VARIANT === "text";   // A/B test: the "text" build goes straight to the card
  if (START && textOnly) $("start-watch").hidden = true;
  if (E && E.card && !(START && textOnly)) {
    const R = E;
    const videos = R.videos || {};
    const video = $("ess-video");
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let lang = langOf();
    function renderCard() {
      const c = R.card[lang] || R.card.en;
      $("ess-card").lang = lang;
      $("ess-title").textContent = c.title;
      $("essentials-list").replaceChildren(...c.lines.map((t) => el("li", null, t)));
      $("essentials-source").textContent = c.source;
      $("ess-read").textContent = c.read;
      $("essentials-close").textContent = c.close;
      $("ess-easy-label").textContent = c.easy;
      $("ess-easy-sub").textContent = c.easySub;
    }
    const cardText = () => [...$("essentials-list").children].map((li) => li.textContent).join(". ");
    function showCard() {
      clearTimeout(stall);
      video.pause();
      $("ess-video-wrap").hidden = true;
      if (START) {
        store.set("startVideoSeen", "1");
        store.set("watchedAt", String(Date.now()));
        $("essentials").hidden = true;
        showStep("who");
        return;
      }
      renderCard();
      $("ess-card").hidden = false;
      if (easy) speak(cardText(), voiceOf(lang));
    }
    $("ess-read").addEventListener("click", () => speak(cardText(), voiceOf(lang)));
    $("ess-easy").addEventListener("change", () => {
      setEasy($("ess-easy").checked);
      if (easy) speak(cardText(), voiceOf(lang));
    });
    if (textOnly) $("lang-row").hidden = true;
    function play(l) {
      lang = l;
      store.set("lang", l);
      [...$("lang-row").children].forEach((b) => b.classList.toggle("active", b.dataset.lang === l));
      $("watch-lang").textContent = "· " + ((LANGS.find(([c]) => c === l) || [])[1] || "EN");
      if (!videos[l] || reduced || textOnly) return showCard();
      $("ess-card").hidden = true;
      $("ess-video-wrap").hidden = false;
      // Invisible until the first frame plays (no loading placeholder); if it never plays, the card instead.
      video.classList.remove("ready");
      clearTimeout(stall);
      stall = setTimeout(() => { if (!video.classList.contains("ready")) showCard(); }, 3000);
      video.src = videos[l];
      // With sound when the person chose it (default on); if the browser refuses sound without a tap
      // (autoplay at launch), muted instead, never an error or a skipped video.
      video.muted = !soundOn;
      showSound();
      video.play().catch(() => {
        if (video.muted) return showCard();
        video.muted = true;
        showSound();
        return video.play().catch(showCard);
      });
    }
    let stall = null;
    let soundOn = store.get("videoSound", "1") === "1";
    function showSound() {
      $("ess-sound").textContent = video.muted ? "🔇" : "🔊";
      $("ess-sound").setAttribute("aria-label", video.muted ? "Sound on" : "Sound off");
      $("ess-sound").setAttribute("aria-pressed", String(video.muted));
    }
    $("ess-sound").addEventListener("click", () => {
      video.muted = !video.muted;
      soundOn = !video.muted;
      store.set("videoSound", soundOn ? "1" : "0");
      showSound();
    });
    video.addEventListener("playing", () => { clearTimeout(stall); video.classList.add("ready"); });
    function openEssentials(l) {
      $("essentials").hidden = false;
      play(videos[l] ? l : langOf());
    }
    LANGS.forEach(([code, short, name]) => {
      const b = el("button", "lang", short);
      b.dataset.lang = code;
      b.lang = code;
      b.setAttribute("aria-label", name);
      if (!videos[code]) { b.disabled = true; b.title = "Coming soon"; }
      b.addEventListener("click", () => play(code));
      $("lang-row").append(b);
      if (START) {
        const big = el("button", "lang-big", name);
        big.lang = code;
        big.addEventListener("click", () => openEssentials(code));
        $("lang-grid").append(big);
      }
    });
    $("watch-lang").textContent = "· " + ((LANGS.find(([c]) => c === lang) || [])[1] || "EN");
    video.addEventListener("ended", showCard);
    video.addEventListener("error", showCard);
    $("ess-skip").addEventListener("click", showCard);
    $("essentials-close").addEventListener("click", () => { video.pause(); $("essentials").hidden = true; });
    if (START) {
      $("start-watch").addEventListener("click", () => openEssentials(lang));
      if (store.get("startVideoSeen", "0") === "1") showStep("who");
      else if (!LANGS.some(([c]) => c === store.get("lang", ""))) showStep("lang");
      else { showStep("who"); openEssentials(lang); }
    } else {
      $("show-essentials").addEventListener("click", () => openEssentials(lang));
      const justWatched = Date.now() - Number(store.get("watchedAt", "0")) < JUST_WATCHED_MS;
      if (justWatched) {
        store.set("watchedAt", "0");   // only the first open right after the start screen skips the video
        $("essentials").hidden = false;
        showCard();
      } else if (!WANT_SHELTER) openEssentials(lang);
    }
  } else {
    $("show-essentials").hidden = true;
    if (START) showStep("who");
  }

  // ---- Demo server: verified messages + water/electricity/gas status (tools/relay_server.py) ----
  // DEMO ONLY: the laptop runs the relay; phones reach it over USB through `adb reverse`.
  const UTIL = [["water", "💧 Water"], ["electricity", "⚡ Electricity"], ["gas", "🔥 Gas"]];
  let onPlace = null;   // policy side: called with the municipality chosen on the map or in the picker
  let relayDown = false;   // residents: the last poll of the demo server failed (see netCheck)
  const muniLayer = (window.TOOL_LAYERS || []).find((l) => l.id === "municipalities");
  const PLACES = [...new Set((muniLayer ? muniLayer.data.features : [])
    .map((f) => (f.properties || {}).Municipality).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  let relay = store.get("relayUrl", "http://localhost:8765");
  $("relay-url").value = relay;
  $("relay-url").addEventListener("change", () => {
    relay = $("relay-url").value.trim().replace(/\/$/, "");
    store.set("relayUrl", relay);
  });

  async function api(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 4000);
    try {
      const opts = body
        ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
        : { cache: "no-store" };
      const res = await fetch(relay + path, { ...opts, signal: ctrl.signal });
      return { ok: res.ok, status: res.status, data: await res.json().catch(() => ({})) };
    } finally {
      clearTimeout(timer);
    }
  }
  function relayState(ok) {
    $("relay-state").textContent = ok ? "Connected to the demo server" : "Demo server not reachable: messaging is off";
    $("relay-state").classList.toggle("off", !ok);
  }
  function fillPlaces(select, value, prompt) {
    if (prompt) select.append(Object.assign(el("option", null, prompt), { value: "" }));
    PLACES.forEach((p) => select.append(Object.assign(el("option", null, p), { value: p })));
    select.value = PLACES.includes(value) ? value : "";
  }
  const when = (t) => new Date(t * 1000).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  let lastPos = null;   // [lat, lon] from the phone, kept in memory only
  if (ROLES && MODE === "residents" && R) {
    $("res-actions").hidden = false;
    $("big3").hidden = false;
    $("inbox").hidden = false;
    $("relay").hidden = false;
    $("goto-big3").addEventListener("click", () => {
      if (sheet.dataset.state === "peek") setState("half");
      showInSheet($("big3"));
    });
    $("goto-inbox").addEventListener("click", () => {
      if (sheet.dataset.state === "peek") setState("half");
      showInSheet($("inbox"));
    });
    const label = R.statusLabels || {};
    fillPlaces($("my-place"), store.get("myPlace", ""), "Choose…");
    let statusAll = {};
    let online = null;   // false after a failed poll: the tiles then say the demo server is offline
    function renderTiles() {
      const s = statusAll[$("my-place").value];
      $("tiles").replaceChildren(...UTIL.map(([k, name]) => {
        const state = s ? s[k] : online === false ? "offline" : "none";
        const tile = el("div", "tile " + state);
        tile.append(el("div", "tile-name", name), el("div", "tile-state", label[state] || state));
        // Who to call for this utility in this municipality (only where checked; see content.residents.js).
        const mine = (R.operatorsByPlace || {})[$("my-place").value] || {};
        const op = (R.operators || {})[mine[k]];
        if (mine[k] === "none") {
          tile.append(el("div", "tile-op-unknown", R.noGas));
        } else if (op) {
          const call = Object.assign(el("a", "tile-call", `📞 ${op.label}: ${op.name} `), { href: "tel:" + op.tel });
          call.append(el("span", "nowrap", op.phone));
          const page = Object.assign(el("a", "tile-link", `${op.name} website ›`), { href: op.url, target: "_blank", rel: "noopener" });
          tile.append(call, page);
          if (k === "water" && mine.split) tile.append(el("div", "tile-op-unknown", R.operatorSplit));
        } else if ($("my-place").value && R.operatorUnknown) {
          tile.append(el("div", "tile-op-unknown", R.operatorUnknown));
        }
        return tile;
      }));
      $("status-note").textContent = s ? `${s.note ? s.note + " · " : ""}Set by the authorities (DEMO), ${when(s.time)}` : "";
    }
    $("my-place").addEventListener("change", () => {
      store.set("myPlace", $("my-place").value);
      $("place-hint").textContent = "";   // a chosen municipality replaces "location not available"
      renderTiles();
    });
    renderTiles();

    // List every message; notify only those not seen before (also across app restarts). On the very first
    // open on a phone, older messages are listed but not notified, so nobody gets a burst of old alerts.
    const firstOpen = store.get("lastMsgId", null) === null;
    let seen = Number(store.get("lastMsgId", "0"));
    let after = 0;
    let pollCount = 0;
    $("inbox-list").append(el("li", "placeholder", "No messages yet."));
    async function poll() {
      try {
        const [m, s] = await Promise.all([api("/api/messages?after=" + after), api("/api/status")]);
        relayState(m.ok && s.ok);
        online = m.ok && s.ok;
        relayDown = !online;
        netCheck();
        if (online && builtInShown) {
          builtInShown = false;
          $("inbox-list").querySelector(".builtin")?.remove();
        }
        (m.data.messages || []).forEach((msg) => {
          if (msg.id <= after) return;   // two polls in flight can return the same message
          $("inbox-list").querySelector(".placeholder")?.remove();
          const li = el("li");
          li.append(el("span", "when", (msg.from ? msg.from + " · " : "") + when(msg.time)), el("span", null, msg.text));
          $("inbox-list").prepend(li);
          after = Math.max(after, msg.id);
          keepAlert(msg);
          if (msg.id > seen && !(firstOpen && !pollCount)) {
            notify((R.messageTitle || "Message") + (msg.from ? ": " + msg.from : ""), msg.text);
            if (easy) speak("Message from " + (msg.from || "the authorities") + ". " + msg.text);
          }
        });
        const count = $("inbox-list").querySelectorAll("li:not(.placeholder)").length;
        $("goto-inbox").textContent = count ? `📨 Messages (${count})` : "📨 Messages";
        seen = Math.max(seen, after);
        store.set("lastMsgId", String(seen));
        pollCount += 1;
        statusAll = s.data.status || {};
        renderTiles();
        const place = $("my-place").value;
        const mine = statusAll[place];
        if (mine && JSON.stringify(mine) !== store.get("seenStatus:" + place, "")) {
          store.set("seenStatus:" + place, JSON.stringify(mine));
          const summary = `${place}: ` + UTIL.map(([k, n]) => `${n.split(" ")[1]} ${label[mine[k]] || mine[k]}`).join(" · ");
          notify(R.statusTitle || R.messageTitle || "Status", summary);
          if (easy) speak(summary.replace(/ · /g, ". "));
        }
      } catch (e) {
        relayState(false);
        relayDown = true;
        netCheck();
        if (online !== false) { online = false; renderTiles(); }
      }
      if (!online) builtIn();
      if (!online && builtInShown) $("relay-state").textContent = "Demo server not reachable: showing the DEMO data built into the app";
    }
    // No demo server (phone on its own): the DEMO scenario built into the app, until the server answers
    let builtInShown = false;
    function builtIn() {
      const D = R.demoBuiltIn;
      if (!D || builtInShown) return;
      builtInShown = true;
      const now = Math.round(Date.now() / 1000);
      statusAll = Object.fromEntries(Object.entries(D.status).map(([place, [water, electricity, gas, note]]) =>
        [place, { water, electricity, gas, note: `${note} · ${D.note}`, time: now }]));
      renderTiles();
      if (D.message && !$("inbox-list").querySelector("li:not(.placeholder)")) {
        $("inbox-list").querySelector(".placeholder")?.remove();
        const li = el("li", "builtin");
        li.append(el("span", "when", `${D.message.from} · ${when(now)}`), el("span", null, D.message.text));
        $("inbox-list").prepend(li);
        $("goto-inbox").textContent = "📨 Messages (1)";
      }
    }

    // GPS: find "my municipality" on the phone itself (point in polygon); the position is never sent.
    // Municipality shapes cover only the part Copernicus mapped, so outside them we fall back to the list.
    function inRing(x, y, ring) {
      let inside = false;
      for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
    function placeAt(lon, lat) {
      for (const f of muniLayer ? muniLayer.data.features : []) {
        const g = f.geometry || {};
        const polys = g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : [];
        if (polys.some((p) => inRing(lon, lat, p[0]) && !p.slice(1).some((h) => inRing(lon, lat, h)))) {
          return (f.properties || {}).Municipality;
        }
      }
      return null;
    }
    if (muniLayer && navigator.geolocation) {
      $("place-hint").textContent = "📍 Finding your municipality…";
      navigator.geolocation.getCurrentPosition((pos) => {
        lastPos = [pos.coords.latitude, pos.coords.longitude];
        const found = placeAt(pos.coords.longitude, pos.coords.latitude);
        if (found) {
          $("my-place").value = found;
          store.set("myPlace", found);
          renderTiles();
          poll();
          $("place-hint").textContent = "📍 Found from your location (it stays on this phone)";
        } else {
          $("place-hint").textContent = "📍 You seem to be outside the area this prototype covers: choose below.";
          offerDemo();
        }
      }, () => {
        $("place-hint").textContent = "Location not available: choose your municipality below.";
        offerDemo();
      }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 });
    }

    poll();
    setInterval(poll, 5000);
  }

  if (ROLES && MODE === "policy") {
    $("send").hidden = false;
    $("relay").hidden = false;
    fillPlaces($("set-place"), "", "Choose a municipality…");
    // Water / electricity / gas: one row per utility, the 3 statuses as segmented buttons (radio inputs)
    UTIL.forEach(([k, name]) => {
      const row = el("fieldset", "seg");
      row.append(el("legend", null, name));
      const opts = el("div", "seg-opts");
      [["ok", "OK to use"], ["restricted", "Restricted"], ["no", "Do not use"]].forEach(([v, t], i) => {
        const lab = el("label", "seg-" + v);
        const input = Object.assign(el("input"), { type: "radio", name: "set-" + k, value: v, checked: i === 0 });
        lab.append(input, el("span", null, t));
        opts.append(lab);
      });
      row.append(opts);
      $("set-row").append(row);
    });
    const utilValue = (k) => (document.querySelector(`input[name="set-${k}"]:checked`) || {}).value || "ok";

    // One verification code for messages, status and the Crisis center. Kept for this session only and
    // checked by the relay, never stored in the app.
    try { $("code").value = sessionStorage.getItem("relayCode") || ""; } catch (e) { /* storage blocked */ }
    const say = (id, text, ok) => {
      $(id).textContent = text;
      $(id).classList.toggle("off", !ok);
    };
    const reason = (r) => (r.status === 403 ? "wrong verification code." : (r.data.error || `refused (${r.status}).`));
    const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    async function checkCode() {
      try { sessionStorage.setItem("relayCode", $("code").value); } catch (e) { /* storage blocked */ }
      if (!$("code").value) return say("code-state", "🔒 Locked: enter the verification code.", false);
      try {
        const r = await api("/api/check", { code: $("code").value });
        relayState(true);
        say("code-state", r.ok ? "🔓 Unlocked: messages, status and the Crisis center." : "✕ Wrong verification code.", r.ok);
      } catch (e) {
        relayState(false);
        say("code-state", "✕ Demo server not reachable: nothing can be sent.", false);
      }
      pollChat();
    }
    $("code").addEventListener("change", checkCode);
    $("code").addEventListener("keydown", (e) => { if (e.key === "Enter") checkCode(); });
    $("code-ok").addEventListener("click", checkCode);

    async function send(path, body, out, okText) {
      try {
        const r = await api(path, { code: $("code").value, ...body });
        relayState(true);
        if (r.ok) say(out, `✓ ${okText} · ${clock()}`, true);
        else say(out, "✕ Not sent: " + reason(r), false);
        return r.ok;
      } catch (e) {
        relayState(false);
        say(out, "✕ Not sent: demo server not reachable.", false);
        return false;
      }
    }

    // The message: "From" follows the chosen municipality until edited; preview = exactly what residents get
    // (the notification title and text the residents side shows, see its poll()).
    const RES = (window.TOOL_RESIDENTS || {}).residents || {};
    let fromEdited = false;
    $("msg-from").addEventListener("input", () => { fromEdited = !!$("msg-from").value; preview(); });
    onPlace = (name) => {
      if (!fromEdited && name) $("msg-from").value = `Municipality of ${name}`;
      if (name && !$("set-place").value) $("set-place").value = name;
      preview();
    };
    // SMS length hint only (nothing is sent by SMS): GSM-7 = 160 characters per SMS, 153 when split; ^{}\[~]|€
    // count double. Any other character (ê, ç, emoji…) switches the whole message to UCS-2: 70, then 67.
    const GSM7 = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
    const GSM7_EXT = "^{}\\[~]|€\f";
    function smsParts(text) {
      let n = 0;
      for (const ch of text) {
        if (GSM7.includes(ch)) n += 1;
        else if (GSM7_EXT.includes(ch)) n += 2;
        else return { parts: text.length <= 70 ? 1 : Math.ceil(text.length / 67), single: 70 };
      }
      return { parts: n <= 160 ? 1 : Math.ceil(n / 153), single: 160 };
    }
    function preview() {
      const from = $("msg-from").value.trim();
      const text = $("msg").value;
      $("msg-count").textContent = `${text.length} / 280`;
      $("msg-count").classList.toggle("near", text.length > 250);
      const n = smsParts(text);
      $("msg-sms").textContent = n.parts <= 1 ? `fits 1 SMS (${n.single})` : `${n.parts} SMS`;
      $("pv-title").textContent = (RES.messageTitle || "Message") + (from ? ": " + from : "");
      $("pv-text").textContent = text.trim() ? text : "…";
      $("msg-preview").classList.toggle("empty", !text.trim());
    }
    $("msg").addEventListener("input", preview);
    preview();
    const confirmBox = (on) => {
      $("send-confirm").hidden = !on;
      $("send-msg").hidden = on;
    };
    $("send-msg").addEventListener("click", () => {
      if (!$("msg").value.trim()) return say("msg-result", "✕ Write the message first.", false);
      if (!$("msg-from").value.trim()) return say("msg-result", "✕ Fill in \"From\": the authority residents know.", false);
      say("msg-result", "", true);
      // The relay sends every message to every resident phone (no per-municipality list in this demo)
      $("confirm-q").textContent = `Send to all residents? From "${$("msg-from").value.trim()}". Every resident phone on walert gets it (DEMO).`;
      confirmBox(true);
      $("confirm-yes").focus();
    });
    $("confirm-no").addEventListener("click", () => { confirmBox(false); say("msg-result", "Not sent (cancelled).", false); });
    $("confirm-yes").addEventListener("click", async () => {
      $("confirm-yes").disabled = true;
      say("msg-result", "Sending…", true);
      const ok = await send("/api/messages", { from: $("msg-from").value.trim(), text: $("msg").value }, "msg-result",
        "Sent to all residents (DEMO)");
      $("confirm-yes").disabled = false;
      confirmBox(false);
      if (ok) { $("msg").value = ""; preview(); }
    });
    $("send-status").addEventListener("click", () => {
      if (!$("set-place").value) return say("send-result", "✕ Choose a municipality first.", false);
      send("/api/status", {
        municipality: $("set-place").value, note: $("set-note").value,
        ...Object.fromEntries(UTIL.map(([k]) => [k, utilValue(k)])),
      }, "send-result", `Status updated for ${$("set-place").value} (DEMO)`);
    });
    api("/api/messages?after=999999999").then((r) => relayState(r.ok)).catch(() => relayState(false));

    // Crisis center between policy makers (mayors, province, crisis centre). Private: reading needs the code.
    // Senders are roles/places, never personal names.
    $("chat").hidden = false;
    const from = $("chat-from");
    [...PLACES.map((p) => `Mayor of ${p} (demo)`), "Province of Liège (demo)", "Crisis centre (demo)"]
      .forEach((s) => from.append(Object.assign(el("option", null, s), { value: s })));
    from.value = store.get("chatFrom", from.value);
    from.addEventListener("change", () => store.set("chatFrom", from.value));
    const chatResult = (text, ok) => say("chat-result", text, ok);
    let chatAfter = 0;
    let chatLoaded = false;
    let unread = 0;
    function showUnread() {
      $("chat-unread").hidden = !unread;
      $("chat-unread").textContent = `${unread} new`;
    }
    $("chat-fold").addEventListener("toggle", () => {
      if ($("chat-fold").open) { unread = 0; showUnread(); $("chat-list").scrollTop = $("chat-list").scrollHeight; }
    });
    function chatEmpty() {
      if (!$("chat-list").querySelector("li:not(.placeholder)") && !$("chat-list").querySelector(".placeholder")) {
        $("chat-list").append(el("li", "placeholder", "No messages yet."));
      }
    }
    async function pollChat() {
      if (!$("code").value) {
        $("chat-state").textContent = "🔒 Locked: enter the verification code in Inform residents";
        return chatResult("🔒 Locked: enter the verification code in \"Inform residents\" above.", false);
      }
      try {
        const r = await api("/api/chat/list", { code: $("code").value, after: chatAfter });
        if (r.status === 403) {
          $("chat-state").textContent = "✕ Wrong verification code";
          return chatResult("✕ Wrong verification code: the Crisis center stays closed.", false);
        }
        relayState(true);
        chatResult("", true);
        $("chat-state").textContent = "🔓 Open to you";
        (r.data.chat || []).forEach((m) => {
          if (m.id <= chatAfter) return;   // two polls in flight can return the same message
          $("chat-list").querySelector(".placeholder")?.remove();
          const li = el("li", m.from === from.value ? "mine" : null);
          li.append(el("span", "when", `${m.from} · ${when(m.time)}`), el("span", null, m.text));
          $("chat-list").append(li);
          $("chat-list").scrollTop = $("chat-list").scrollHeight;   // the list only: scrollIntoView pushes the page
          if (chatLoaded && m.from !== from.value) {
            notify("Crisis center: " + m.from, m.text);
            if (!$("chat-fold").open) unread += 1;
          }
          chatAfter = Math.max(chatAfter, m.id);
        });
        chatEmpty();
        showUnread();
        chatLoaded = true;
      } catch (e) {
        relayState(false);
        $("chat-state").textContent = "✕ Demo server not reachable";
        chatResult("✕ Demo server not reachable: the Crisis center is offline.", false);
      }
    }
    let chatSending = false;
    async function sendChat() {
      const text = $("chat-text").value;
      if (!text.trim() || chatSending) return;
      chatSending = true;
      try {
        const r = await api("/api/chat", { code: $("code").value, from: from.value, text });
        if (!r.ok) return chatResult("✕ Not sent: " + reason(r), false);
        $("chat-text").value = "";
        chatResult(`✓ Sent · ${clock()}`, true);
        pollChat();
      } catch (e) {
        chatResult("✕ Not sent: demo server not reachable.", false);
      } finally {
        chatSending = false;
      }
    }
    $("chat-btn").addEventListener("click", sendChat);
    $("chat-text").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.isComposing) { e.preventDefault(); sendChat(); }
    });
    if ($("code").value) checkCode();
    else { say("code-state", "🔒 Locked: enter the verification code.", false); pollChat(); }
    setInterval(pollChat, 4000);
  }

  // ---- Map ----
  const mapCfg = T.map || {};
  // Canvas keeps thousands of points fast; map keyboard panning is off in story mode,
  // where the arrow keys step through the story instead.
  const map = L.map("map", {
    zoomControl: true, attributionControl: true, preferCanvas: true,
    keyboard: !(T.story && T.story.length),
  })
    .setView(mapCfg.center || [50.6, 4.6], mapCfg.zoom || 7);

  // Map moves land in the part of the map you can see: on phones the panel and the briefing card cover its lower
  // part (on a laptop the panel sits beside the map, so only the briefing card counts).
  function hiddenBottom() {
    const m = map.getContainer().getBoundingClientRect();
    let top = m.bottom;
    for (const id of ["sheet", "story"]) {
      const r = $(id).hidden ? null : $(id).getBoundingClientRect();
      if (r && r.height && r.left < m.right && r.right > m.left && r.top < top) top = r.top;
    }
    return Math.max(0, Math.min(m.bottom - top, m.height - 80));   // full panel: still fit into the strip above it
  }
  // The part of the map you can see, as map bounds.
  function visibleBounds() {
    const size = map.getSize();
    return L.latLngBounds(map.containerPointToLatLng([0, 0]), map.containerPointToLatLng([size.x, size.y - hiddenBottom()]));
  }
  // While the panel slides (0.28 s) its final height is unknown: a move asked for then, or just before, is (re)done
  // once it has settled (setState below).
  let panelMoving = false;
  let lastMove = null;
  function moveVisible(redo) {
    lastMove = { redo, at: Date.now() };
    if (!panelMoving) redo();
  }
  function fitVisible(bounds, { padding = [0, 0], maxZoom } = {}) {
    moveVisible(() => map.fitBounds(bounds, {
      maxZoom, paddingTopLeft: padding, paddingBottomRight: [padding[0], padding[1] + hiddenBottom()],
    }));
  }
  function viewVisible(center, zoom = map.getZoom(), fly = false) {
    moveVisible(() => {
      const c = map.unproject(map.project(center, zoom).add([0, hiddenBottom() / 2]), zoom);
      if (fly) map.flyTo(c, zoom, { duration: 1.2 });
      else map.setView(c, zoom);
    });
  }
  // After a layer change: bring its area into the visible part, unless it is all in view already or the
  // view is inside it (zoomed in on a street: leave it).
  function showArea(area, opts) {
    if (!area || !area.isValid()) return;
    const view = visibleBounds();
    if (view.contains(area) || area.contains(view)) return;
    fitVisible(area, opts);
  }

  const BASEMAPS = {
    osm: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 19],
    gray: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors", 16],
    // Light terrain: river valleys and relief show where water goes; flood blues stay readable on it
    topo: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
      "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; OpenStreetMap contributors", 19],
    satellite: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      "Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics", 19],
  };
  // Place names on top of the satellite view
  const PLACE_LABELS = "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
  // Basemap: the configured one (topographic), with a Map / Satellite switch on the map, remembered on this device
  let baseLayers = [];
  const BLANK_TILE = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
  let tilesBroken = false;
  function setBase(name) {
    baseLayers.forEach((l) => map.removeLayer(l));
    const b = BASEMAPS[name];
    if (!b) return;
    baseLayers = [L.tileLayer(b[0], { attribution: b[1], maxZoom: b[2], errorTileUrl: BLANK_TILE })];
    if (name === "satellite") baseLayers.push(L.tileLayer(PLACE_LABELS, { maxZoom: 19, errorTileUrl: BLANK_TILE }));
    // Offline: failed tiles stay blank (plain background under the bundled layers) and a note says why
    baseLayers.forEach((l) => l.on("tileerror", () => { tilesBroken = true; netCheck(); })
      .on("tileload", (e) => {   // (the blank stand-in for a failed tile also "loads": not a real tile)
        if (tilesBroken && e.tile.src !== BLANK_TILE) { tilesBroken = false; netCheck(); }
      }));
    baseLayers.forEach((l) => l.addTo(map).bringToBack());
  }
  const mapBase = BASEMAPS[mapCfg.basemap] ? mapCfg.basemap : null;
  let baseName = mapBase && store.get("basemap", "") === "satellite" ? "satellite" : mapBase;
  setBase(baseName);
  if (mapBase) {
    const BaseSwitch = L.Control.extend({
      onAdd() {
        const b = L.DomUtil.create("button", "base-switch");
        const label = () => { b.textContent = baseName === "satellite" ? "🗺️ Map" : "🛰️ Satellite"; };
        label();
        L.DomEvent.disableClickPropagation(b);
        b.addEventListener("click", () => {
          baseName = baseName === "satellite" ? mapBase : "satellite";
          store.set("basemap", baseName === "satellite" ? "satellite" : "");
          setBase(baseName);
          label();
        });
        return b;
      },
    });
    new BaseSwitch({ position: "topleft" }).addTo(map);
  }

  // ---- Impact by municipality (policy side): the team's admin view (flood-impact v3) in tabs ----
  // Same formulas as their Streamlit app (work/analysis/build_impact.py); municipality totals and public buildings.
  // Building points (admin only) load after the verification code; the residents side never loads them.
  const SCENARIOS = [["rp10", "1-in-10"], ["rp100", "1-in-100"], ["rp500", "1-in-500"], ["observed_2021", "July 2021"]];
  const TABS = [["overview", "Overview"], ["shelters", "Shelters"], ["people", "People"], ["roads", "Roads & rail"],
    ["compare", "2021"], ["buildings", "Buildings"], ["data", "Data"]];
  const ICONS = { School: "🏫", Hospital: "🏥", Church: "⛪", "Stadium / sports hall": "🏟️" };
  const SHELTER_COLORS = { "Dry: usable": "#1a9850", "Wet: upper floors usable": "#fdae61", "Wet: not usable": "#d73027",
    "Wet: height uncertain": "#969696", "Dry in 2021": "#1a9850", "Flooded in 2021": "#d73027" };
  const DEPTH_COLORS = ["#e6550d", "#9ecae1", "#4292c6", "#2171b5", "#08306b"];   // 0 = July 2021, 1-4 = depth class
  const DEPTH_LABELS = ["", "≤ 0.5 m", "0.5–1.5 m", "1.5–3 m", "> 3 m"];
  const WALK_BANDS = [["≤ 30 min walk", "#1a9850"], ["> 30 min walk", "#fdae61"], ["No dry route", "#d73027"]];
  const USES = [["Outside built-up area", "#999999"], ["Residential", "#e41a1c"], ["Non-residential", "#377eb8"]];
  const MAPDATA = window.TOOL_IMPACT_MAP;
  let scenario = "rp100";
  let tab = "overview";
  let place = "";
  const onMap = { lines: true, shelters: true, squares: false, access: false, dots: false };
  let unlocked = false;
  const fmt = (n) => (n === null || n === undefined ? "–" : Number(n).toLocaleString("en-GB"));
  const scenLabel = () => SCENARIOS.find(([k]) => k === scenario)[1];
  const caption = (text) => el("p", "impact-foot", text);

  function table(head, rows) {
    const wrap = el("div", "tscroll");
    const t = el("table", "itable");
    const tr = el("tr");
    head.forEach((h) => tr.append(el("th", null, h)));
    t.append(tr);
    rows.forEach((r) => {
      const row = el("tr");
      r.forEach((c, i) => row.append(el(i ? "td" : "th", null, typeof c === "number" ? fmt(c) : String(c ?? "–"))));
      t.append(row);
    });
    wrap.append(t);
    return wrap;
  }
  function bars(title, rows, color) {
    const box = el("div", "ibars");
    box.append(el("p", "impact-sub", title));
    const max = Math.max(1, ...rows.map((r) => r[1]));
    rows.forEach(([name, n]) => {
      const row = el("div", "ibar");
      const fill = el("span", "ibar-fill");
      fill.style.width = `${(100 * n) / max}%`;
      fill.style.background = color;
      const track = el("span", "ibar-track");
      track.append(fill);
      row.append(el("span", "ibar-name", name), track, el("span", "ibar-n", fmt(n)));
      box.append(row);
    });
    return box;
  }
  function keyRow(rows) {
    const p = el("p", "ilegend");
    rows.forEach(([name, color]) => {
      const item = el("span", "ilegend-item");
      const s = el("span", "swatch");
      s.style.background = color;
      item.append(s, el("span", null, name));
      p.append(item);
    });
    return p;
  }

  // Municipality picker, sorted by exposure in the chosen scenario (as the admin view's sidebar)
  function fillPicker() {
    const sel = $("impact-place");
    const rows = Object.entries(IMPACT.cards).map(([n, c]) => [n, c[scenario]])
      .sort((a, b) => b[1].share - a[1].share || a[0].localeCompare(b[0]));
    sel.replaceChildren(Object.assign(el("option", null, "Choose a municipality…"), { value: "" }));
    rows.forEach(([n, c]) => sel.append(Object.assign(el("option", null,
      `${n} · ${(c.share * 100).toFixed(1)}% of buildings (${fmt(c.exposed)})`
      + (IMPACT.tabs[n].coverage < 0.5 ? ` · ⚠ ${Math.round(IMPACT.tabs[n].coverage * 100)}% mapped` : "")), { value: n })));
    sel.value = place;
  }

  function overview(box, c, observed) {
    c.warnings.forEach((w) => box.append(el("p", "impact-warn", "⚠ " + w)));
    const tiles = el("div", "impact-tiles");
    const tile = (value, what, sub) => {
      const t = el("div", "itile");
      t.append(el("div", "ivalue", value), el("div", "ilabel", what));
      if (sub) t.append(el("div", "isub", sub));
      tiles.append(t);
    };
    tile(fmt(c.exposed), observed ? "buildings in the July 2021 flood (satellite)" : `buildings in the ${scenLabel()}-year flood zone`,
      `${(c.share * 100).toFixed(1)}% of ${fmt(c.buildings)} · ${c.flooded_km2} km² flooded`);
    tile(`${fmt(c.people[0])}–${fmt(c.people[1])}`, "residents in those buildings", "Census 2021 grid / GHS-POP");
    tile(fmt(c.age65), "of whom aged 65+", `80+: about ${fmt(c.age80)} · under 15: ${fmt(c.under15)}`);
    tile(`${c.shelters_usable} of ${c.shelters}`, "shelter candidates usable",
      c.capacity ? `rough capacity ${fmt(c.capacity)} people` : "schools, hospitals, churches, sports");
    tile(fmt(c.no_route), "residents with no dry route to a shelter", `of ${fmt(c.in_flood_cells)} in flood cells: go up, not out`);
    tile(c.walk_min === null ? "–" : `${c.walk_min} min`, "median walk to a dry shelter",
      c.prm_min === null ? "no step-free dry route" : `step-free: ${c.prm_min} min`);
    tile(`${c.road_km} km`, "main roads under water", `railway lines: ${c.rail_km} km`);
    if (!observed) tile(fmt(c.deep), "buildings in cells deeper than 1.5 m", "modelled cell depth, not at the building");
    else tile(c.height_uncertain === null ? "–" : `${Math.round(c.height_uncertain * 100)}%`, "building height uncertain",
      "at the 2.5 m model floor or missing");
    box.append(tiles);
    if (!observed && c.missed_share !== null) {
      box.append(el("p", "impact-compare", `${Math.round(c.missed_share * 100)}% of the ${fmt(c.flooded_2021)} buildings `
        + `in the July 2021 satellite map lie outside the ${scenLabel()}-year zone.`));
    } else if (!observed && c.flooded_2021 > 0) {
      box.append(el("p", "impact-compare", `Only ${c.flooded_2021} buildings lie in the July 2021 satellite map here: `
        + "too few for a percentage."));
    }
  }

  function shelters(box, t, observed) {
    const rows = t.shelters;
    if (!rows.length) {
      box.append(el("p", null, "No shelter candidates (schools, hospitals, churches, stadiums / sports halls) found here in OpenStreetMap."));
      return;
    }
    // One stacked bar per type, coloured by status (the admin view's bar chart)
    const types = [...new Set(rows.map((s) => s.type))];
    const statuses = [...new Set(rows.map((s) => s[scenario][0]))];
    const stack = el("div", "ibars");
    types.forEach((ty) => {
      const mine = rows.filter((s) => s.type === ty);
      const row = el("div", "ibar");
      const track = el("span", "ibar-track stack");
      statuses.forEach((st) => {
        const n = mine.filter((s) => s[scenario][0] === st).length;
        if (!n) return;
        const seg = el("span", "ibar-fill");
        seg.style.width = `${(100 * n) / mine.length}%`;
        seg.style.background = SHELTER_COLORS[st] || "#888";
        seg.title = `${st}: ${n}`;
        track.append(seg);
      });
      row.append(el("span", "ibar-name", `${ICONS[ty] || ""} ${ty}`), track, el("span", "ibar-n", fmt(mine.length)));
      stack.append(row);
    });
    box.append(stack, keyRow(statuses.map((s) => [s, SHELTER_COLORS[s] || "#888"])));
    const head = ["Facility", "Status", "Height (m)", ...(observed ? [] : ["Water depth (m)"]), "Rough capacity",
      "PRM access", "Assigned people", "Over capacity", "Flooded in 2021"];
    const data = rows.map((s) => {
      const [status, depth, cap, prm, load] = s[scenario];
      return [`${ICONS[s.type] || ""} ${s.name || "(no name)"}`, status, s.height, ...(observed ? [] : [depth]), cap, prm, load,
        cap !== null && load > cap ? "⚠ yes" : "", s.flooded_2021 ? "yes" : "no"];
    }).sort((a, b) => String(a[1]).localeCompare(String(b[1])) || String(a[0]).localeCompare(String(b[0])));
    box.append(table(head, data));
    const csv = el("button", "chip", "⬇ Download as CSV");
    csv.addEventListener("click", () => {
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const text = [head, ...data].map((r) => r.map(q).join(",")).join("\n");
      const a = el("a");
      a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv" }));
      a.download = `shelters_${place}_${scenario}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
    box.append(csv, caption("Dry: the footprint is outside the flood extent. Upper floors usable: building height minus "
      + "water depth is at least one 3 m storey. Heights are OBAT estimates averaged over 100 m (minimum 2.5 m), not "
      + "surveyed values. Rough capacity = largest building's footprint × up to 2 dry storeys × 50% usable ÷ 3.5 m² per "
      + "person (Sphere minimum): a theoretical maximum, not an official capacity. Hospitals get no capacity (critical "
      + "sites to protect). PRM access comes from the OpenStreetMap 'wheelchair' tag (mapped for few buildings). Assigned "
      + "people = residents of flood cells whose nearest dry shelter (walking, flooded paths removed) is this one. "
      + "Facility locations: © OpenStreetMap contributors."));
  }

  function people(box, t) {
    const s = t.statbel;
    const tiles = el("div", "impact-tiles");
    [["Inhabitants (whole municipality)", s.total, "Statbel, 1 Jan 2021"], ...["0–14", "15–64", "65–79", "80+"]
      .map((b) => [`Aged ${b}`, s[b], s.total ? `${((100 * s[b]) / s.total).toFixed(1)}%` : ""])].forEach(([what, n, sub]) => {
      const d = el("div", "itile");
      d.append(el("div", "ivalue", fmt(n)), el("div", "ilabel", what), el("div", "isub", sub));
      tiles.append(d);
    });
    box.append(tiles, caption(`In the part mapped by EMS: ${fmt(t.area_pop[0])} (Census 2021 grid) – ${fmt(t.area_pop[1])} `
      + "(GHS-POP 2020) inhabitants."));
    box.append(el("p", "impact-sub", "People living in exposed buildings"));
    box.append(table(["Scenario", "Census grid", "GHS-POP", "Under 15", "15–64", "65+", "80+ (estimate)"],
      SCENARIOS.map(([k, lab]) => {
        const p = t.population[k];
        return [lab, p.census, p.ghs, p.lt15, p["15_64"], p["65plus"], p["80plus"]];
      })));
    box.append(caption("Each 1 km cell's population is split over its residential buildings by volume (footprint × height). "
      + "Age groups come from the Eurostat Census 2021 grid. 80+ is estimated with the municipality's Statbel 80+ share. "
      + "No open disability data exists at municipal level, so 65+ and 80+ are the best available proxy for people "
      + "needing assistance."));
  }

  function roadsTab(box, t) {
    if (!t.roads.length) {
      box.append(el("p", null, "No main roads or railways mapped in this municipality."));
      return;
    }
    box.append(keyRow([["road", "#7b3294"], ["railway (dashed)", "#000"]]));
    box.append(table(["Network", "Class", "Network (km)", ...SCENARIOS.map(([, lab]) => `Flooded ${lab} (km)`)],
      t.roads.map((r) => [r.mode, r.class, r.network, ...SCENARIOS.map(([k]) => r[k])])));
    const named = t.named_roads[scenario];
    box.append(el("p", "impact-sub", `Named roads and lines affected, ${scenLabel()} (${named.length})`));
    if (named.length) box.append(table(["Network", "Class", "Name", "Flooded (km)"], named));
    box.append(caption("Roads: Copernicus EMS (highways, primary and secondary roads only, no local streets). Railways: "
      + "Infrabel main tracks (CC0), one track per line, in service only. A flooded section can cut off access to whole "
      + "neighbourhoods; network connectivity is not analysed yet."));
  }

  function compare(box, t) {
    box.append(el("p", "impact-sub", "How well does each modelled scenario match what happened in 2021?"));
    box.append(table(["Scenario", "Flooded area (km²)", "Buildings exposed", "Flooded in 2021 and predicted",
      "Flooded in 2021 but NOT predicted", "Predicted but not flooded in 2021"],
    [...t.compare.map((r) => [SCENARIOS.find(([k]) => k === r.scenario)[1], r.km2, r.exposed, r.both, r.missed, r.not_2021]),
      ["Observed July 2021", t.compare_2021.km2, t.compare_2021.exposed, "", "", ""]]));
    const n = t.compare_2021.exposed;
    if (n >= 30) {
      box.append(el("p", "impact-compare", "Share of buildings flooded in 2021 outside each modelled scenario: "
        + t.compare.map((r) => `${SCENARIOS.find(([k]) => k === r.scenario)[1]}: ${Math.round((100 * r.missed) / n)}%`).join(" · ")));
    } else if (n) {
      box.append(el("p", "impact-compare", `Only ${n} buildings lie in the 2021 observed extent here: too few for a percentage.`));
    }
    box.append(el("p", null, "This is agreement between two different products, not a validation of the model: the "
      + "observed layer is a lower bound and the modelled layers ignore flood defences."));
    box.append(caption("A modelled return period is not a forecast of the 2021 event: EFAS maps river floods, while 2021 "
      + "also involved flash floods on small streams. EMS extents are snapshots at satellite pass time and can miss water "
      + "that had already receded or was under trees and buildings."));
  }

  function buildingsTab(box, t, observed) {
    const d = t.buildings[scenario];
    if (!d.use.length) {
      box.append(el("p", null, "No exposed buildings in this scenario."));
    } else {
      if (!observed) box.append(bars(`By modelled cell depth (${fmt(d.artefact)} with > 10 m, likely artefacts, in '> 3 m')`, d.depth, "#2171b5"));
      box.append(bars("By height (OBAT, 100 m averages)", d.height, "#17a8a6"));
      box.append(bars("By use (OBAT)", d.use, "#e2483d"));
      box.append(bars("By construction period (OBAT)", d.epoch, "#f5a03a"));
      if (d.ems.length) box.append(bars("By type (Copernicus EMS building blocks, where mapped)", d.ems, "#16395c"));
    }
    // Individual buildings: admin view only, after the verification code (the data stays out of the residents side)
    const lock = el("div", "unlock");
    if (unlocked) {
      lock.append(el("p", null, "🔓 Individual buildings: switch them on above (\"Buildings\")."));
    } else {
      lock.append(el("p", "impact-sub", "🔒 Individual buildings (admin view)"));
      const code = Object.assign(el("input"), { type: "password", autocomplete: "off", placeholder: "Verification code" });
      code.value = $("code").value;
      const go = el("button", "chip", "Unlock");
      const msg = el("p", "isub");
      go.addEventListener("click", async () => {
        msg.textContent = "Checking…";
        let ok = false;
        try { ok = (await api("/api/check", { code: code.value })).ok; } catch (e) { ok = false; }
        if (!ok) { msg.textContent = "Code not accepted or demo server offline."; return; }
        const s = document.createElement("script");
        s.src = "data/impact_buildings.js";
        s.onload = () => { unlocked = true; onMap.dots = true; renderImpact(); };
        s.onerror = () => { msg.textContent = "Building points are only in the app and the web folder version, not the single HTML file."; };
        document.head.append(s);
      });
      lock.append(code, go, msg, caption("Same verification code as the messages. In a real deployment these points "
        + "come from the municipality's server only after login; residents never see individual homes."));
    }
    box.append(lock);
  }

  function dataTab(box) {
    const m = IMPACT.meta || {};
    box.append(el("p", null, `Region: ${m.region || "–"}`), el("p", null, `Observed 2021: ${m.observed_2021_sources || "–"}`),
      el("p", null, `Municipality boundaries: ${m.municipality_boundaries || "–"}`), el("p", "impact-sub", "Assumptions"));
    const ul = el("ul", "impact-top");
    (IMPACT.assumptions || []).forEach((a) => ul.append(el("li", null, a)));
    box.append(ul, caption("External sources: shelter candidates © OpenStreetMap contributors (ODbL); railway lines "
      + "Infrabel open data (CC0); Eurostat Census 2021 1 km grid (© European Union); Statbel population by age 2021 "
      + "(CC BY 4.0). No open disability data per municipality was found."));
  }

  // Priority issues (teammate's latest admin view, data/risks.js): what each municipality must look at first.
  // Per municipality and scenario: [level, issue, text, action], their wording as written, high first.
  // Levels come from their screening thresholds (pipeline/build_risks.py), not official standards.
  const RISKS = window.TOOL_RISKS;
  const LEVELS = [[1, "🔴", "High", "#d73027"], [2, "🟠", "Medium", "#fc8d59"], [3, "🟡", "Low", "#e6c200"]];
  const issuesOf = (lau) => ((RISKS || {})[lau] || {})[scenario] || [];
  const countLevels = (list) => LEVELS.map(([l]) => list.filter((r) => r[0] === l).length);
  const countText = ([hi, mid, lo]) => `${hi} 🔴 · ${mid} 🟠 · ${lo} 🟡`;
  const prioOpen = { 1: true, 2: false, 3: false };   // which groups are unfolded (kept while the card redraws)

  // In the municipality card: one group per level, the issue names in its header, then issue: text → action
  function priorities(box, lau) {
    const list = issuesOf(lau);
    const wrap = el("div", "prio");
    wrap.append(el("h3", "prio-head", `Priority issues · ${countText(countLevels(list))}`));
    if (!list.length) wrap.append(el("p", "prio-none", "No issue found with the available data for this scenario (this is not a guarantee)."));
    LEVELS.forEach(([lvl, icon, word, color]) => {
      const g = list.filter((r) => r[0] === lvl);
      if (!g.length) return;
      const names = g.map((r) => r[1]).join(", ");
      const d = el("details", "prio-group");
      d.style.setProperty("--level", color);
      d.open = prioOpen[lvl];
      d.addEventListener("toggle", () => { prioOpen[lvl] = d.open; });
      const head = el("summary", null, `${icon} `);
      head.append(el("b", null, word), ` (${g.length}): ${names.length < 110 ? names : names.slice(0, 107) + "…"}`);
      d.append(head);
      g.forEach(([, issue, text, action]) => {
        const item = el("div", "prio-item");
        item.append(el("b", null, issue), `: ${text}`, el("span", "prio-action", "→ " + action));
        d.append(item);
      });
      wrap.append(d);
    });
    wrap.append(caption("Levels come from screening thresholds (see \"How priorities are set\" under Priority issues), "
      + "not official standards."));
    box.append(wrap);
  }

  // All municipalities, current scenario (their "All municipalities" tab): most 🔴, then 🟠, then 🟡 first.
  // Top 10, or all; a tap opens that municipality's card.
  const TRIAGE_TOP = 10;
  let triageAll = false;
  function renderTriage() {
    const box = $("triage");
    const rows = Object.entries(IMPACT.tabs).map(([n, t]) => {
      const list = issuesOf(t.lau);
      return [n, countLevels(list), list.filter((r) => r[0] === 1).map((r) => r[1]).join(" · ")];
    }).sort((a, b) => b[1][0] - a[1][0] || b[1][1] - a[1][1] || b[1][2] - a[1][2] || a[0].localeCompare(b[0]));
    const chips = el("div", "chips");
    chips.setAttribute("aria-label", "Flood scenario");
    SCENARIOS.forEach(([k, lab]) => {
      const b = el("button", k === scenario ? "chip small on" : "chip small", lab);
      b.setAttribute("aria-pressed", String(k === scenario));
      b.addEventListener("click", () => { scenario = k; fillPicker(); renderImpact(); showArea(placeBounds(), PLACE_FIT); });
      chips.append(b);
    });
    const list = el("ol", "triage");
    rows.slice(0, triageAll ? rows.length : TRIAGE_TOP).forEach(([n, counts, reds]) => {
      const b = el("button", n === place ? "triage-row on" : "triage-row");
      if (n === place) b.setAttribute("aria-current", "true");
      b.append(el("span", "triage-name", n), el("span", "triage-n", countText(counts)));
      if (reds) b.append(el("span", "triage-red", "🔴 " + reds));
      b.addEventListener("click", () => selectPlace(n, true));
      const li = el("li");
      li.append(b);
      list.append(li);
    });
    const more = el("button", "chip small", triageAll ? `Show the top ${TRIAGE_TOP}` : `Show all ${rows.length}`);
    more.setAttribute("aria-expanded", String(triageAll));
    more.addEventListener("click", () => { triageAll = !triageAll; renderTriage(); });
    const what = scenario === "observed_2021" ? "the July 2021 flood (satellite)" : `the ${scenLabel()}-year flood`;
    box.replaceChildren(el("p", "hint", `Which municipalities first, for ${what}: most high-priority issues (🔴) first, `
      + "then 🟠 and 🟡. Tap one for its issues and actions."), chips, list, more);
  }

  function renderImpact() {
    const box = $("impact");
    box.replaceChildren();
    if (RISKS) renderTriage();   // same scenario, current municipality marked
    if (!place) {
      box.append(el("p", "isub", "Tap a municipality on the map, or choose one above."));
      return;
    }
    const c = IMPACT.cards[place][scenario];
    const t = IMPACT.tabs[place];
    const observed = scenario === "observed_2021";
    const chips = el("div", "chips");
    chips.setAttribute("aria-label", "Flood scenario");
    SCENARIOS.forEach(([k, lab]) => {
      const b = el("button", k === scenario ? "chip on" : "chip", lab);
      b.setAttribute("aria-pressed", String(k === scenario));
      b.addEventListener("click", () => { scenario = k; fillPicker(); renderImpact(); showArea(placeBounds(), PLACE_FIT); });
      chips.append(b);
    });
    // On the map, for this municipality
    const layersRow = el("div", "chips map-toggles");
    [["lines", "Roads & rail"], ["shelters", "Shelters"], ["squares", "250 m squares"], ["access", "Walk to shelter"],
      ...(unlocked ? [["dots", "Buildings"]] : [])].forEach(([k, lab]) => {
      const b = el("button", onMap[k] ? "chip small on" : "chip small", (onMap[k] ? "✓ " : "") + lab);
      b.setAttribute("aria-pressed", String(onMap[k]));
      b.addEventListener("click", () => {
        onMap[k] = !onMap[k];
        renderImpact();
        if (onMap[k]) showArea(placeBounds(), PLACE_FIT);
      });
      layersRow.append(b);
    });
    const tabs = el("div", "itabs");
    tabs.setAttribute("role", "tablist");
    TABS.forEach(([k, lab]) => {
      const b = el("button", k === tab ? "itab on" : "itab", lab);
      b.setAttribute("role", "tab");
      b.setAttribute("aria-selected", String(k === tab));
      b.addEventListener("click", () => { tab = k; renderImpact(); });
      tabs.append(b);
    });
    box.append(chips);
    if (RISKS) priorities(box, t.lau);
    box.append(el("p", "isub", "On the map:"), layersRow, mapLegend(), tabs);
    const body = el("div", "itab-body");
    if (tab === "overview") overview(body, c, observed);
    if (tab === "shelters") shelters(body, t, observed);
    if (tab === "people") people(body, t);
    if (tab === "roads") roadsTab(body, t);
    if (tab === "compare") compare(body, t);
    if (tab === "buildings") buildingsTab(body, t, observed);
    if (tab === "data") dataTab(body);
    box.append(body, caption("Team 4 analysis of the challenge data (EFAS, GHS-OBAT, GHS-POP, Copernicus EMS) with "
      + "OpenStreetMap, Eurostat and Statbel. Planning support, not official evacuation guidance."));
    drawImpact();
  }

  function mapLegend() {
    const rows = [];
    if (onMap.shelters) rows.push(["shelter dry", "#1a9850"], ["upper floors", "#fdae61"], ["not usable", "#d73027"]);
    if (onMap.squares) rows.push(...(scenario === "observed_2021" ? [["2021 squares", DEPTH_COLORS[0]]]
      : DEPTH_LABELS.slice(1).map((n, i) => [n, DEPTH_COLORS[i + 1]])));
    if (onMap.access) rows.push(...WALK_BANDS);
    if (onMap.dots && unlocked) rows.push(...USES.slice(1));
    return rows.length ? keyRow(rows) : el("span");
  }

  // Map layers for the chosen municipality and scenario (canvas; redrawn on every change)
  const impactGroup = L.layerGroup().addTo(map);
  function drawImpact() {
    impactGroup.clearLayers();
    if (!place || !MAPDATA) return;
    const t = IMPACT.tabs[place];
    const L0 = MAPDATA.layers[t.lau];
    if (!L0) return;
    if (onMap.squares) L0.squares[scenario].forEach(([s, w, n, e, count, d]) => L.rectangle([[s, w], [n, e]], {
      color: "#555", weight: 0.5, fillColor: DEPTH_COLORS[d], fillOpacity: 0.75,
    }).bindTooltip(`${count} buildings` + (d ? ` · mostly ${DEPTH_LABELS[d]}` : "")).addTo(impactGroup));
    if (onMap.lines) L0.lines[scenario].forEach(([rail, cls, name, pts]) => L.polyline(pts.map(([x, y]) => [y, x]), {
      color: rail ? "#000" : "#7b3294", weight: 4, dashArray: rail ? "8 4" : null,
    }).bindTooltip(`${cls}${name ? " · " + name : ""}`).addTo(impactGroup));
    if (onMap.shelters) L0.shelters.forEach((ring, i) => {
      const s = t.shelters[i];
      const [status, , cap] = s[scenario];
      L.polygon(ring.map(([x, y]) => [y, x]), { color: "#333", weight: 1, fillColor: SHELTER_COLORS[status] || "#888", fillOpacity: 0.85 })
        .bindTooltip(`${ICONS[s.type] || ""} ${s.name || s.type} · ${status}` + (cap ? ` · about ${fmt(cap)} people` : ""))
        .addTo(impactGroup);
    });
    if (onMap.access) L0.access[scenario].forEach(([lat, lon, band, n, walk]) => L.circleMarker([lat, lon], {
      radius: 6, color: "#333", weight: 1, fillColor: WALK_BANDS[band][1], fillOpacity: 0.8,
    }).bindTooltip(`${WALK_BANDS[band][0]}${walk !== null && band < 2 ? ` (${walk} min)` : ""} · ${fmt(n)} people in flood cells`)
      .addTo(impactGroup));
    const pts = unlocked && onMap.dots && (window.TOOL_IMPACT_BUILDINGS || {})[t.lau];
    if (pts) {
      const col = { rp10: 4, rp100: 5, rp500: 6 }[scenario];
      pts.filter((p) => (col ? p[col] > 0 : p[7])).forEach(([lat, lon, use, h, ...r]) => {
        const depth = col ? ` · modelled cell depth ${r[col - 4]} m` : "";
        L.circleMarker([lat, lon], { radius: 3, color: "#333", weight: 0.5, fillColor: USES[use][1], fillOpacity: 0.9 })
          .bindTooltip(`${USES[use][0]} · height ${h === null ? "unknown" : h + " m"}${depth}`).addTo(impactGroup);
      });
    }
  }

  const PLACE_FIT = { padding: [30, 30], maxZoom: 13 };
  function placeBounds() {
    const f = place && muniLayer && muniLayer.data.features.find((x) => (x.properties || {}).Municipality === place);
    return f ? L.geoJSON(f).getBounds() : null;
  }
  function selectPlace(name, zoom) {
    place = name;
    $("impact-place").value = name;
    if (onPlace) onPlace(name);
    renderImpact();
    if (sheet.dataset.state === "peek") setState("half");
    showInSheet($("impact-box"));
    if (zoom && name) {
      const area = placeBounds();
      if (area) fitVisible(area, PLACE_FIT);
    }
  }
  if (MODE === "policy" && IMPACT && IMPACT.tabs) {
    $("impact-box").hidden = false;
    $("priorities").hidden = !RISKS;   // policy side only: residents never see it
    fillPicker();
    $("impact-place").addEventListener("change", () => selectPlace($("impact-place").value, true));
    renderImpact();
  }

  function showSelected(layerDef, props) {
    const dl = $("selected-props");
    dl.replaceChildren();
    // Municipalities on the policy side open the impact tabs instead of a property list
    if (MODE === "policy" && layerDef.id === "municipalities" && IMPACT && IMPACT.tabs && IMPACT.tabs[props.Municipality]) {
      selectPlace(props.Municipality, false);
      return;
    }
    const keys = layerDef.props && layerDef.props.length ? layerDef.props : Object.keys(props);
    dl.append(el("dt", null, "Layer"), el("dd", null, layerDef.name));
    keys.forEach((k) => {
      if (props[k] === undefined || props[k] === null || props[k] === "") return;
      dl.append(el("dt", null, k), el("dd", null, String(props[k])));
    });
    $("selected").hidden = false;
    if (sheet.dataset.state === "peek") setState("half");
    showInSheet($("selected"));   // below the key numbers otherwise
  }

  // Colour of one feature: by value when the layer has a "style", else the layer colour.
  function colorFor(def, props) {
    const s = def.style;
    if (!s || !s.by) return def.color;
    const v = props[s.by];
    if (s.classes) {
      const c = s.classes.find((k) => String(k.value) === String(v));
      return c ? c.color : (s.other || "#9ca3af");
    }
    if (s.bins && s.colors) {
      const n = Number(v);
      if (v === null || v === undefined || v === "" || Number.isNaN(n)) return s.other || "#9ca3af";
      let i = 0;
      while (i < s.bins.length && n >= s.bins[i]) i++;
      return s.colors[i];
    }
    return def.color;
  }

  // Legend rows of one layer: its classes or bins, a manual list, or one swatch.
  function legendRows(def) {
    const s = def.style || {};
    if (s.classes) return s.classes.map((c) => [c.color, c.label ?? String(c.value)]);
    if (s.bins && s.colors) {
      return s.colors.map((c, i) => {
        const lo = i === 0 ? null : s.bins[i - 1];
        const hi = i < s.bins.length ? s.bins[i] : null;
        const auto = lo === null ? `< ${hi}` : hi === null ? `≥ ${lo}` : `${lo} – ${hi}`;
        return [c, (s.labels && s.labels[i]) || auto];
      });
    }
    if (def.legend) return def.legend.map((r) => [r.color, r.label]);
    return [[def.color || "#888", def.name]];
  }

  const registry = {}; // layer id -> { def, layer, box }
  const legend = L.control({ position: "topright" });
  legend.onAdd = () => L.DomUtil.create("div", "legend");
  legend.addTo(map);
  // On phones the legend starts folded to one small button, so the map keeps its space
  let legendOpen = !window.matchMedia("(max-width: 799px)").matches;
  function renderLegend() {
    const box = legend.getContainer();
    box.replaceChildren();
    L.DomEvent.disableClickPropagation(box);
    const toggle = el("button", "legend-toggle", legendOpen ? "Legend ▴" : "Legend ▾");
    toggle.setAttribute("aria-expanded", String(legendOpen));
    toggle.addEventListener("click", () => { legendOpen = !legendOpen; renderLegend(); });
    box.append(toggle);
    box.classList.toggle("folded", !legendOpen);
    const shown = LAYERS.filter((d) => registry[d.id] && map.hasLayer(registry[d.id].layer));
    shown.forEach((def) => {
      const rows = legendRows(def);
      const titled = rows.length > 1 || rows[0][1] !== def.name;
      if (titled) box.append(el("div", "legend-title", def.name));
      rows.forEach(([color, label]) => {
        const row = el("div", "legend-row");
        const sw = el("span", "swatch");
        sw.style.background = color;
        row.append(sw, el("span", null, label));
        box.append(row);
      });
    });
    box.hidden = shown.length === 0;
  }

  function setVisible(id, on) {
    const r = registry[id];
    if (!r) return;
    if (on) r.layer.addTo(map);
    else map.removeLayer(r.layer);
    r.box.checked = on;
  }

  const bounds = L.latLngBounds([]);
  LAYERS.forEach((def) => {
    let layer;
    let count = "";
    if (def.type === "image") {
      layer = L.imageOverlay(def.url, def.bounds, { opacity: def.opacity ?? 0.65, interactive: false });
      bounds.extend(def.bounds);
    } else {
      layer = L.geoJSON(def.data, {
        style: (f) => {
          const c = colorFor(def, f.properties || {});
          return { color: c, weight: def.weight ?? 1.5, fillColor: c, fillOpacity: def.fillOpacity ?? 0.35 };
        },
        pointToLayer: (f, latlng) => L.circleMarker(latlng, {
          radius: def.radius ?? 6, color: "#fff", weight: 1.5, fillColor: colorFor(def, f.properties || {}), fillOpacity: 0.95,
        }),
        onEachFeature: (f, l) => l.on("click", () => showSelected(def, f.properties || {})),
      });
      count = (def.data.features || []).length;
      if (layer.getBounds().isValid()) bounds.extend(layer.getBounds());
    }
    if (def.visible !== false) layer.addTo(map);

    const li = el("li");
    const label = el("label");
    const box = el("input");
    box.type = "checkbox";
    box.checked = def.visible !== false;
    box.addEventListener("change", () => {
      setVisible(def.id, box.checked);
      renderLegend();
      // Switched on: show it above the panel (the chosen municipality if there is one, else the whole layer)
      if (box.checked) {
        showArea(place ? placeBounds() : def.type === "image" ? L.latLngBounds(def.bounds) : layer.getBounds(),
          place ? PLACE_FIT : { padding: [20, 20] });
      }
    });
    const sw = el("span", "swatch");
    sw.style.background = legendRows(def).length > 1 ? `linear-gradient(135deg, ${legendRows(def).map((r) => r[0]).join(", ")})` : (def.color || "#888");
    label.append(box, sw, el("span", null, def.name));
    if (count !== "") label.append(el("span", "count", count.toLocaleString()));
    li.append(label);
    $("layers").append(li);
    registry[def.id] = { def, layer, box };
  });
  if (LAYERS.length === 0) $("layers").append(el("li", "placeholder", "No layers yet: put files in web/data/src/"));
  if (mapCfg.fitLayers && bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
  renderLegend();

  // ---- Closest candidate shelters (residents), computed on the phone; the position is never sent ----
  // Only buildings dry in the 1-in-500-year model AND not flooded in July 2021; open-air pitches left out.
  // Candidates are not official reception centres: the card says so every time (index.html).
  const shelterData = (window.TOOL_LAYERS || []).find((l) => l.id === "shelters");
  const shelterMarks = L.layerGroup();
  function distanceKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const a = Math.sin(((lat2 - lat1) * r) / 2) ** 2
      + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lon2 - lon1) * r) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(a));
  }
  function closestShelters(lat, lon, n) {
    return (shelterData ? shelterData.data.features : [])
      .filter((f) => {
        const p = f.properties || {};
        // Hospitals stay free for patients: never suggested to the public as a shelter.
        return p["In a 1-in-500-year flood"] === "Dry: usable" && p["July 2021"] === "Dry in 2021"
          && p.Type !== "Hospital" && !/stade|stadium|terrain/i.test(p.Name || "");
      })
      .map((f) => ({ p: f.properties, lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
        km: distanceKm(lat, lon, f.geometry.coordinates[1], f.geometry.coordinates[0]) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, n);
  }
  // Phone: geo: opens the maps app (Android wrapper hands it over). Browser: OpenStreetMap.
  function mapsLink(lat, lon, name) {
    const a = el("a", "maps-link", "Open in Maps");
    a.href = window.AndroidBridge
      ? `geo:${lat},${lon}?q=${lat},${lon}(${encodeURIComponent(name)})`
      : `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=17/${lat}/${lon}`;
    a.target = "_blank";
    a.rel = "noopener";
    return a;
  }

  // Dry walking route (teammate's v3 analysis, data/access.js): from the nearest 250 m housing cell (within
  // 400 m), the candidate shelter reachable on foot without crossing flooded streets or bridges in the
  // 1-in-500-year model, or its no-stairs version. Outside the housing cells: the straight-line list below.
  const ACCESS = window.TOOL_ACCESS;
  const MAX_CELL_KM = 0.4;
  function dryRoute(lat, lon, noStairs) {
    if (!ACCESS) return null;
    let best = null, bestKm = Infinity;
    for (const c of ACCESS.cells) {
      if (Math.abs(c[0] - lat) > 0.01 || Math.abs(c[1] - lon) > 0.015) continue;   // ~1 km box first
      const km = distanceKm(lat, lon, c[0], c[1]);
      if (km < bestKm) { bestKm = km; best = c; }
    }
    if (!best || bestKm > MAX_CELL_KM) return null;
    const [, , inFlood, sid, walk, prmSid, prmWalk] = best;
    const id = noStairs ? prmSid : sid;
    return { inFlood: Boolean(inFlood), minutes: noStairs ? prmWalk : walk, shelter: id >= 0 ? ACCESS.shelters[id] : null };
  }
  function showRoute(lat, lon, r) {
    const T_ = R.shelterText || {};
    if (!r.shelter) {
      $("shelter-note").textContent = r.inFlood ? T_.noRouteFlood : T_.noRouteDry;
      viewVisible([lat, lon], 14);
      return;
    }
    const [name0, cat, slat, slon, status, cap, prm, obs] = r.shelter;
    const type = ACCESS.categories[cat] || "Building";
    const name = name0 || "Unnamed " + type.toLowerCase();
    const st = (k) => ACCESS.status[k], pr = (k) => ACCESS.prm[k];
    const li = el("li");
    li.append(el("strong", null, name), el("span", null, ` · ${type} · ${r.minutes} min on foot by a dry route`));
    const facts = [st(status) === "Wet: upper floors usable" ? T_.upper : T_.dry];
    if (st(obs) === "Flooded in 2021") facts.push(T_.flooded2021);
    if (cap > 0) facts.push(`${T_.capacity} ${cap} people.`);
    facts.push(pr(prm) === "Yes (OSM)" ? T_.prmYes : pr(prm) === "Limited (OSM)" ? T_.prmLimited
      : pr(prm) === "Upper floors only: stairs likely" ? T_.prmStairs : T_.prmUnknown);
    if (/stade|stadium|terrain/i.test(name)) facts.push(T_.openAir);
    li.append(el("div", "shelter-facts", facts.join(" ")), mapsLink(slat, slon, name));
    $("shelter-list").append(li);
    shelterMarks.addLayer(L.polyline([[lat, lon], [slat, slon]], { dashArray: "6 6", color: "#0b5cad", weight: 3 })
      .bindTooltip(T_.line));
    shelterMarks.addLayer(L.circleMarker([slat, slon], { radius: 9, color: "#fff", weight: 3, fillColor: "#0ca30c", fillOpacity: 1 })
      .bindTooltip(name));
    $("shelter-note").textContent = T_.routeNote;
    fitVisible([[lat, lon], [slat, slon]], { padding: [40, 40], maxZoom: 16 });
  }

  function showShelters(lat, lon) {
    $("shelter-list").replaceChildren();
    shelterMarks.clearLayers();
    shelterMarks.addTo(map);
    const route = dryRoute(lat, lon, $("no-stairs").checked);
    if (route) {
      shelterMarks.addLayer(L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1d4ed8", fillOpacity: 1 })
        .bindTooltip("You are here"));
      return showRoute(lat, lon, route);
    }
    const list = closestShelters(lat, lon, 3);
    if (!list.length || list[0].km > 25) {
      $("shelter-note").textContent = "No candidate in our data near you. Follow your municipality and BE-Alert.";
      offerDemo();
      return;
    }
    $("shelter-note").textContent = "Distances are as the crow flies.";
    const here = L.circleMarker([lat, lon], { radius: 8, color: "#fff", weight: 3, fillColor: "#1d4ed8", fillOpacity: 1 });
    shelterMarks.addLayer(here.bindTooltip("You are here"));
    list.forEach((s, i) => {
      const li = el("li");
      const km = s.km < 1 ? `${Math.round(s.km * 1000)} m` : `${s.km.toFixed(1)} km`;
      const name = s.p.Name && s.p.Name !== "(no name)" ? s.p.Name : "Unnamed " + String(s.p.Type).toLowerCase();
      li.append(el("strong", null, name), el("span", null, ` · ${s.p.Type} · ${km}`), mapsLink(s.lat, s.lon, name));
      $("shelter-list").append(li);
      shelterMarks.addLayer(L.circleMarker([s.lat, s.lon], { radius: 9, color: "#fff", weight: 3, fillColor: "#0ca30c", fillOpacity: 1 })
        .bindTooltip(`${i + 1}. ${name}`));
    });
    fitVisible(shelterMarks.getLayers().map((m) => m.getLatLng()), { padding: [40, 40], maxZoom: 15 });
  }
  if (MODE === "residents" && ROLES) {
    // No stairs (wheelchair, pram, walking frame): on by default in easy read.
    $("no-stairs").checked = easy;
    $("stairs-tag").hidden = !easy;
    $("no-stairs").addEventListener("change", () => {
      $("stairs-tag").hidden = !$("no-stairs").checked;
      if (lastPos) showShelters(lastPos[0], lastPos[1]);
    });
    $("find-shelter").addEventListener("click", () => {
      $("shelter-box").hidden = false;
      if (sheet.dataset.state === "peek") setState("half");
      showInSheet($("shelter-box"));
      if (lastPos) return showShelters(lastPos[0], lastPos[1]);
      if (!navigator.geolocation) {
        $("shelter-note").textContent = "Location is not available on this device.";
        offerDemo();
        return;
      }
      $("shelter-note").textContent = "📍 Finding your location…";
      navigator.geolocation.getCurrentPosition(
        (pos) => { lastPos = [pos.coords.latitude, pos.coords.longitude]; showShelters(lastPos[0], lastPos[1]); },
        () => {
          $("shelter-note").textContent = "Location not allowed or not found. Follow your municipality and BE-Alert.";
          offerDemo();
          showInSheet($("demo-loc"));   // it sits above the shelter box
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
    });
  }

  // ---- DEMO location (presentations outside Wallonia): pretend to stand in Visé town centre ----
  // Our data only covers Walloon municipalities mapped by Copernicus; the button appears only when the real
  // location is outside that area or unavailable, and the app says DEMO wherever it is used.
  const DEMO_PLACE = { name: "Visé", lat: 50.737, lon: 5.695 };
  function offerDemo() {
    if (MODE === "residents" && ROLES) $("demo-loc").hidden = false;
  }
  if (MODE === "residents" && ROLES) {
    $("demo-loc").addEventListener("click", () => {
      lastPos = [DEMO_PLACE.lat, DEMO_PLACE.lon];
      $("my-place").value = DEMO_PLACE.name;
      $("my-place").dispatchEvent(new Event("change"));
      $("place-hint").textContent = `📍 DEMO location: ${DEMO_PLACE.name} (not where you are)`;
      $("demo-loc").hidden = true;
      $("shelter-box").hidden = false;
      showShelters(DEMO_PLACE.lat, DEMO_PLACE.lon);
      $("shelter-note").textContent = `DEMO location: ${DEMO_PLACE.name}. ` + $("shelter-note").textContent;
      if (sheet.dataset.state === "peek") setState("half");
    });
  }

  // ---- No internet ----
  // Residents: a banner opens a screen of what still works on the phone alone (112, who to call, the closest dry
  // shelter by GPS on the bundled data, the last alerts, the card, texting your location, BE-Alert). Shown when the
  // phone says it is offline, or when both the demo server and the map tiles fail (a demo server alone can be off).
  // Both sides: when the background map can't load, a note says so; the flood layers are bundled and stay.
  const OFF = RES.offline || {};
  const offText = () => OFF[langOf()] || OFF.en || {};
  const netDown = () => navigator.onLine === false || (relayDown && tilesBroken);
  function keepAlert(msg) {
    let kept = [];
    try { kept = JSON.parse(store.get("lastAlerts", "[]")) || []; } catch (e) { kept = []; }
    if (kept.some((m) => m.id === msg.id && m.time === msg.time)) return;
    kept.unshift({ id: msg.id, from: msg.from || "", time: msg.time, text: msg.text });
    store.set("lastAlerts", JSON.stringify(kept.slice(0, 5)));
  }
  function netCheck() {
    if (!$("map-note")) return;
    $("map-note").hidden = !tilesBroken;
    const banner = ROLES && MODE === "residents" && netDown();
    $("offline-banner").hidden = !banner;
    if (banner) $("offline-banner").textContent = offText().banner || "No internet";
  }
  function smsLink(a, pos) {
    const t = offText();
    if (pos) {
      const [lat, lon] = pos.map((v) => v.toFixed(5));
      a.href = "sms:?body=" + encodeURIComponent(`${t.smsBody} ${lat},${lon} https://maps.google.com/?q=${lat},${lon}`);
      a.textContent = t.sms;
    } else {
      a.href = "sms:";
      a.textContent = t.smsNoFix;
    }
  }
  function openOffline() {
    const t = offText();
    const l = langOf();
    const c = (RES.card || {})[l] || (RES.card || {}).en || {};
    $("offline").lang = l;
    $("off-title").textContent = t.title;
    $("off-intro").textContent = t.intro;
    $("off-back").textContent = t.back;
    const body = $("off-body");
    body.replaceChildren();
    // (a) 112: the card's own first line
    body.append(Object.assign(el("a", "off-btn off-112", (c.lines || [])[0] || "112"), { href: "tel:112" }));
    // (b) who to call in my municipality (same links as the water/power/gas tiles)
    const place = ($("my-place") && $("my-place").value) || store.get("myPlace", "");
    const calls = el("div", "off-group");
    calls.append(el("h3", null, t.callTitle + (place ? ` · ${place}` : "")));
    if (!place) calls.append(el("p", "hint", t.pickPlace));
    const mine = (RES.operatorsByPlace || {})[place] || {};
    if (place) UTIL.forEach(([k, name]) => {
      const op = (RES.operators || {})[mine[k]];
      if (mine[k] === "none") calls.append(el("p", "hint", `${name}: ${RES.noGas}`));
      else if (op) {
        const a = Object.assign(el("a", "tile-call", `📞 ${op.label}: ${op.name} `), { href: "tel:" + op.tel });
        a.append(el("span", "nowrap", op.phone));
        calls.append(a);
      } else if (RES.operatorUnknown) calls.append(el("p", "hint", `${name}: ${RES.operatorUnknown}`));
    });
    body.append(calls);
    // (c) closest dry shelter: the residents' own shelter search (GPS + data in the app)
    const shelter = el(MODE === "residents" ? "button" : "a", "off-btn off-shelter", t.shelter);
    if (MODE === "residents") {
      shelter.addEventListener("click", () => { $("offline").hidden = true; $("find-shelter").click(); });
    } else shelter.href = "?mode=residents&shelter=1";
    body.append(shelter);
    // (d) the last alerts received on this phone
    const alerts = el("div", "off-group");
    alerts.append(el("h3", null, t.alertsTitle));
    let kept = [];
    try { kept = JSON.parse(store.get("lastAlerts", "[]")) || []; } catch (e) { kept = []; }
    if (!kept.length) alerts.append(el("p", "hint", t.noAlerts));
    const ul = el("ul", "off-alerts");
    kept.forEach((m) => {
      const li = el("li");
      li.append(el("span", "when", (m.from ? m.from + " · " : "") + when(m.time)), el("span", null, m.text));
      ul.append(li);
    });
    if (kept.length) alerts.append(ul);
    body.append(alerts);
    // (e) the "In a flood" card
    const card = el("div", "off-group off-card");
    card.append(el("h3", null, c.title || ""));
    const lines = el("ul");
    (c.lines || []).forEach((x) => lines.append(el("li", null, x)));
    card.append(lines, el("p", "hint", c.source || ""));
    body.append(card);
    // (f) text my location: no recipient, the person picks one; GPS works without internet
    const sms = el("a", "off-btn off-sms");
    smsLink(sms, lastPos);
    body.append(sms, el("p", "hint", t.smsHint));
    if (!lastPos && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        lastPos = [pos.coords.latitude, pos.coords.longitude];
        smsLink(sms, lastPos);
      }, () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 600000 });
    }
    // (g) BE-Alert: official alerts by SMS (the link the residents' sources already use)
    const be = (RES.links || []).find((x) => /be-alert\.be/.test(x.url));
    if (be) {
      body.append(Object.assign(el("a", "off-btn off-bealert", t.beAlert), { href: be.url, target: "_blank", rel: "noopener" }),
        el("p", "hint", t.beAlertHint));
    }
    $("offline").hidden = false;
    $("offline").scrollTop = 0;
  }
  if (ROLES && OFF.en) {
    $("offline-banner").addEventListener("click", openOffline);
    $("off-back").addEventListener("click", () => { $("offline").hidden = true; });
    if (START) {
      $("start-offline").textContent = offText().open;
      $("start-offline").hidden = false;
      $("start-offline").addEventListener("click", openOffline);
    }
    if (WANT_SHELTER) setTimeout(() => $("find-shelter").click(), 400);
  }
  // The note sits on the map (under the zoom and Map/Satellite buttons), so it stays in view while the panel scrolls
  const NetNote = L.Control.extend({
    onAdd() {
      const d = L.DomUtil.create("div", "map-note");
      d.id = "map-note";
      d.hidden = true;
      d.setAttribute("role", "status");
      d.textContent = "🗺️ Background map needs internet";
      return d;
    },
  });
  new NetNote({ position: "topleft" }).addTo(map);
  window.addEventListener("offline", netCheck);
  window.addEventListener("online", () => {
    tilesBroken = false;
    baseLayers.forEach((l) => l.redraw());   // fetch the background map again
    netCheck();
  });
  netCheck();

  // ---- Story mode ----
  // Next/Back on screen or with a presenter clicker. The last step's button says "Done": the card closes
  // and a small "▶ Briefing" pill replays it from step 1.
  const STORY = T.story || [];
  let step = -1;
  function go(i) {
    if (STORY.length === 0) return;
    step = Math.max(0, Math.min(STORY.length - 1, i));
    const s = STORY[step];
    textOr($("story-title"), s.title, "Step " + (step + 1));
    textOr($("story-text"), s.text, "");
    $("story-count").replaceChildren(...STORY.map((_, j) => el("i", j === step ? "on" : j < step ? "done" : null)));
    $("story-count").setAttribute("aria-label", `Step ${step + 1} of ${STORY.length}`);
    $("story-back").disabled = step === 0;
    const last = step === STORY.length - 1;
    $("story-next").textContent = last ? "Done ✓" : "Next ›";
    $("story-next").setAttribute("aria-label", last ? "Close the briefing" : "Next step");
    if (s.layers) {
      // Unknown ids (e.g. the placeholder "example" after real layers were added) are ignored;
      // if none of a step's ids exist, the current layers stay on instead of all disappearing.
      const known = s.layers.filter((id) => registry[id]);
      if (known.length < s.layers.length) {
        console.warn(`Story step ${step + 1}: unknown layer ids`, s.layers.filter((id) => !registry[id]));
      }
      if (known.length > 0 || s.layers.length === 0) LAYERS.forEach((d) => setVisible(d.id, known.includes(d.id)));
    }
    renderLegend();
    if (s.center) viewVisible(s.center, s.zoom ?? map.getZoom(), true);
  }
  function storyOpen(on) {
    $("story").hidden = !on;
    $("story-replay").hidden = on;
  }
  function next() {
    if (step === STORY.length - 1) return storyOpen(false);
    go(step + 1);
  }
  if (STORY.length > 0) {
    storyOpen(true);
    $("story-back").addEventListener("click", () => go(step - 1));
    $("story-next").addEventListener("click", next);
    $("story-replay").addEventListener("click", () => { storyOpen(true); go(0); });
    document.addEventListener("story:start", () => { storyOpen(true); go(0); });
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if ($("story").hidden) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); next(); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(step - 1); }
    });
    go(0);
  }

  // ---- Bottom sheet (phones) ----
  const sheet = $("sheet");
  const ORDER = ["peek", "half", "full"];
  // Room to scroll the panel's last rows into view: half open, its lower part is below the screen edge.
  function updateBelow() {
    const below = sheet.getBoundingClientRect().bottom - sheet.parentElement.getBoundingClientRect().bottom;
    sheet.style.setProperty("--below", `${Math.max(0, Math.round(below))}px`);
  }
  function setState(s) {
    const before = hiddenBottom();
    panelMoving = true;
    sheet.dataset.state = s;
    setTimeout(() => {
      panelMoving = false;
      map.invalidateSize();
      updateBelow();
      // A map move asked for just before or during the slide is redone for the new panel height; otherwise
      // what was in the middle of the visible map stays in the middle.
      if (lastMove && Date.now() - lastMove.at < 1500) lastMove.redo();
      else if (Math.abs(hiddenBottom() - before) > 2) map.panBy([0, (hiddenBottom() - before) / 2]);
    }, 300);
  }
  updateBelow();
  window.addEventListener("resize", updateBelow);
  // A tap anywhere on the folded panel opens it halfway (dragging only works on the handle).
  // (not the handle: its own tap already cycles the panel, and would otherwise reopen it right after folding)
  sheet.addEventListener("click", (e) => {
    if (sheet.dataset.state === "peek" && !e.target.closest("#handle")) setState("half");
  });
  const handle = $("handle");
  let startY = null;
  let startOffset = 0;
  let moved = false;
  handle.addEventListener("pointerdown", (e) => {
    startY = e.clientY;
    startOffset = sheet.getBoundingClientRect().top - sheet.parentElement.getBoundingClientRect().top;
    moved = false;
    sheet.classList.add("dragging");
    handle.setPointerCapture(e.pointerId);
  });
  handle.addEventListener("pointermove", (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    if (Math.abs(dy) > 4) moved = true;
    const parentH = sheet.parentElement.clientHeight;
    const y = Math.max(parentH - sheet.offsetHeight, Math.min(parentH - 80, startOffset + dy));
    sheet.style.transform = `translateY(${y - (parentH - sheet.offsetHeight)}px)`;
  });
  handle.addEventListener("pointerup", (e) => {
    if (startY === null) return;
    sheet.classList.remove("dragging");
    sheet.style.transform = "";
    const dy = e.clientY - startY;
    const i = ORDER.indexOf(sheet.dataset.state);
    if (!moved) setState(ORDER[(i + 1) % ORDER.length]);
    else if (dy < -40) setState(ORDER[Math.min(i + 1, 2)]);
    else if (dy > 40) setState(ORDER[Math.max(i - 1, 0)]);
    startY = null;
  });
})();
