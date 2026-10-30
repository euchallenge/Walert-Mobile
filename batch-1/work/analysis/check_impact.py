"""Check impact.js and risks.js against the teammate's admin view (teammate-last, their latest app_data): recompute
3 municipalities x 4 scenarios straight from app_data with app/app.py's own expressions (written out again here, not
imported from build_impact.py), and compare every priority issue with risks.parquet.

    .venv/bin/python work/analysis/check_impact.py
"""
import json
from pathlib import Path

import geopandas as gpd
import pandas as pd

AIC = Path(__file__).resolve().parents[2]
D = AIC / "teammate-last" / "flood-impact-main" / "app_data"
impact = json.loads((AIC / "template/web/data/impact.js").read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))

munis = gpd.read_file(D / "municipalities.gpkg")
buildings = gpd.read_parquet(D / "buildings.parquet")
facilities = gpd.read_file(D / "facilities.gpkg")
roads = pd.read_parquet(D / "roads_stats.parquet")
access = gpd.read_parquet(D / "access.parquet")
bad = 0
for name in ["Visé", "Pepinster", "Esneux"]:
    muni = munis[munis["name"] == name].iloc[0]
    for key in ["rp10", "rp100", "rp500", "observed_2021"]:
        observed = key == "observed_2021"
        b = buildings[buildings["LAU_ID"] == muni["LAU_ID"]].copy()
        b["exposed"] = b["flooded_2021"] if observed else b[f"depth_{key}"] > 0
        exp = b[b["exposed"]]
        fac = facilities[facilities["LAU_ID"] == muni["LAU_ID"]]
        km = roads[roads["LAU_ID"] == muni["LAU_ID"]].groupby("mode")[f"flooded_km_{key}"].sum()
        acc = access[(access["LAU_ID"] == muni["LAU_ID"]) & (access[f"pop_exposed_{key}"] > 0)]
        lo, hi = sorted([exp["pop_census"].sum(), exp["pop_ghs"].sum()])
        want = {"exposed": len(exp), "people": [round(lo), round(hi)], "age65": round(exp["pop_65plus_census"].sum()),
                "shelters_usable": int(fac[f"shelter_{key}"].isin(["Dry: usable", "Wet: upper floors usable", "Dry in 2021"]).sum()),
                "capacity": round(fac[f"capacity_{key}"].sum()), "road_km": round(km.get("Road", 0), 1),
                "no_route": round(acc.loc[acc[f"shelter_{key}"] < 0, f"pop_exposed_{key}"].sum())}
        got = dict(impact["cards"][name][key])
        # The tabs: population table (l.333-341), shelter list (l.294-305), 2021 comparison (l.371-381),
        # buildings by use (l.411)
        t = impact["tabs"][name]
        want["tab_65plus"] = round(muni[f"exp_{key}_pop_65plus_census"])
        got["tab_65plus"] = t["population"][key]["65plus"]
        want["tab_shelters"] = sorted(zip(fac["name"], fac[f"shelter_{key}"]))
        got["tab_shelters"] = sorted((s["name"], s[key][0]) for s in t["shelters"])
        want["tab_use_residential"] = int((exp["use"] == 1).sum())
        got["tab_use_residential"] = dict(t["buildings"][key]["use"]).get("Residential", 0)
        if not observed:
            row = next(r for r in t["compare"] if r["scenario"] == key)
            want["tab_missed"] = int((~(b[f"depth_{key}"] > 0) & b["flooded_2021"]).sum())
            got["tab_missed"] = row["missed"]
        diff = {k: (v, got[k]) for k, v in want.items() if v != got[k]}
        bad += bool(diff)
        print(f"{name:10} {key:14} {'OK' if not diff else 'MISMATCH ' + str(diff)}")

# Priority issues (app.py l.158-178): same rows, word for word, for every municipality and scenario
risks_js = json.loads((AIC / "template/web/data/risks.js").read_text(encoding="utf-8").split("=", 1)[1].strip().rstrip(";"))
risks = pd.read_parquet(D / "risks.parquet")
want = sorted((r.LAU_ID, r.scenario, int(r.level), r.issue, r.text, r.action) for r in risks.itertuples())
got = sorted((lau, k, *row) for lau, by in risks_js.items() for k, rows in by.items() for row in map(tuple, rows))
levels_sorted = all([r[0] for r in rows] == sorted(r[0] for r in rows) for by in risks_js.values() for rows in by.values())
risk_ok = want == got and levels_sorted
bad += not risk_ok
print(f"priority issues: {len(got):,} of {len(want):,} rows {'OK' if risk_ok else 'MISMATCH'}")
print("all match" if not bad else f"{bad} mismatches")
