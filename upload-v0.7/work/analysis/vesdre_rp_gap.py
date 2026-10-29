"""Team 4: did the modelled 1-in-100-year flood zone cover where July 2021 actually flooded?

Compares the observed July 2021 flood (Copernicus EMS EMSR518, AOI01 Liège/Vesdre) with the
EFAS flood-hazard depth maps for return periods 10, 100 and 500 years, then counts the
buildings (GHS-OBAT) and people (GHS-POP 2020) that flooded outside each zone.

Runs as a script or cell by cell (# %%) in Colab Enterprise / Jupyter.
Colab: upload patterns.py next to this file and set DATA to the bucket path below.
"""
# %% Settings
import sys
from pathlib import Path

import geopandas as gpd
import pandas as pd
import rasterio
from rasterio.features import shapes
from shapely.geometry import shape

HERE = Path(__file__).resolve().parent if "__file__" in globals() else Path.cwd()
sys.path.insert(0, str(HERE.parents[1] / "patterns"))   # local; in Colab patterns.py sits next to this file
sys.path.insert(0, str(HERE))
from patterns import (EQUAL_AREA, area_weighted_population, check_crs, clip_raster,
                      count_buildings, export_to_template, overlap_stats)

# Local (unzipped). Colab: DATA = "gs://datasets_challenge/working_data"
DATA = str(HERE.parents[1] / "data" / "working_data")
AOI = "AOI01"                                   # AOI01 = Liège (Vesdre), AOI02 = Rochefort
RETURN_PERIODS = [10, 100, 500]
OUT = HERE / "outputs"
TEMPLATE = HERE.parents[1] / "template"         # set to None to skip the map export

EMS = f"{DATA}/ems_be/EMSR518_{AOI}_DEL_{{kind}}_r1_VECTORS_v1_vector/EMSR518_{AOI}_DEL_{{kind}}_{{layer}}_r1_v1.shp"
RP = f"{DATA}/cems-efas/Europe_RP{{rp}}_filled_depth.tif"
OBAT = f"{DATA}/obat_be/GHS_OBAT_GPKG_BEL_E2020_R2024A_V1_0/GHS_OBAT_GPKG_BEL_E2020_R2024A_V1_0.gpkg"
POP = f"{DATA}/ghs_pop/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0/GHS_POP_E2020_GLOBE_R2023A_4326_30ss_V1_0.tif"

# %% Observed 2021 flood: first delineation (15 July) + monitoring (17 July), merged
parts, aois = [], []
for kind in ["PRODUCT", "MONIT01"]:
    obs = gpd.read_file(EMS.format(kind=kind, layer="observedEventA")).assign(product=kind)
    print(kind, len(obs), "polygons;", obs["notation"].value_counts().to_dict())
    parts.append(obs)
    aois.append(gpd.read_file(EMS.format(kind=kind, layer="areaOfInterestA")))
observed = pd.concat(parts, ignore_index=True)
aoi = gpd.GeoDataFrame(geometry=[pd.concat(aois).union_all()], crs=aois[0].crs)
flood = gpd.GeoDataFrame(geometry=[observed.union_all()], crs=observed.crs)   # one shape, no double counting
print(check_crs(observed=observed, rp100=RP.format(rp=100), pop=POP))
print(f"Mapped area {aoi.to_crs(EQUAL_AREA).area.sum() / 1e6:.1f} km², "
      f"observed flood {flood.to_crs(EQUAL_AREA).area.sum() / 1e6:.2f} km²")

# %% Area: how much of the 2021 flood each return-period zone expected
rows = []
for rp in RETURN_PERIODS:
    s = overlap_stats(flood, RP.format(rp=rp), aoi=aoi)
    rows.append({"return_period": rp, "flood_inside_km2": s["hits_km2"],
                 "flood_outside_km2": s["misses_km2"], "share_inside": s["hit_rate"],
                 "zone_not_flooded_km2": s["false_alarms_km2"], "csi": s["csi"]})
