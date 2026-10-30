"""Team 4: the teammate's "flood impact card" numbers for every municipality and scenario, for walert's policy panel.

Reads teammate-last/flood-impact-main/app_data (their latest export, "flood-impact-main last.zip": their pipeline's
precomputed outputs from the challenge data + external sources listed in their README; compared with v3 it updates
access.parquet and facilities.gpkg and adds risks.parquet, routes.parquet and dams.gpkg) and writes, in template/web/data/:
  impact.js            window.TOOL_IMPACT: one card per municipality x scenario, the tables of their tabs (shelters,
                       population, roads, compare with 2021, buildings), region totals and the three key numbers
  impact_map.js        window.TOOL_IMPACT_MAP: per municipality, flooded roads/rail, access points, 250 m building
                       squares and shelter footprints; plus the residents' 1-in-500 squares (fewer than 5 = no count)
  risks.js             window.TOOL_RISKS: their priority issues per municipality x scenario (🔴/🟠/🟡 from their
                       screening thresholds, pipeline/build_risks.py), shown instead of an empty recommendation
  impact_buildings.js  window.TOOL_IMPACT_BUILDINGS: exposed buildings as points (admin view only: loaded after the
                       verification code; no ids, no addresses)

Every figure uses the same expression as their Streamlit admin view (app/app.py, line numbers below), so the two
tools agree. impact.js and impact_map.js hold only aggregates and named public buildings (their privacy rule); building points go
to impact_buildings.js, which the residents side never loads.

    uv pip install --python .venv/bin/python pyarrow     # once: buildings.parquet / access.parquet
    .venv/bin/python work/analysis/build_impact.py
"""
# %% Settings
import json
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
AIC = HERE.parents[1]
APP_DATA = AIC / "teammate-last" / "flood-impact-main" / "app_data"
OUT_DIR = AIC / "template" / "web" / "data"
OUT = OUT_DIR / "impact.js"

SCENARIOS = ["rp10", "rp100", "rp500", "observed_2021"]
SUSPECT_DEPTH_M = 10                               # app.py: deeper cells are likely river channel or artefacts
HEIGHT_FLOOR_M = 2.5                               # app.py: OBAT minimum height, not a measured value
USABLE = ["Dry: usable", "Wet: upper floors usable", "Dry in 2021"]          # app.py l.179
STATUS_ORDER = {s: i for i, s in enumerate(USABLE + ["Wet: height uncertain", "Wet: not usable", "Flooded in 2021"])}
MIN_FLOODED_FOR_SHARE = 30                         # app.py l.383: below that a percentage is noise


def num(x, nd=0):
    """numpy -> plain JSON number (None for NaN)."""
    if x is None or (isinstance(x, float) and np.isnan(x)) or pd.isna(x):
        return None
    return int(round(float(x))) if nd == 0 else round(float(x), nd)


# %% Load (columns the cards need; no building geometry)
munis = gpd.read_file(APP_DATA / "municipalities.gpkg").drop(columns="geometry")
buildings = gpd.read_parquet(APP_DATA / "buildings.parquet", columns=[
    "LAU_ID", "height", "depth_rp10", "depth_rp100", "depth_rp500", "flooded_2021", "use", "epoch", "ems_category",
    "pop_census", "pop_ghs", "pop_65plus_census", "pop_lt15_census", "geometry"])
fac_geo = gpd.read_file(APP_DATA / "facilities.gpkg").to_crs(4326)
facilities = fac_geo.drop(columns="geometry")
roads = pd.read_parquet(APP_DATA / "roads_stats.parquet")
access_geo = gpd.read_parquet(APP_DATA / "access.parquet").to_crs(4326)
access = access_geo.drop(columns="geometry")
meta = json.loads((APP_DATA / "metadata.json").read_text(encoding="utf-8"))
print(f"{len(munis)} municipalities, {len(buildings):,} buildings, {len(facilities):,} facilities")


