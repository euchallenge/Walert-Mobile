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

  function textOr(node, value, placeholder) {
    node.textContent = value || placeholder;
    node.classList.toggle("placeholder", !value);
  }

  // ---- Panel content ----
  textOr($("title"), T.title, "Policy tool title");
  textOr($("subtitle"), T.subtitle, "One sentence: what this shows and for whom");
  if (T.title) document.title = T.title;

  (T.numbers || []).forEach((n, i) => {
    const box = el("div", "number");
    const v = el("div", "value");
    textOr(v, n.value, "—");
    const l = el("div", "label");
    textOr(l, n.label, "Key number " + (i + 1));
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

  // Optional small label under the title (e.g. "Draft" while testing); none when empty.
  if (T.badge) $("title").after(el("span", "edition", T.badge));

  if (T.recommendation === null) document.querySelector("section.rec").hidden = true;
  if (Array.isArray(T.numbers) && T.numbers.length === 0) $("numbers").closest("section").hidden = true;
  const rec = T.recommendation || {};
  textOr($("rec-actor"), rec.actor, "Named actor (who must act)");
  textOr($("rec-action"), rec.action, "What they should do, specifically");
  textOr($("rec-why"), rec.why, "Why: link to the numbers above");

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
  function speak(text) {
    const plain = String(text).replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}️]/gu, "").trim();
    if (!plain) return;
    if (window.AndroidBridge && window.AndroidBridge.speak) return window.AndroidBridge.speak(plain);
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(plain));
    }
  }

  // Easy read (residents): bigger text, strong contrast, fewer panels, everything read aloud.
  // Chosen on the start screen (?easy=1) or with the "Aa" button; remembered on this phone.
  let easy = false;
  function setEasy(on) {
    easy = on;
    store.set("easy", on ? "1" : "0");
    document.body.classList.toggle("easy", on);
    $("easy-toggle").setAttribute("aria-pressed", String(on));
  }
  // Policy side: quick info before the map, on the first open (then via "? How it works").
  if (MODE === "policy" && T.intro) {
    $("intro-title").textContent = T.intro.title || "";
    (T.intro.steps || []).forEach((s) => $("intro-steps").append(el("li", null, s)));
    $("help-btn").hidden = false;
    $("help-btn").addEventListener("click", () => { $("intro").hidden = false; });
    $("intro-close").addEventListener("click", () => {
      $("intro").hidden = true;
      store.set("introSeen", "1");
    });
    // Not behind the start screen; on the policy side's first open on this device.
    if (asked === "policy" && store.get("introSeen", "0") !== "1") $("intro").hidden = false;
  }

  if (MODE === "residents" && ROLES) {
    $("easy-toggle").hidden = false;
    $("easy-toggle").addEventListener("click", () => setEasy(!easy));
    setEasy(new URLSearchParams(location.search).get("easy") === "1" || store.get("easy", "0") === "1");
  }

  // ---- Essentials, every time the residents side opens (people forget in a crisis) ----
  // The 18 s animation (motion/, muted, skippable at any moment), then a one-screen card.
  // Reduced motion, no video for the language, or any playback problem -> straight to the card.
  if (R && R.essentials) {
    R.essentials.forEach((t) => $("essentials-list").append(el("li", null, t)));
    $("essentials-source").textContent = R.essentialsSource || "";
    const videos = R.videos || {};
    const video = $("ess-video");
    const reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cardText = () => [...$("essentials-list").children].map((li) => li.textContent).join(". ");
    function showCard() {
      video.pause();
      $("ess-video-wrap").hidden = true;
      $("ess-card").hidden = false;
      if (easy) speak(cardText());
    }
    $("ess-read").addEventListener("click", () => speak(cardText()));
    // A/B test: the "text" build (variant.js) goes straight to the 3-line card.
    const textOnly = window.TOOL_VARIANT === "text";
    if (textOnly) $("lang-row").hidden = true;
    function play(lang) {
      if (!videos[lang] || reduced || textOnly) return showCard();
      store.set("lang", lang);
      [...$("lang-row").children].forEach((b) => b.classList.toggle("active", b.dataset.lang === lang));
      $("ess-card").hidden = true;
      $("ess-video-wrap").hidden = false;
      video.src = videos[lang];
      video.play().catch(showCard);
    }
    (R.languages || []).forEach(([code, name]) => {
      const b = el("button", "lang", name);
      b.dataset.lang = code;
      if (!videos[code]) { b.disabled = true; b.title = "Coming soon"; }
      b.addEventListener("click", () => play(code));
      $("lang-row").append(b);
    });
    video.addEventListener("ended", showCard);
    video.addEventListener("error", showCard);
    $("ess-skip").addEventListener("click", showCard);
    $("essentials-close").addEventListener("click", () => { video.pause(); $("essentials").hidden = true; });
    function openEssentials() {
      $("essentials").hidden = false;
      const saved = store.get("lang", "en");
      play(videos[saved] ? saved : "en");   // English is the default for now
    }
    $("show-essentials").addEventListener("click", openEssentials);
    openEssentials();
  } else {
    $("show-essentials").hidden = true;
  }

  // ---- Demo server: verified messages + water/electricity/gas status (tools/relay_server.py) ----
  // DEMO ONLY: the laptop runs the relay; phones reach it over USB through `adb reverse`.
  const UTIL = [["water", "💧 Water"], ["electricity", "⚡ Electricity"], ["gas", "🔥 Gas"]];
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
      $("big3").scrollIntoView({ behavior: "smooth", block: "start" });
    });
    const label = R.statusLabels || {};
    fillPlaces($("my-place"), store.get("myPlace", ""), "Choose…");
    let statusAll = {};
    function renderTiles() {
      const s = statusAll[$("my-place").value];
      $("tiles").replaceChildren(...UTIL.map(([k, name]) => {
        const state = s ? s[k] : "none";
        const tile = el("div", "tile " + state);
        tile.append(el("div", "tile-name", name), el("div", "tile-state", label[state] || state));
        return tile;
      }));
      $("status-note").textContent = s ? `${s.note ? s.note + " · " : ""}Set by the authorities (DEMO), ${when(s.time)}` : "";
    }
    $("my-place").addEventListener("change", () => { store.set("myPlace", $("my-place").value); renderTiles(); });
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
        (m.data.messages || []).forEach((msg) => {
          $("inbox-list").querySelector(".placeholder")?.remove();
          const li = el("li");
          li.append(el("span", "when", when(msg.time)), el("span", null, msg.text));
          $("inbox-list").prepend(li);
          after = Math.max(after, msg.id);
          if (msg.id > seen && !(firstOpen && !pollCount)) {
            notify(R.messageTitle || "Message", msg.text);
            if (easy) speak("Message from the authorities. " + msg.text);
          }
        });
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
          notify(R.messageTitle || "Status", summary);
          if (easy) speak(summary.replace(/ · /g, ". "));
        }
      } catch (e) {
        relayState(false);
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
    UTIL.forEach(([k, name]) => {
      const sel = el("select");
      sel.id = "set-" + k;
      [["ok", "OK to use"], ["restricted", "Restricted"], ["no", "Do not use"]]
        .forEach(([v, t]) => sel.append(Object.assign(el("option", null, t), { value: v })));
      const field = el("label", "field", name + " ");
      field.append(sel);
      $("set-row").append(field);
    });
    // The code is kept for this session only and checked by the relay, never stored in the app.
    try { $("code").value = sessionStorage.getItem("relayCode") || ""; } catch (e) { /* storage blocked */ }
    $("code").addEventListener("change", () => {
      try { sessionStorage.setItem("relayCode", $("code").value); } catch (e) { /* storage blocked */ }
    });
    function result(text, ok) {
      $("send-result").textContent = text;
      $("send-result").classList.toggle("off", !ok);
    }
    async function send(path, body, okText) {
      try {
        const r = await api(path, { code: $("code").value, ...body });
        relayState(true);
        if (r.ok) result(okText, true);
        else result(r.status === 403 ? "Refused: wrong verification code." : (r.data.error || "Refused."), false);
      } catch (e) {
        relayState(false);
        result("Not sent: demo server not reachable.", false);
      }
    }
    $("send-msg").addEventListener("click", () => send("/api/messages", { text: $("msg").value }, "Sent to residents (DEMO)."));
    $("send-status").addEventListener("click", () => {
      if (!$("set-place").value) return result("Choose a municipality first.", false);
      send("/api/status", {
        municipality: $("set-place").value, note: $("set-note").value,
        ...Object.fromEntries(UTIL.map(([k]) => [k, $("set-" + k).value])),
      }, `Status updated for ${$("set-place").value} (DEMO).`);
    });
    api("/api/messages?after=999999999").then((r) => relayState(r.ok)).catch(() => relayState(false));

    // Crisis chat between policy makers (mayors, province, crisis centre). Private: reading needs the code.
    // Senders are roles/places, never personal names.
    $("chat").hidden = false;
    const from = $("chat-from");
    [...PLACES.map((p) => `Mayor of ${p} (demo)`), "Province of Liège (demo)", "Crisis centre (demo)"]
      .forEach((s) => from.append(Object.assign(el("option", null, s), { value: s })));
    from.value = store.get("chatFrom", from.value);
    from.addEventListener("change", () => store.set("chatFrom", from.value));
    function chatResult(text, ok) {
      $("chat-result").textContent = text;
      $("chat-result").classList.toggle("off", !ok);
    }
    let chatAfter = 0;
    let chatLoaded = false;
    async function pollChat() {
      if (!$("code").value) return chatResult("Enter the verification code above to join the chat.", false);
      try {
        const r = await api("/api/chat/list", { code: $("code").value, after: chatAfter });
        if (r.status === 403) return chatResult("Wrong verification code: chat closed.", false);
        relayState(true);
        chatResult("", true);
        (r.data.chat || []).forEach((m) => {
          const li = el("li", m.from === from.value ? "mine" : null);
          li.append(el("span", "when", `${m.from} · ${when(m.time)}`), el("span", null, m.text));
          $("chat-list").append(li);
          li.scrollIntoView({ block: "nearest" });
          if (chatLoaded && m.from !== from.value) notify("Crisis chat: " + m.from, m.text);
          chatAfter = Math.max(chatAfter, m.id);
        });
        chatLoaded = true;
      } catch (e) {
        relayState(false);
      }
    }
    async function sendChat() {
      const text = $("chat-text").value;
      if (!text.trim()) return;
      try {
        const r = await api("/api/chat", { code: $("code").value, from: from.value, text });
        if (!r.ok) return chatResult(r.status === 403 ? "Refused: wrong verification code." : (r.data.error || "Refused."), false);
        $("chat-text").value = "";
        pollChat();
      } catch (e) {
        chatResult("Not sent: demo server not reachable.", false);
      }
    }
    $("chat-btn").addEventListener("click", sendChat);
    $("chat-text").addEventListener("keydown", (e) => { if (e.key === "Enter") sendChat(); });
    $("code").addEventListener("change", pollChat);
    pollChat();
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

  const BASEMAPS = {
    osm: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors', 19],
    gray: ["https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
      "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors", 16],
  };
  const base = BASEMAPS[mapCfg.basemap];
  if (base) L.tileLayer(base[0], { attribution: base[1], maxZoom: base[2] }).addTo(map);

  function showSelected(layerDef, props) {
    const dl = $("selected-props");
    dl.replaceChildren();
    const keys = layerDef.props && layerDef.props.length ? layerDef.props : Object.keys(props);
    dl.append(el("dt", null, "Layer"), el("dd", null, layerDef.name));
    keys.forEach((k) => {
      if (props[k] === undefined || props[k] === null || props[k] === "") return;
      dl.append(el("dt", null, k), el("dd", null, String(props[k])));
    });
    $("selected").hidden = false;
    if (sheet.dataset.state === "peek") setState("half");
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
  function renderLegend() {
    const box = legend.getContainer();
    box.replaceChildren();
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
  function showShelters(lat, lon) {
    const list = closestShelters(lat, lon, 3);
    $("shelter-list").replaceChildren();
    shelterMarks.clearLayers();
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
      li.append(el("strong", null, name), el("span", null, ` · ${s.p.Type} · ${km}`));
      // Phone: geo: opens the maps app (Android wrapper hands it over). Browser: OpenStreetMap.
      const a = el("a", "maps-link", "Open in Maps");
      a.href = window.AndroidBridge
        ? `geo:${s.lat},${s.lon}?q=${s.lat},${s.lon}(${encodeURIComponent(name)})`
        : `https://www.openstreetmap.org/?mlat=${s.lat}&mlon=${s.lon}#map=17/${s.lat}/${s.lon}`;
      a.target = "_blank";
      a.rel = "noopener";
      li.append(a);
      $("shelter-list").append(li);
      shelterMarks.addLayer(L.circleMarker([s.lat, s.lon], { radius: 9, color: "#fff", weight: 3, fillColor: "#0ca30c", fillOpacity: 1 })
        .bindTooltip(`${i + 1}. ${name}`));
    });
    shelterMarks.addTo(map);
    map.fitBounds(shelterMarks.getLayers().map((m) => m.getLatLng()), { padding: [40, 40], maxZoom: 15 });
  }
  if (MODE === "residents" && ROLES) {
    $("find-shelter").addEventListener("click", () => {
      $("shelter-box").hidden = false;
      if (sheet.dataset.state === "peek") setState("half");
      $("shelter-box").scrollIntoView({ behavior: "smooth", block: "start" });
      if (lastPos) return showShelters(lastPos[0], lastPos[1]);
      if (!navigator.geolocation) {
        $("shelter-note").textContent = "Location is not available on this device.";
        offerDemo();
        return;
      }
      $("shelter-note").textContent = "📍 Finding your location…";
      navigator.geolocation.getCurrentPosition(
        (pos) => { lastPos = [pos.coords.latitude, pos.coords.longitude]; showShelters(lastPos[0], lastPos[1]); },
        () => { $("shelter-note").textContent = "Location not allowed or not found. Follow your municipality and BE-Alert."; offerDemo(); },
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
      $("shelter-note").textContent = `DEMO location: ${DEMO_PLACE.name}. Distances are as the crow flies.`;
      if (sheet.dataset.state === "peek") setState("half");
    });
  }

  // ---- Story mode ----
  const STORY = T.story || [];
  let step = -1;
  function go(i) {
    if (STORY.length === 0) return;
    step = Math.max(0, Math.min(STORY.length - 1, i));
    const s = STORY[step];
    textOr($("story-title"), s.title, "Step " + (step + 1));
    textOr($("story-text"), s.text, "");
    $("story-count").textContent = `${step + 1} / ${STORY.length}`;
    $("story-back").disabled = step === 0;
    $("story-next").disabled = step === STORY.length - 1;
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
    if (s.center) map.flyTo(s.center, s.zoom ?? map.getZoom(), { duration: 1.2 });
  }
  if (STORY.length > 0) {
    $("story").hidden = false;
    $("story-back").addEventListener("click", () => go(step - 1));
    $("story-next").addEventListener("click", () => go(step + 1));
    document.addEventListener("keydown", (e) => {
      if (e.target.closest("input, textarea, select")) return;
      if (["ArrowRight", "PageDown", " "].includes(e.key)) { e.preventDefault(); go(step + 1); }
      if (["ArrowLeft", "PageUp"].includes(e.key)) { e.preventDefault(); go(step - 1); }
    });
    go(0);
  }

  // ---- Bottom sheet (phones) ----
  const sheet = $("sheet");
  const ORDER = ["peek", "half", "full"];
  function setState(s) {
    sheet.dataset.state = s;
    setTimeout(() => map.invalidateSize(), 260);
  }
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