area = pd.DataFrame(rows)
print(area.round(3).to_string(index=False))

# %% Buildings in the 2021 flood, and the return-period zone each one sits in
xmin, ymin, xmax, ymax = flood.to_crs(4326).total_bounds
obat = gpd.read_file(OBAT, bbox=(xmin, ymin, xmax, ymax))
hit = obat.loc[gpd.sjoin(obat, flood.to_crs(obat.crs), predicate="intersects").index.unique()].copy()
coords = list(zip(hit.geometry.x, hit.geometry.y))
for rp in RETURN_PERIODS:
    with rasterio.open(RP.format(rp=rp)) as src:
        depth = [v[0] for v in src.sample(coords, masked=True)]
    hit[f"in_rp{rp}"] = [bool(d is not None and not getattr(d, "mask", False) and d > 0) for d in depth]
print(f"{len(hit)} buildings inside the observed 2021 flood. Use classes:", hit["use"].value_counts().to_dict())
assert len(hit) == int(count_buildings(obat, flood, by=None)["buildings"].iloc[0])   # cross-check helper
buildings = pd.DataFrame({
    f"RP{rp}": {"inside_zone": int(hit[f"in_rp{rp}"].sum()), "outside_zone": int((~hit[f"in_rp{rp}"]).sum())}
    for rp in RETURN_PERIODS}).T
buildings["share_outside"] = buildings["outside_zone"] / len(hit)
print(buildings.round(3).to_string())

# %% People: in the 2021 flood, and in the part of it outside the 1-in-100-year zone
def wet_zone(rp):
    """Modelled flood zone (depth > 0) inside the mapped area, as polygons."""
    data, profile = clip_raster(RP.format(rp=rp), aoi)
    band = data[0]
    wet = (band > 0) & (band != profile["nodata"])
    geoms = [shape(g) for g, v in shapes(wet.astype("uint8"), mask=wet, transform=profile["transform"]) if v]
    return gpd.GeoDataFrame(geometry=[gpd.GeoSeries(geoms, crs=profile["crs"]).union_all()], crs=profile["crs"])

zone100 = wet_zone(100)
outside100 = gpd.GeoDataFrame(geometry=flood.to_crs(zone100.crs).difference(zone100.union_all()), crs=zone100.crs)
people_flood, _ = area_weighted_population(POP, flood)
people_outside, _ = area_weighted_population(POP, outside100)
print(f"People living in the 2021 flood (area-weighted): {people_flood:,.0f}; "
      f"of which outside the RP100 zone: {people_outside:,.0f} ({people_outside / people_flood:.0%})")

# %% Save tables + map layers
OUT.mkdir(exist_ok=True)
area.to_csv(OUT / f"{AOI}_area_by_return_period.csv", index=False)
buildings.to_csv(OUT / f"{AOI}_buildings_by_return_period.csv")
pd.DataFrame([{"people_in_2021_flood": people_flood, "people_outside_rp100": people_outside}]).to_csv(
    OUT / f"{AOI}_people.csv", index=False)
if TEMPLATE:
    export_to_template(flood.assign(label="Observed flood, 15-17 July 2021"), "flood_2021", TEMPLATE,
                       columns=["label"], settings={"name": "Flooded in July 2021 (Copernicus EMS)", "color": "#1f78b4"})
    export_to_template(zone100.assign(label="Modelled 1-in-100-year flood zone"), "zone_rp100", TEMPLATE,
                       columns=["label"], settings={"name": "1-in-100-year flood zone (EFAS)", "color": "#ff7f00", "opacity": 0.4})
    export_to_template(outside100.assign(label="Flooded in 2021, outside the 100-year zone"), "gap_2021_rp100", TEMPLATE,
                       columns=["label"], settings={"name": "Flooded in 2021 but outside the 100-year zone", "color": "#e31a1c"})
    print("Map layers written; now run: python3 template/tools/build_layers.py")