# %% One card
def card(muni, key):
    observed = key == "observed_2021"
    name = muni["name"]
    b = buildings[buildings["LAU_ID"] == muni["LAU_ID"]]
    exposed = b["flooded_2021"] if observed else b[f"depth_{key}"] > 0                       # l.136
    exp = b[exposed]
    c = {"flooded_km2": num(muni[f"{key}_km2"], 2), "buildings": len(b), "exposed": len(exp),
         "share": num(len(exp) / max(len(b), 1), 4)}                                             # l.154-158
    warn = []
    if muni["coverage"] < 0.99:                                                                  # l.145-152
        warn.append(f"Copernicus EMS mapped {muni['coverage']:.0%} of {name}. All figures refer to that part only.")
    if observed:
        warn.append("Satellite-detected flooding only (radar, 15 and 17 July 2021). This is a lower bound: most of "
                    "the Vesdre valley flooding was not captured.")
    elif muni["rp500_km2"] == 0:
        warn.append(f"EFAS models no river in the mapped part of {name}. 0 means 'not modelled', not 'no flood "
                    "risk': small streams and surface runoff are not covered.")
    c["warnings"] = warn
    if not observed:                                                                             # l.162-165
        depth = exp[f"depth_{key}"]
        c["deep"] = int(((depth > 1.5) & (depth <= SUSPECT_DEPTH_M)).sum())
        c["artefact"] = int((depth > SUSPECT_DEPTH_M).sum())
    uncertain = exp["height"].isna() | (exp["height"] <= HEIGHT_FLOOR_M)                          # l.166-168
    c["height_uncertain"] = num(uncertain.mean(), 3) if len(exp) else None
    lo, hi = sorted([exp["pop_census"].sum(), exp["pop_ghs"].sum()])                              # l.174-177
    c["people"] = [num(lo), num(hi)]
    c["age65"] = num(exp["pop_65plus_census"].sum())
    c["under15"] = num(exp["pop_lt15_census"].sum())
    c["age80"] = num(muni[f"exp_{key}_pop_census"] * muni["share_80plus"])                        # l.341
    fac = facilities[facilities["LAU_ID"] == muni["LAU_ID"]]                                      # l.170-183
    c["shelters"] = len(fac)
    c["shelters_usable"] = int(fac[f"shelter_{key}"].isin(USABLE).sum())
    c["capacity"] = num(fac[f"capacity_{key}"].sum())
    top = fac.assign(order=fac[f"shelter_{key}"].map(STATUS_ORDER).fillna(9),
                     cap=fac[f"capacity_{key}"].fillna(0)).sort_values(["order", "cap"], ascending=[True, False])
    c["top"] = [{"name": r["name"] or r["category"], "type": r["category"], "status": r[f"shelter_{key}"],
                 "capacity": num(r[f"capacity_{key}"]), "prm": r[f"prm_{key}"]} for _, r in top.head(5).iterrows()]
    km = roads[roads["LAU_ID"] == muni["LAU_ID"]].groupby("mode")[f"flooded_km_{key}"].sum()      # l.187-192
    c["road_km"], c["rail_km"] = num(km.get("Road", 0), 1), num(km.get("Railway", 0), 1)
    acc = access[(access["LAU_ID"] == muni["LAU_ID"]) & (access[f"pop_exposed_{key}"] > 0)]      # l.196-205
    c["no_route"] = num(acc.loc[acc[f"shelter_{key}"] < 0, f"pop_exposed_{key}"].sum())
    c["in_flood_cells"] = num(acc[f"pop_exposed_{key}"].sum())
    walk, prm = acc[f"walk_min_{key}"].dropna(), acc[f"prm_min_{key}"].dropna()
    c["walk_min"] = num(walk.median()) if len(walk) else None
    c["prm_min"] = num(prm.median()) if len(prm) else None
    if not observed:                                                                             # l.371-386
        flooded = b["flooded_2021"]
        wet = b[f"depth_{key}"] > 0
        c["flooded_2021"] = int(flooded.sum())
        c["missed_2021"] = int((~wet & flooded).sum())
        c["missed_share"] = (num(c["missed_2021"] / flooded.sum(), 3)
                             if flooded.sum() >= MIN_FLOODED_FOR_SHARE else None)
    return c


cards = {m["name"]: {k: card(m, k) for k in SCENARIOS} for _, m in munis.iterrows()}

# %% Region totals and the three key numbers (1-in-100-year, all mapped municipalities)
wet100 = buildings["depth_rp100"] > 0
fl = buildings["flooded_2021"]
lo, hi = sorted([buildings.loc[wet100, "pop_census"].sum(), buildings.loc[wet100, "pop_ghs"].sum()])
acc100 = access[access["pop_exposed_rp100"] > 0]                                    # app.py l.196-201, all municipalities
region = {"municipalities": len(munis), "buildings": len(buildings), "rp100_buildings": int(wet100.sum()),
          "rp100_people": [num(lo), num(hi)], "flooded_2021": int(fl.sum()), "missed_2021_rp100": int((~wet100 & fl).sum()),
          "rp100_in_flood_cells": num(acc100["pop_exposed_rp100"].sum()),
          "rp100_no_route": num(acc100.loc[acc100["shelter_rp100"] < 0, "pop_exposed_rp100"].sum())}
