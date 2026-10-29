// Everything the panel shows. Fill this in at the event; leave a field "" to show a placeholder.
// Every number needs a source (dataset file or URL + date) so the jury can trace it.
window.TOOL = {
  title: "",       // e.g. the tool's name
  subtitle: "",    // one sentence: what it shows and for whom
  badge: "",       // optional small label under the title, e.g. "Draft"; "" = none

  // "check" = how the number was verified (e.g. "recomputed independently in notebook cell 12").
  numbers: [
    { value: "", label: "", source: "", check: "" },
    { value: "", label: "", source: "", check: "" },
    { value: "", label: "", source: "", check: "" },
  ],

  recommendation: {
    actor: "",   // a NAMED actor, e.g. an agency, a minister, a unit
    action: "",  // what they should do, specific
    why: "",     // one line linking it to the numbers above
  },

  limits: [
    // "What the data cannot show, in one line each",
  ],

  sources: [
    // { text: "Dataset or page name, version, date", url: "https://..." },
  ],

  // Story mode: steps for the live demo. Next/Back on screen, or → / Space / PageDown and ← / PageUp
  // (presenter clickers send those). Each step moves the map; "layers" lists the layer ids shown
  // (leave it out to keep the current ones). An empty list hides the story card.
  story: [
    { title: "Step 1", text: "What the audience should see first", center: [50.6, 4.6], zoom: 7, layers: ["example"] },
    { title: "Step 2", text: "Zoom to where it matters, one line on why", center: [50.84, 4.36], zoom: 11, layers: ["example"] },
  ],

  map: {
    center: [50.6, 4.6],  // [lat, lon]
    zoom: 7,
    // "osm" = OpenStreetMap tiles, "gray" = Esri light gray (calmer under coloured layers),
    // "none" = no basemap. Both basemaps need internet; layers and panel work offline.
    basemap: "osm",
    fitLayers: false,     // true = zoom to the layers instead of center/zoom
  },
};
