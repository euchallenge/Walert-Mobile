"""Generic geospatial helpers for the European AI Challenge (prepared before the event).

No challenge data and no results in here: only reusable functions, tested on synthetic
data in test_patterns.py. Every function works on any GeoDataFrame or raster file.

    check_crs(...)                  report the CRS of each layer, warn if they differ
    clip_raster(...)                cut a raster to polygons (reads only the needed window)
    area_weighted_population(...)   people in partly flooded cells, weighted by flooded share
    count_buildings(...)            building points inside polygons, grouped by a column
    overlap_stats(...)              observed vs modelled flood: hits, misses, false alarms
    export_to_template(...)         write a layer for the policy-tool template map
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import rasterio
from rasterio.features import rasterize
from rasterio.mask import mask
from rasterio.windows import Window
import shapely
from shapely.geometry import box

# Equal-area CRS for Europe (ETRS89-LAEA): use it for every area calculation.
EQUAL_AREA = "EPSG:3035"


def _crs_of(layer):
    if isinstance(layer, (gpd.GeoDataFrame, gpd.GeoSeries)):
        return layer.crs
    with rasterio.open(layer) as src:
        return src.crs


def check_crs(**layers) -> pd.DataFrame:
    """Return one row per layer with its CRS; print a warning when they are not all equal.

    check_crs(flood=flood_gdf, buildings=obat_gdf, hazard="efas_rp100.tif")
    """
    rows = []
    for name, layer in layers.items():
        crs = _crs_of(layer)
        rows.append({"layer": name, "crs": crs.to_string() if crs else None,
                     "geographic": bool(crs and crs.is_geographic)})
    table = pd.DataFrame(rows)
    if table["crs"].nunique(dropna=False) > 1:
        print("WARNING: layers use different CRSs. Reproject before overlaying:")
        print(table.to_string(index=False))
    return table


def _window_for(src, geoms_in_src_crs) -> Window | None:
    """Raster window covering every cell the geometries touch, clipped to the raster.

    Returns None when the geometries lie outside the raster. Rounds outward explicitly:
    rasterio's own window rounding can drop a partly covered edge cell.
    """
    minx, miny, maxx, maxy = geoms_in_src_crs.total_bounds
    inv = ~src.transform
    corners = [inv @ (x, y) for x in (minx, maxx) for y in (miny, maxy)]
    cols, rows = [c for c, _ in corners], [r for _, r in corners]
    eps = 1e-9
    c0, c1 = max(0, math.floor(min(cols) + eps)), min(src.width, math.ceil(max(cols) - eps))
    r0, r1 = max(0, math.floor(min(rows) + eps)), min(src.height, math.ceil(max(rows) - eps))
    if c1 <= c0 or r1 <= r0:
        return None
    return Window(c0, r0, c1 - c0, r1 - r0)


def clip_raster(raster_path, polygons: gpd.GeoDataFrame, out_path=None, all_touched=False):
    """Cut a raster to polygons. Returns (array, profile); masked cells become nodata.

    The polygons are reprojected to the raster's CRS first. With out_path, the clip is
    also written as a GeoTIFF.
    """
    with rasterio.open(raster_path) as src:
        geoms = polygons.to_crs(src.crs).geometry
        data, transform = mask(src, geoms, crop=True, all_touched=all_touched,
                               nodata=src.nodata if src.nodata is not None else 0)
        profile = src.profile.copy()
    profile.update(height=data.shape[1], width=data.shape[2], transform=transform)
    if out_path:
        with rasterio.open(out_path, "w", **profile) as dst:
            dst.write(data)
    return data, profile


def area_weighted_population(pop_raster, flood_polys: gpd.GeoDataFrame):
    """People living in flooded area, weighting each cell by the share of it that is flooded.

    Returns (total, cells): `cells` has one row per touched cell with its population,
    flooded share (0-1) and weighted people. Areas are computed in an equal-area CRS,
    so this also works for lat/lon rasters such as GHS-POP at 30 arc-seconds.
    `cells.population.sum()` is the unweighted "any cell touched" upper bound.
    """
    with rasterio.open(pop_raster) as src:
        flood = flood_polys.to_crs(src.crs)
        win = _window_for(src, flood)
        if win is None:
            empty = gpd.GeoDataFrame({"population": [], "flooded_share": [], "people": []},
                                     geometry=[], crs=src.crs)
            return 0.0, empty
        values = src.read(1, window=win, masked=True)
        transform = src.window_transform(win)
        crs = src.crs

    # Only cells the flood touches (rasterize is fast; boxes are built for these cells only).
    touched = rasterize(((g, 1) for g in flood.geometry if g is not None and not g.is_empty),
                        out_shape=values.shape, transform=transform, fill=0, all_touched=True,
                        dtype="uint8").astype(bool)
    rows, cols = np.nonzero(touched & ~np.ma.getmaskarray(values) & (values.filled(0) > 0))
    xs0, ys0 = rasterio.transform.xy(transform, rows, cols, offset="ul")
    xs1, ys1 = rasterio.transform.xy(transform, rows, cols, offset="lr")
    cells = gpd.GeoDataFrame(
        {"row": rows + int(win.row_off), "col": cols + int(win.col_off),
         "population": values.data[rows, cols].astype(float)},
        geometry=[box(min(a, c), min(b, d), max(a, c), max(b, d))
                  for a, b, c, d in zip(xs0, ys0, xs1, ys1)],
        crs=crs,
    )
    if cells.empty:
        return 0.0, cells.assign(flooded_share=[], people=[])

    cells_ea = cells.to_crs(EQUAL_AREA)
    flood_ea = flood.to_crs(EQUAL_AREA).union_all()
    cells["flooded_share"] = (cells_ea.intersection(flood_ea).area / cells_ea.area).clip(0, 1).values
    # Cells that only touch the flood along an edge have no flooded area: drop them, so the
    # upper bound counts only cells that are really (partly) flooded.
    cells = cells[cells["flooded_share"] > 1e-9].copy()
    cells["people"] = cells["population"] * cells["flooded_share"]
    return float(cells["people"].sum()), cells


def count_buildings(points: gpd.GeoDataFrame, polys: gpd.GeoDataFrame, by="use",
                    poly_id: str | None = None) -> pd.DataFrame:
    """Count building points inside polygons, grouped by `by` (and by `poly_id` if given).

    Points on a polygon edge count as inside. Each point is counted once, even where
    polygons overlap.
    """
    polys = polys.to_crs(points.crs)
    keep = [c for c in [poly_id] if c] + ["geometry"]
    joined = gpd.sjoin(points, polys[keep], how="inner", predicate="intersects")
    keys = [c for c in [poly_id] if c]
    if not poly_id:
        joined = joined[~joined.index.duplicated()]
    keys += [by] if by else []
    if not keys:
        return pd.DataFrame({"buildings": [len(joined)]})
    return joined.groupby(keys).size().rename("buildings").reset_index()


def _row_area_km2(transform, crs, height) -> np.ndarray:
    """Area of one cell in each raster row, km²: exact for projected CRSs, spherical for lat/lon."""
    if not crs.is_geographic:
        return np.full(height, abs(transform.a * transform.e) / 1e6)
    r = 6371.0088
    lat_top = transform.f + transform.e * np.arange(height)
    lat_bot = lat_top + transform.e
    band = np.abs(np.sin(np.radians(lat_top)) - np.sin(np.radians(lat_bot)))
    return r * r * np.radians(abs(transform.a)) * band


def _cell_area_km2(transform, crs, height, width) -> np.ndarray:
    """Area of every cell in km² (full grid; prefer _row_area_km2 for big windows)."""
    return np.repeat(_row_area_km2(transform, crs, height)[:, None], width, axis=1)


def overlap_stats(observed: gpd.GeoDataFrame, modelled_raster, threshold=0.0,
                  aoi: gpd.GeoDataFrame | None = None) -> dict:
    """Compare an observed flood (polygons) with a modelled flood (depth raster).

    Only cells inside `aoi` are scored (default: the observed polygons' bounding box).
    Pass the mapped areas of interest (e.g. the EMS AOI polygons): outside them, "not
    flooded" only means "not mapped". Each separate AOI part is read in its own window,
    so far-apart AOIs (e.g. 17 German ones) don't load one huge raster.
    A cell is modelled-wet when depth > threshold and not nodata.
    Returns cell counts, areas in km² and the usual scores:
      hit_rate = hits / (hits + misses)                  share of the real flood the model expected
      false_alarm_ratio = false_alarms / (hits + false_alarms)
      csi = hits / (hits + misses + false_alarms)        critical success index
    """
    counts = dict.fromkeys(["hits", "misses", "false_alarms"], 0)
    km2 = dict.fromkeys(["hits_km2", "misses_km2", "false_alarms_km2"], 0.0)
    with rasterio.open(modelled_raster) as src:
        obs = observed.to_crs(src.crs)
        obs = obs[obs.geometry.notna() & ~obs.geometry.is_empty]
        area = aoi.to_crs(src.crs).union_all() if aoi is not None else box(*obs.total_bounds)
        parts = [g for g in shapely.get_parts(area) if g.area > 0]
        read_any = False
        for part in parts:
            win = _window_for(src, gpd.GeoSeries([part], crs=src.crs))
            if win is None:
                continue
            read_any = True
            depth = src.read(1, window=win, masked=True)
            transform = src.window_transform(win)
            shape = depth.shape
            in_aoi = rasterize([(part, 1)], out_shape=shape, transform=transform,
                               fill=0, dtype="uint8").astype(bool)
            near = obs.iloc[obs.sindex.query(part)] if len(obs) else obs
            obs_wet = (rasterize(((g, 1) for g in near.geometry), out_shape=shape, transform=transform,
                                 fill=0, dtype="uint8").astype(bool) if len(near)
                       else np.zeros(shape, bool)) & in_aoi
            mod_wet = (~np.ma.getmaskarray(depth)) & (depth.filled(0) > threshold) & in_aoi
            row_km2 = _row_area_km2(transform, src.crs, shape[0])
            for name, mask_ in (("hits", obs_wet & mod_wet), ("misses", obs_wet & ~mod_wet),
                                ("false_alarms", ~obs_wet & mod_wet)):
                per_row = mask_.sum(axis=1)
                counts[name] += int(per_row.sum())
                km2[name + "_km2"] += float((per_row * row_km2).sum())
        if not read_any:
            raise ValueError("The area of interest lies outside the modelled raster.")
    h, m, f = counts["hits"], counts["misses"], counts["false_alarms"]
    return {
        **counts, **km2,
        "hit_rate": h / (h + m) if h + m else float("nan"),
        "false_alarm_ratio": f / (h + f) if h + f else float("nan"),
        "csi": h / (h + m + f) if h + m + f else float("nan"),
    }


def export_to_template(gdf: gpd.GeoDataFrame, name: str, template_dir, simplify_m: float = 10.0,
                       columns: list[str] | None = None, settings: dict | None = None) -> Path:
    """Write a layer into the policy-tool template (web/data/src/<name>.geojson).

    Simplifies in metres (equal-area CRS) to keep the file small, keeps only `columns`,
    then saves as WGS84. `settings` (e.g. {"name": "...", "style": {...}, "audience": "public"})
    is merged into web/data/src/layers.json under this layer's id; `props` defaults to
    `columns`. Run tools/build_layers.py afterwards.
    """
    out = Path(template_dir) / "web" / "data" / "src" / f"{name}.geojson"
    out.parent.mkdir(parents=True, exist_ok=True)
    layer = gdf[(columns or []) + ["geometry"]] if columns is not None else gdf
    if simplify_m:
        layer = layer.to_crs(EQUAL_AREA)
        layer = layer.set_geometry(layer.geometry.simplify(simplify_m, preserve_topology=True))
    layer.to_crs(4326).to_file(out, driver="GeoJSON")
    if settings is not None or columns:
        cfg_file = out.parent / "layers.json"
        cfg = json.loads(cfg_file.read_text()) if cfg_file.exists() else {}
        entry = cfg.setdefault(name, {})
        if columns and "props" not in (settings or {}):
            entry["props"] = list(columns)
        entry.update(settings or {})
        cfg_file.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n")
    return out