assert region["rp100_buildings"] == sum(c["rp100"]["exposed"] for c in cards.values())
assert region["missed_2021_rp100"] == sum(c["rp100"]["missed_2021"] for c in cards.values())
assert abs(region["rp100_no_route"] - sum(c["rp100"]["no_route"] for c in cards.values())) <= len(cards)   # per-card rounding

SOURCE = ("Team 4 analysis: EFAS 1-in-100-year depth + GHS-OBAT buildings + Copernicus EMS EMSR518, "
          f"{len(munis)} municipalities in the EMS-mapped part of Wallonia")
CHECK = "same formulas as the team's admin view (flood-impact v3); equals the sum of the municipality cards"
numbers = [
    {"value": f"{region['rp100_buildings']:,}", "label": "buildings in the 1-in-100-year flood zone",
     "source": SOURCE, "check": CHECK},
    {"value": f"{region['rp100_people'][0]:,}–{region['rp100_people'][1]:,}",
     "label": "residents living in those buildings (Census 2021 grid / GHS-POP)", "source": SOURCE, "check": CHECK},
    # Not the July 2021 count: the satellite extent holds only ~200 OBAT buildings (a lower bound), see the cards.
    {"value": f"{region['rp100_no_route']:,}",
     "label": "residents in that zone with no dry walking route to a shelter candidate: 'go up, not out'",
     "source": SOURCE + "; walking routes: OpenStreetMap paths (external)", "check": CHECK},
]

# %% Tabs: the tables behind the admin view's tabs (Shelters, Population, Roads & rail, Compare with 2021, Buildings)
DEPTH_BINS = [0, 0.5, 1.5, 3, np.inf]                                          # app.py l.22-23
DEPTH_LABELS = ["≤ 0.5 m", "0.5–1.5 m", "1.5–3 m", "> 3 m"]
HEIGHT_BINS = [0, HEIGHT_FLOOR_M, 3, 6, 9, 15, np.inf]                          # l.405-406
HEIGHT_LABELS = [f"{HEIGHT_FLOOR_M} m (model floor)", "2.5–3 m", "3–6 m", "6–9 m", "9–15 m", "> 15 m"]
USE_LABELS = {0: "Outside built-up area", 1: "Residential", 2: "Non-residential"}   # l.44
EPOCH_LABELS = {0: "Outside built-up area", 1: "Before 1980", 2: "1980–1990", 3: "1990–2000", 4: "2000–2010",
                5: "2010–2020"}


def counts(series, order=None):
    vc = series.value_counts()
    keys = order if order is not None else list(vc.index)
    return [[str(k), int(vc.get(k, 0))] for k in keys if vc.get(k, 0) > 0]


