"""Team 4: turn the teammate's precomputed "flood impact card" data into map layers for the policy tool.

Reads teammate/flood-impact-main/app_data (built by their pipeline/build_wallonia.py from the challenge
data + Eurostat GISCO LAU 2021 boundaries) and writes phone-sized layers into template/web/data/src/.
Then run: python3 template/tools/build_layers.py

Order matters: run vesdre_rp_gap.py first (it writes gap_2021_rp100), then this script, which restyles that
layer and removes the flood_2021 / zone_rp100 layers vesdre_rp_gap.py also writes.
"""
# %% Settings
import json
import sys
from pathlib import Path

import geopandas as gpd

HERE = Path(__file__).resolve().parent
AIC = HERE.parents[1]
sys.path.insert(0, str(AIC / "patterns"))
from patterns import export_to_template

APP_DATA = AIC / "teammate-v2" / "flood-impact-main" / "app_data"   # teammate's v2: permanent water removed
TEMPLATE = AIC / "template"
SRC = TEMPLATE / "web" / "data" / "src"
SIMPLIFY_M = 15                                   # metres; keeps layers.js small enough for a phone

DEPTH = {1: ("#9ecae1", "< 0.5 m"), 2: ("#4292c6", "0.5-1.5 m"), 3: ("#2171b5", "1.5-3 m"), 4: ("#08306b", "> 3 m")}
DEPTH_STYLE = {"by": "depth_class", "classes": [{"value": k, "color": c, "label": lab} for k, (c, lab) in DEPTH.items()]}

# %% Municipalities: share of buildings inside the 1-in-100-year zone, tap for the counts
munis = gpd.read_file(APP_DATA / "municipalities.gpkg")
m = munis.assign(**{
    "Municipality": munis["name"],
    "Mapped by EMS": [f"{c:.0%}" + (" (partial: figures cover the mapped part only)" if c < 0.5 else "")
                      for c in munis["coverage"]],
    "Buildings (OBAT)": munis["buildings"].astype(int),
    "In 2021 flood footprint": munis["buildings_flooded_2021"].astype(int),
    "In 1-in-10-year zone": munis["buildings_rp10"].astype(int),
    "In 1-in-100-year zone": munis["buildings_rp100"].astype(int),
    "In 1-in-500-year zone": munis["buildings_rp500"].astype(int),
    "share_rp100": (munis["buildings_rp100"] / munis["buildings"].where(munis["buildings"] > 0)).fillna(0).round(3),
})
props = ["Municipality", "Mapped by EMS", "Buildings (OBAT)", "In 2021 flood footprint",
         "In 1-in-10-year zone", "In 1-in-100-year zone", "In 1-in-500-year zone"]
m["Share in 100-year zone"] = [f"{s:.0%}" for s in m["share_rp100"]]
props.insert(6, "Share in 100-year zone")
# Residents living in the 1-in-100-year zone: two estimates from the teammate's v2 pipeline (Eurostat Census
# 2021 grid and GHS-POP 2020), shown as a low-high range rounded to tens; 65+ from the census grid.
lo = munis[["exp_rp100_pop_census", "exp_rp100_pop_ghs"]].min(axis=1).round(-1)
hi = munis[["exp_rp100_pop_census", "exp_rp100_pop_ghs"]].max(axis=1).round(-1)
m["Residents in 100-year zone"] = [f"about {a:,.0f} - {b:,.0f}" for a, b in zip(lo, hi)]
m["of whom 65+"] = [f"about {v:,.0f}" for v in munis["exp_rp100_pop_65plus_census"].round(-1)]
props += ["Residents in 100-year zone", "of whom 65+"]
export_to_template(m, "municipalities", TEMPLATE, simplify_m=SIMPLIFY_M, columns=props + ["share_rp100"], settings={
    "name": "Municipalities: buildings in the 100-year zone", "order": 1, "props": props,
    "fillOpacity": 0.12, "weight": 1.5,
    "style": {"by": "share_rp100", "bins": [0.05, 0.15, 0.3], "colors": ["#fef0d9", "#fdcc8a", "#fc8d59", "#d7301f"],
              "labels": ["< 5% of buildings", "5-15%", "15-30%", "> 30%"]}})

# %% Scenario layers: EFAS 1-in-10/100/500-year depth classes, one shape per depth class
for order, (rp, visible) in enumerate([(500, False), (100, True), (10, False)], start=2):
    ext = gpd.read_file(APP_DATA / "flood_extents.gpkg", layer=f"rp{rp}")
    ext = ext.dissolve(by="depth_class").reset_index()
    ext["Water depth"] = ext["depth_class"].map(lambda k: DEPTH[k][1])
    export_to_template(ext, f"rp{rp}", TEMPLATE, simplify_m=SIMPLIFY_M, columns=["depth_class", "Water depth"], settings={
        "name": f"1-in-{rp}-year flood (EFAS model)", "order": order, "visible": visible, "props": ["Water depth"],
        "audience": "public",                     # also shown on the residents side
        "fillOpacity": 0.55, "weight": 0, "style": DEPTH_STYLE})

