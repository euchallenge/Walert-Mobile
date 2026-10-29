// Policy tool template: renders content.js into the panel and data/layers.js onto the map.
// No analysis happens here; numbers and layers come from the team's own work.
(function () {
  "use strict";
  const T = window.TOOL || {};
  const LAYERS = window.TOOL_LAYERS || [];
  const $ = (id) => document.getElementById(id);

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
    if (n.check || window.TOOL_AUDIENCE !== "public") {
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