def tabs(muni):
    lau = muni["LAU_ID"]
    b = buildings[buildings["LAU_ID"] == lau]
    fac = facilities[facilities["LAU_ID"] == lau]
    t = {"lau": lau, "coverage": num(muni["coverage"], 3), "statbel": {                     # l.323-331
        "total": num(muni["statbel_total"]), "0–14": num(muni["statbel_0_14"]), "15–64": num(muni["statbel_15_64"]),
        "65–79": num(muni["statbel_65_79"]), "80+": num(muni["statbel_80plus"])},
        "area_pop": [num(muni["pop_census_area"]), num(muni["pop_ghs_area"])]}
    t["population"] = {k: {"census": num(muni[f"exp_{k}_pop_census"]), "ghs": num(muni[f"exp_{k}_pop_ghs"]),   # l.333-341
                           "lt15": num(muni[f"exp_{k}_pop_lt15_census"]), "15_64": num(muni[f"exp_{k}_pop_15_64_census"]),
                           "65plus": num(muni[f"exp_{k}_pop_65plus_census"]),
                           "80plus": num(muni[f"exp_{k}_pop_census"] * muni["share_80plus"])} for k in SCENARIOS}
    # Shelters (l.294-305): fixed fields + per scenario [status, depth, capacity, prm, assigned people]
    t["shelters"] = [{"name": r["name"], "type": r["category"], "height": num(r["height_m"], 1),
                      "flooded_2021": bool(r["flooded_2021"]),
                      **{k: [r[f"shelter_{k}"], None if k == "observed_2021" else num(r[f"depth_{k}"], 1),
                             num(r[f"capacity_{k}"]), r[f"prm_{k}"], num(r[f"load_{k}"])] for k in SCENARIOS}}
                     for _, r in fac.iterrows()]
    rs = roads[roads["LAU_ID"] == lau]                                                         # l.357-359
    t["roads"] = [{"mode": r["mode"], "class": r["class"], "network": num(r["network_km"], 1),
                   **{k: num(r[f"flooded_km_{k}"], 1) for k in SCENARIOS}} for _, r in rs.iterrows()]
    t["named_roads"] = {}
    for k in SCENARIOS:                                                                        # l.360-364
        w = road_lines[k][(road_lines[k]["LAU_ID"] == lau) & (road_lines[k]["name"] != "")]
        named = w.groupby(["mode", "class", "name"])["length_km"].sum().sort_values(ascending=False).round(2)
        t["named_roads"][k] = [[m, c, n, float(v)] for (m, c, n), v in named.items()]
    flooded = b["flooded_2021"]                                                                # l.371-381
    t["compare"] = [{"scenario": k, "km2": num(muni[f"{k}_km2"], 2), "exposed": int((b[f"depth_{k}"] > 0).sum()),
                     "both": int(((b[f"depth_{k}"] > 0) & flooded).sum()),
                     "missed": int(((b[f"depth_{k}"] <= 0) & flooded).sum()),
                     "not_2021": int(((b[f"depth_{k}"] > 0) & ~flooded).sum())} for k in SCENARIOS[:3]]
    t["compare_2021"] = {"km2": num(muni["observed_2021_km2"], 2), "exposed": int(flooded.sum())}
    t["buildings"] = {}
    for k in SCENARIOS:                                                                        # l.395-415
        observed = k == "observed_2021"
        exp = b[b["flooded_2021"]] if observed else b[b[f"depth_{k}"] > 0]
        d = {}
        if not observed:
            cls = pd.cut(exp[f"depth_{k}"], DEPTH_BINS, labels=DEPTH_LABELS)
            d["depth"] = counts(cls, DEPTH_LABELS)
            d["artefact"] = int((exp[f"depth_{k}"] > SUSPECT_DEPTH_M).sum())
        d["height"] = counts(pd.cut(exp["height"], HEIGHT_BINS, labels=HEIGHT_LABELS), HEIGHT_LABELS)
        d["use"] = counts(exp["use"].map(USE_LABELS))
        d["epoch"] = counts(exp["epoch"].map(EPOCH_LABELS), list(EPOCH_LABELS.values()))
        d["ems"] = counts(exp["ems_category"])
        t["buildings"][k] = d
    return t


road_lines = {k: gpd.read_file(APP_DATA / "roads.gpkg", layer=f"flooded_{k}") for k in SCENARIOS}
munis_tabs = {m["name"]: tabs(m) for _, m in munis.iterrows()}

# %% Map layers, per municipality (LAU_ID) and scenario; coordinates rounded to ~1 m
CELL_M = 250                                                                                 # app.py l.25, l.75-91
R = 5


def coords(geom):
    return [[round(x, R), round(y, R)] for x, y in geom.coords]