obs = gpd.read_file(APP_DATA / "flood_extents.gpkg", layer="observed_2021").dissolve().reset_index(drop=True)
obs["What"] = "Mapped from satellite, 15 and 17 July 2021 (snapshot, not the peak)"
export_to_template(obs, "observed_2021", TEMPLATE, simplify_m=SIMPLIFY_M, columns=["What"], settings={
    "name": "Flooded in July 2021 (Copernicus EMS)", "order": 5, "color": "#eb6834", "fillOpacity": 0.6, "weight": 0,
    "audience": "public", "props": ["What"]})

# %% Our own layer from vesdre_rp_gap.py: just restyle; drop the layers the teammate's data replaces
cfg_file = SRC / "layers.json"
cfg = json.loads(cfg_file.read_text())
for old in ["flood_2021", "zone_rp100"]:
    (SRC / f"{old}.geojson").unlink(missing_ok=True)
    cfg.pop(old, None)
cfg["gap_2021_rp100"].update({"order": 6, "color": "#6250d6", "fillOpacity": 0.7, "weight": 1, "visible": False})
cfg_file.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n")

# %% River gauges with a GEV analysis (Wallonia, Annexe F). Coordinates: official AQUALIM geoservice.
# Peaks and return periods are read off the Annexe F charts by eye: approximate, check before citing.
GAUGES = [
    # code, place, river, lon, lat (AQUALIM, EPSG:4326), July 2021 peak, GEV return period of that peak
    ("L6790", "Spixhe (Theux)", "Wayai, Vesdre basin", 5.820369, 50.521170, "about 140 m3/s", "about 1 in 150-200 years"),
    ("L5860", "Theux", "Hoegne, Vesdre basin", 5.810561, 50.538125, "about 370 m3/s", "about 1 in 10,000+ years, far outside the record"),
]
gauges = gpd.GeoDataFrame(
    [{"Gauge": f"{place} ({code})", "River": river, "July 2021 peak": peak, "How rare (GEV fit)": rarity,
      "Source": "Wallonia, Annexe F 'Ajustement GEV' (Oct 2021), values read from chart"}
     for code, place, river, _, _, peak, rarity in GAUGES],
    geometry=gpd.points_from_xy([g[3] for g in GAUGES], [g[4] for g in GAUGES]), crs=4326)
export_to_template(gauges, "gauges", TEMPLATE, simplify_m=0, columns=list(gauges.columns.drop("geometry")), settings={
    "name": "River gauges: how rare was July 2021?", "order": 7, "color": "#0b0b0b", "visible": False})

# %% Teammate's v2, policy side only: candidate shelters and main roads/railways under water
# Candidate shelters are NOT official reception centres (those are in municipal emergency plans), so residents never
# see them; planners use them to check which public buildings stay dry. Never labelled "safe".
# Status colours from the dataviz reference palette; each always carries an icon + label (colour-blind safe).
SHELTER = {"Dry: usable": ("#0ca30c", "✓ Dry: usable"), "Wet: upper floors usable": ("#fab219", "↑ Wet: upper floors usable"),
           "Wet: not usable": ("#d03b3b", "✕ Wet: not usable"), "Wet: height unknown": ("#9ca3af", "? Wet: height unknown")}
fac = gpd.read_file(APP_DATA / "facilities.gpkg")
pts = fac.assign(geometry=fac.to_crs(3035).representative_point().to_crs(4326))
pts = pts.assign(**{
    "Name": pts["name"].fillna("(no name)"), "Type": pts["category"],
    "In a 1-in-100-year flood": pts["shelter_rp100"], "In a 1-in-500-year flood": pts["shelter_rp500"],
    "July 2021": pts["shelter_observed_2021"],
    "Building height": [f"{h:.0f} m" if h == h else "unknown" for h in pts["height_m"]],
    "Source": pts["source"],
})
shelter_props = ["Name", "Type", "In a 1-in-100-year flood", "In a 1-in-500-year flood", "July 2021", "Building height", "Source"]
export_to_template(pts, "shelters", TEMPLATE, simplify_m=0, columns=shelter_props + ["shelter_rp100"], settings={
    "name": "Candidate shelters: schools, sports halls, churches, hospitals (not official)", "order": 8, "visible": False, "props": shelter_props, "radius": 5,
    "style": {"by": "shelter_rp100", "classes": [{"value": k, "color": c, "label": lab} for k, (c, lab) in SHELTER.items()]}})

roads = gpd.read_file(APP_DATA / "roads.gpkg", layer="flooded_rp100")
# One shape per road class keeps the phone file small (5,000 pieces -> 4); tap shows the class and total length.
roads = roads.dissolve(by=["mode", "class"], aggfunc={"length_km": "sum"}).reset_index()
roads["Type"] = roads["class"].astype(str)
roads["Name"] = [f"{km:,.0f} km under water in the mapped area" for km in roads["length_km"]]
export_to_template(roads, "roads_rp100", TEMPLATE, simplify_m=SIMPLIFY_M, columns=["Type", "Name", "mode"], settings={
    "name": "Main roads and railways under water (1-in-100-year)", "order": 6, "visible": False,
    "props": ["Type", "Name"], "weight": 3,
    "style": {"by": "mode", "classes": [{"value": "Road", "color": "#1baf7a", "label": "Road"},
                                        {"value": "Railway", "color": "#52514e", "label": "Railway"}]}})
print("Layers written; now run: python3 template/tools/build_layers.py")
