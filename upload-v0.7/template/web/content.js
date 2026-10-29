// Everything the panel shows. Fill this in at the event; leave a field "" to show a placeholder.
// Every number needs a source (dataset file or URL + date) so the jury can trace it.
window.TOOL = {
  title: "Beyond the 100-year line",       // e.g. the tool's name
  subtitle: "Where July 2021 flooded compared with the official flood models: Liège–Meuse, Ourthe and Lesse valleys (Wallonia)", // one sentence: what it shows and for whom
  badge: "v0.7 - Team 4",       // optional small label under the title, e.g. "Draft"; "" = none

  // Quick info before the map (policy side): first open, then the "? How it works" button.
  intro: {
    title: "This app in 30 seconds",
    steps: [
      "🗺️ The map compares where July 2021 flooded (orange) with the official 1-in-100-year flood zone (blue).",
      "👆 Tap a municipality: buildings and residents in flood zones, and how many were hit in 2021.",
      "▶️ Press Next on the story card for a 4-step briefing.",
      "🧭 In Layers, switch on candidate shelters and roads under water.",
      "📣 Further down: inform residents (message, water/electricity/gas) and the crisis chat with other mayors, using your verification code.",
    ],
  },

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
    "The 2021 flood map is a satellite snapshot (15 and 17 July), not the peak, and misses water in narrow urban valleys such as the Vesdre.",
    "Copernicus mapped only two areas in Belgium; outside them \"not flooded\" means \"not mapped\".",
    "The building data (GHS-OBAT) undercounts buildings in the Belgian flood areas: building counts are a lower bound.",
    "The EFAS flood model leaves out rivers draining less than 500 km² and was run on 1990-2016 data.",
    "A building counts as exposed when its point lies in the flooded area; water depth is assumed to be in metres.",
    "Return periods describe how rare a flood is; they are not forecasts of when the next one comes.",
    "DEMO messaging: a shared code stands in for real identity checks (e.g. eID/itsme); in reality alerts go through BE-Alert.",
    "Candidate shelters are public buildings (schools, sports halls and stadiums, churches, hospitals), not official reception centres. Residents only get the closest dry schools, halls and churches, never hospitals, with a "not official" warning. Some stadiums and sports centres are open-air: check before using one.",
    "EFAS flood zones ignore dykes and walls; residents counts are a range from two population sources.",
  ],

  sources: [
    // { text: "Dataset or page name, version, date", url: "https://..." },
    { text: "Copernicus EMS Rapid Mapping, EMSR518 Belgium (challenge data)", url: "https://mapping.emergency.copernicus.eu/activations/EMSR518/" },
    { text: "EFAS river flood hazard maps, 10/100/500-year (challenge data)", url: "https://data.jrc.ec.europa.eu/collection/id-0054" },
    { text: "GHS-OBAT R2024A buildings (challenge data)", url: "https://data.jrc.ec.europa.eu/dataset/f41a22f1-5741-4c41-86eb-6384654f6927" },
    { text: "External: Eurostat GISCO LAU 2021 municipality boundaries", url: "https://gisco-services.ec.europa.eu/distribution/v2/lau/" },
    { text: "External: Eurostat Census 2021 1 km grid (residents, age groups)", url: "https://ec.europa.eu/eurostat/web/gisco/geodata/population-distribution/population-grids" },
    { text: "External: candidate shelters © OpenStreetMap contributors (ODbL) + Copernicus EMS", url: "https://www.openstreetmap.org/copyright" },
    { text: "External: Infrabel main railway tracks (CC0) + Copernicus EMS roads", url: "https://opendata.infrabel.be/" },
    { text: "External: Wallonia, Annexe F 'Ajustement GEV' river gauges, Oct 2021", url: "https://www.wallonie.be/sites/default/files/2021-10/annexe_f_-_analyse_gev.pdf" },
    { text: "External: Wallonia AQUALIM gauge network (station locations)", url: "https://geoservices.wallonie.be/arcgis/rest/services/EAU/RES_LIMNI_DGARNE/MapServer" },
  ],

  // Story mode: steps for the live demo. Next/Back on screen, or → / Space / PageDown and ← / PageUp
  // (presenter clickers send those). Each step moves the map; "layers" lists the layer ids shown
  // (leave it out to keep the current ones). An empty list hides the story card.
  story: [
    // Triangle BE-NL-DE (Liege - Maastricht - Aachen). Replace text with checked numbers only.
    { title: "1 · July 2021", text: "Where the water was, as mapped from satellite (Copernicus EMS)", center: [50.5, 5.55], zoom: 9, layers: ["municipalities", "observed_2021"] },
    { title: "2 · What the model expected", text: "The 1-in-100-year flood zone and its water depth (EFAS)", center: [50.5, 5.55], zoom: 9, layers: ["observed_2021", "rp100"] },
    { title: "3 · The gap", text: "Flooded in 2021, outside the 100-year zone: Visé on the Meuse", center: [50.74, 5.69], zoom: 12, layers: ["rp100", "gap_2021_rp100"] },
    { title: "4 · Beyond the record", text: "On the Vesdre, the July 2021 peak was far rarer than any 100-year planning line", center: [50.53, 5.81], zoom: 12, layers: ["municipalities", "gauges"] },
  ],

  map: {
    center: [50.5, 5.55],  // [lat, lon] the area our data covers (Liège–Meuse, Ourthe, Lesse)
    zoom: 9,
    // "osm" = OpenStreetMap tiles, "gray" = Esri light gray (calmer under coloured layers),
    // "none" = no basemap. Both basemaps need internet; layers and panel work offline.
    basemap: "gray",
    fitLayers: false,     // true = zoom to the layers instead of center/zoom
  },
};
