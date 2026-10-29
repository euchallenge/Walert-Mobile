// Public (consumer) edition. Used ONLY by tools/build_public.py, which ships this file instead of
// content.js. Nothing in content.js (the internal/policy edition) reaches the public build.
// Fill this in only once the internal edition is tested and someone has agreed what may be shown.
// Rules for this file:
//   - only information that is already public or cleared for release, each with a source
//   - relay official warnings (link to them); never say "safe" or issue a warning of your own
//   - no recommendation to authorities, no internal numbers, no names of people
window.TOOL = {
  title: "",
  subtitle: "",

  numbers: [
    // { value: "", label: "", source: "" },
  ],

  recommendation: null,  // the public edition has no policy recommendation; the section is hidden

  limits: [
    // "This map does not show every risk. Always follow official alerts (e.g. BE-Alert).",
  ],

  sources: [
    // { text: "Official source, date", url: "https://..." },
  ],

  story: [],

  map: {
    center: [50.6, 4.6],
    zoom: 7,
    basemap: "osm",
    fitLayers: false,
  },
};
