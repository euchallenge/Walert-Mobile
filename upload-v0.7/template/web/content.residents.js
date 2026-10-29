// Residents side of the app (switch in the header). Rules, as for the public edition:
//   - only public information, each with a source; relay official advice and link to it
//   - never say "safe", never issue a warning of our own; demo alerts are labelled DEMO
//   - no shelter locations: none are in the challenge data, and only authorities can name them
window.TOOL_RESIDENTS = {
  title: "Flood zones near you",
  subtitle: "Where rivers can flood, and where they flooded in July 2021. Always follow official alerts.",

  numbers: [],           // no internal numbers on the residents side
  recommendation: null,  // no policy recommendation on the residents side

  residents: {
    // Every time the residents side opens: the 18 s animation (skippable), then this one-screen card.
    // From the National Crisis Centre page "Inondation pluviale" (accessed 29 Oct 2026), in plain words.
    // Videos are made in motion/ (Remotion); a language appears only once its video exists.
    videos: { en: "media/essentials-en.mp4" },
    languages: [["en", "EN"], ["fr", "FR"], ["nl", "NL"], ["de", "DE"]],
    // The 3 most important lines (the full list is in the animation and the links below).
    essentials: [
      "📞 Life in danger? Call 112",
      "🌊 Stay away from fast-flowing water",
      "🧭 Follow the emergency services' instructions",
    ],
    essentialsSource: "Source: National Crisis Centre, centredecrise.be, 'Inondation pluviale' (accessed 29 Oct 2026).",
    // Status tiles: only an authority sets them (via the policy side); grey until then.
    statusLabels: {
      ok: "OK to use",
      restricted: "Restricted: read the note",
      no: "Do not use",
      none: "No information yet: follow your municipality",
    },
    messageTitle: "DEMO message from authorities",
    // Short official advice, quoted from the National Crisis Centre (links below).
    advice: [
      "Life in danger: call 112.",
      "During an evacuation, follow the instructions of the emergency services.",
      "Shelters and evacuation points are announced by your municipality and the authorities, not by this app.",
      "Sign up to BE-Alert to get official alerts for your address.",
    ],
    links: [
      { text: "BE-Alert: sign up for official alerts", url: "https://www.be-alert.be/" },
      { text: "National Crisis Centre", url: "https://centredecrise.be/fr" },
      { text: "Crisis Centre: flooding questions and answers", url: "https://centredecrise.be/fr/questions-frequemment-posees-sur-les-inondations" },
      { text: "Crisis Centre: 'Prêts. Ensemble.' preparedness guide (PDF)", url: "https://centredecrise.be/sites/default/files/documents/files/WEB-Brochure-Pr%C3%AAts.%20Ensemble-FR.pdf" },
      { text: "RMI weather warnings", url: "https://www.meteo.be/fr/belgique" },
      { text: "Wallonia river levels (hydrometrie)", url: "https://hydrometrie.wallonie.be/" },
    ],
    demoAlert: {
      title: "DEMO - not a real alert",
      text: "Example of an official flood alert. In a real event, BE-Alert and your municipality send these, with instructions on where to go.",
    },
  },

  limits: [
    "This map does not show every risk: small streams and flash floods are not modelled.",
    "The July 2021 layer is a satellite snapshot after the peak; real flooding was wider in narrow valleys.",
    "Always follow official alerts (BE-Alert) and the instructions of your municipality.",
    "DEMO: messages and water/electricity/gas status come from a demo server and arrive only while the app is open.",
    "Your location is only used on this phone to find your municipality and the closest candidate shelters; it is never sent anywhere.",
  ],

  sources: [
    { text: "EFAS river flood hazard maps, 10/100/500-year (JRC)", url: "https://data.jrc.ec.europa.eu/collection/id-0054" },
    { text: "Copernicus EMS Rapid Mapping, EMSR518 Belgium, July 2021", url: "https://mapping.emergency.copernicus.eu/activations/EMSR518/" },
    { text: "National Crisis Centre, flood advice (accessed 29 Oct 2026)", url: "https://centredecrise.be/fr/questions-frequemment-posees-sur-les-inondations" },
  ],

  story: [],

  map: {
    center: [50.5, 5.55],  // the area our data covers (Liège–Meuse, Ourthe, Lesse)
    zoom: 9,
    basemap: "gray",
    fitLayers: false,
  },
};