def squares(b_exp, key):
    """building_cells() of app.py: buildings per 250 m square, count and most common depth class (1-4; 0 = 2021)."""
    if b_exp.empty:
        return []
    p = b_exp.geometry.to_crs(3035)
    df = pd.DataFrame({"cx": (p.x // CELL_M).astype(int).values, "cy": (p.y // CELL_M).astype(int).values})
    df["d"] = 0 if key == "observed_2021" else pd.cut(
        b_exp[f"depth_{key}"].clip(upper=SUSPECT_DEPTH_M), DEPTH_BINS, labels=[1, 2, 3, 4]).astype(int).values
    g = df.groupby(["cx", "cy"]).agg(n=("d", "size"), d=("d", lambda s: s.mode().iloc[0])).reset_index()
    corners = gpd.GeoSeries(gpd.points_from_xy(g["cx"] * CELL_M, g["cy"] * CELL_M), crs=3035).to_crs(4326)
    far = gpd.GeoSeries(gpd.points_from_xy((g["cx"] + 1) * CELL_M, (g["cy"] + 1) * CELL_M), crs=3035).to_crs(4326)
    # [south, west, north, east, buildings, depth class]: a 250 m square is close enough to a lat/lon box
    return [[round(a.y, R), round(a.x, R), round(z.y, R), round(z.x, R), int(n), int(d)]
            for a, z, n, d in zip(corners, far, g["n"], g["d"])]


def band(r, k):                                                                              # l.245-246
    return 2 if r[f"shelter_{k}"] < 0 else (1 if r[f"walk_min_{k}"] > 30 else 0)


layers = {}
for _, m in munis.iterrows():
    lau = m["LAU_ID"]
    b = buildings[buildings["LAU_ID"] == lau]
    acc = access_geo[access_geo["LAU_ID"] == lau]
    fac = fac_geo[fac_geo["LAU_ID"] == lau]
    L = {"lines": {}, "squares": {}, "access": {}}
    for k in SCENARIOS:
        w = road_lines[k][road_lines[k]["LAU_ID"] == lau].to_crs(4326)
        L["lines"][k] = [[r["mode"] == "Railway", r["class"], r["name"], coords(r.geometry)] for _, r in w.iterrows()]
        exp = b[b["flooded_2021"]] if k == "observed_2021" else b[b[f"depth_{k}"] > 0]
        L["squares"][k] = squares(exp, k)
        a = acc[acc[f"pop_exposed_{k}"] > 0]
        L["access"][k] = [[round(r.geometry.y, R), round(r.geometry.x, R), band(r, k), num(r[f"pop_exposed_{k}"]),
                           num(r[f"walk_min_{k}"])] for _, r in a.iterrows()]
    # Shelter footprints (outer ring, simplified ~2 m), same order as munis_tabs[...]["shelters"]
    L["shelters"] = [coords(g.simplify(0.00002).exterior if g.geom_type == "Polygon"
                            else max(g.geoms, key=lambda q: q.area).simplify(0.00002).exterior) for g in fac.geometry]
    layers[lau] = L

# Residents: the 1-in-500-year squares (the scenario of their dry routes), fewer than 5 buildings = no count, no depth
residents = [sq[:4] + ([sq[4], sq[5]] if sq[4] >= 5 else [0, 0])
             for L in layers.values() for sq in L["squares"]["rp500"]]

# Building points (admin view only, app.py l.233-243): exposed in any scenario; no id, no address
anyexp = (buildings["depth_rp10"] > 0) | (buildings["depth_rp100"] > 0) | (buildings["depth_rp500"] > 0) | buildings["flooded_2021"]
pts = buildings[anyexp].to_crs(4326)
points = {}
for lau, g in pts.groupby("LAU_ID"):
    points[lau] = [[round(r.geometry.y, R), round(r.geometry.x, R), int(r["use"]), num(r["height"], 1),
                    num(r["depth_rp10"], 1), num(r["depth_rp100"], 1), num(r["depth_rp500"], 1), int(r["flooded_2021"])]
                   for _, r in g.iterrows()]


# %% Priority issues (their admin view, app.py l.158-178; triage l.252-268): per municipality and scenario,
# [level, issue, text, action], most severe level first, their order within a level; their wording as written
risks = pd.read_parquet(APP_DATA / "risks.parquet").sort_values(["LAU_ID", "scenario", "level"], kind="stable")
risks_out = {}
for (lau, scen), g in risks.groupby(["LAU_ID", "scenario"]):
    risks_out.setdefault(lau, {})[scen] = [[int(r.level), r.issue, r.text, r.action] for r in g.itertuples()]
print(f"{len(risks):,} priority issues for {len(risks_out)} municipalities")


# %% Write
def write(path, var, payload, what):
    path.write_text(f"// Generated by work/analysis/build_impact.py from the teammate's latest app_data ({what}). Do not edit.\n"
                    f"window.{var} = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
                    encoding="utf-8")
    print(f"{path} ({path.stat().st_size / 1e6:.2f} MB)")


meta_out = {k: meta[k] for k in ("region", "observed_2021_sources", "municipality_boundaries") if k in meta}
write(OUT, "TOOL_IMPACT", {"cards": cards, "tabs": munis_tabs, "region": region, "numbers": numbers,
                           "assumptions": meta["assumptions"], "meta": meta_out}, "aggregates")
write(OUT_DIR / "impact_map.js", "TOOL_IMPACT_MAP", {"layers": layers, "residents": residents},
      "aggregates and public buildings")
write(OUT_DIR / "impact_buildings.js", "TOOL_IMPACT_BUILDINGS", points, "admin view only")
write(OUT_DIR / "risks.js", "TOOL_RISKS", risks_out, "priority issues")
print(json.dumps(region, indent=1))
for n in numbers:
    print(f"  {n['value']:>15}  {n['label']}")
print(f"{len(pts):,} building points; {len(residents):,} residents squares "
      f"({sum(1 for r in residents if r[4] == 0):,} with fewer than 5 buildings)")
