"""Tests for patterns.py on small synthetic data with known answers.

    ../.venv/bin/python -m pytest -q test_patterns.py
"""
import json
import math

import geopandas as gpd
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from shapely.geometry import Point, box

import patterns as p

LAEA = "EPSG:3035"
X0, Y0 = 4_000_000, 3_000_000  # top-left corner of the synthetic projected rasters


def write_raster(path, array, crs, transform, nodata=None):
    with rasterio.open(path, "w", driver="GTiff", height=array.shape[0], width=array.shape[1],
                       count=1, dtype=array.dtype, crs=crs, transform=transform, nodata=nodata) as dst:
        dst.write(array, 1)
    return path


def test_area_weighted_population_projected(tmp_path):
    pop = write_raster(tmp_path / "pop.tif", np.array([[100, 200], [300, 400]], "float32"),
                       LAEA, from_origin(X0, Y0, 100, 100))
    # West half of the top-left cell (100 people) + the whole top-right cell (200 people).
    flood = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 100, X0 + 50, Y0),
                                       box(X0 + 100, Y0 - 100, X0 + 200, Y0)], crs=LAEA)
    total, cells = p.area_weighted_population(pop, flood)
    assert total == pytest.approx(250)
    assert cells["population"].sum() == pytest.approx(300)  # unweighted upper bound
    assert sorted(cells["flooded_share"].round(3)) == [0.5, 1.0]


def test_area_weighted_population_latlon(tmp_path):
    # 30 arc-second style grid in lat/lon, like GHS-POP: 0.01 degree cells near 50.5 N.
    pop = write_raster(tmp_path / "pop_ll.tif", np.array([[1000, 2000], [0, 0]], "float32"),
                       "EPSG:4326", from_origin(5.0, 50.5, 0.01, 0.01))
    # Whole first cell + west half of the second cell.
    flood = gpd.GeoDataFrame(geometry=[box(5.0, 50.49, 5.015, 50.5)], crs="EPSG:4326")
    total, _ = p.area_weighted_population(pop, flood)
    assert total == pytest.approx(1000 + 1000, rel=1e-3)


def test_area_weighted_population_no_overlap(tmp_path):
    pop = write_raster(tmp_path / "pop.tif", np.ones((2, 2), "float32"), LAEA,
                       from_origin(X0, Y0, 100, 100))
    flood = gpd.GeoDataFrame(geometry=[box(X0 + 1000, Y0 - 100, X0 + 1100, Y0)], crs=LAEA)
    total, cells = p.area_weighted_population(pop, flood)
    assert total == 0 and cells.empty


def test_count_buildings():
    pts = gpd.GeoDataFrame(
        {"use": ["residential", "residential", "other", "residential"]},
        geometry=[Point(1, 1), Point(2, 2), Point(1.5, 1.5), Point(9, 9)], crs=LAEA)
    # Two overlapping polygons: points 1-3 fall in both, point 4 in none.
    polys = gpd.GeoDataFrame({"zone": ["A", "B"]},
                             geometry=[box(0, 0, 3, 3), box(0.5, 0.5, 3, 3)], crs=LAEA)
    total = p.count_buildings(pts, polys, by="use")
    assert dict(zip(total["use"], total["buildings"])) == {"residential": 2, "other": 1}
    per_zone = p.count_buildings(pts, polys, by="use", poly_id="zone")
    assert per_zone["buildings"].sum() == 6  # counted once per zone


def test_overlap_stats(tmp_path):
    depth = np.zeros((10, 10), "float32")
    depth[:, :5] = 1.2  # model: west half wet
    model = write_raster(tmp_path / "depth.tif", depth, LAEA, from_origin(X0, Y0, 100, 100), nodata=-9999)
    # Observed flood: columns 3-7, all rows.
    obs = gpd.GeoDataFrame(geometry=[box(X0 + 300, Y0 - 1000, X0 + 800, Y0)], crs=LAEA)

    s = p.overlap_stats(obs, model)  # AOI = observed bbox
    assert (s["hits"], s["misses"], s["false_alarms"]) == (20, 30, 0)
    assert s["hit_rate"] == pytest.approx(0.4)

    aoi = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 1000, X0 + 1000, Y0)], crs=LAEA)
    s = p.overlap_stats(obs, model, aoi=aoi)
    assert (s["hits"], s["misses"], s["false_alarms"]) == (20, 30, 30)
    assert s["csi"] == pytest.approx(0.25)
    assert s["hits_km2"] == pytest.approx(0.2)
    assert s["false_alarm_ratio"] == pytest.approx(0.6)


def test_overlap_stats_threshold_and_nodata(tmp_path):
    depth = np.array([[0.1, 0.6], [-9999, 2.0]], "float32")
    model = write_raster(tmp_path / "d.tif", depth, LAEA, from_origin(X0, Y0, 100, 100), nodata=-9999)
    obs = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 200, X0 + 200, Y0)], crs=LAEA)
    s = p.overlap_stats(obs, model, threshold=0.5)
    # 0.1 is below threshold (miss), nodata is not modelled-wet (miss).
    assert (s["hits"], s["misses"], s["false_alarms"]) == (2, 2, 0)


def test_cell_area_latlon_close_to_reality():
    t = from_origin(5.0, 50.5, 1 / 120, 1 / 120)  # 30 arc-seconds
    area = p._cell_area_km2(t, rasterio.crs.CRS.from_epsg(4326), 1, 1)[0, 0]
    expected = (6371.0088 * math.radians(1 / 120)) ** 2 * math.cos(math.radians(50.5))
    assert area == pytest.approx(expected, rel=1e-3)


def test_clip_raster(tmp_path):
    arr = np.arange(100, dtype="float32").reshape(10, 10)
    src = write_raster(tmp_path / "r.tif", arr, LAEA, from_origin(X0, Y0, 100, 100), nodata=-1)
    poly = gpd.GeoDataFrame(geometry=[box(X0 + 200, Y0 - 500, X0 + 400, Y0 - 300)], crs=LAEA)
    data, profile = p.clip_raster(src, poly, out_path=tmp_path / "clip.tif")
    assert data.shape == (1, 2, 2)
    assert data[0, 0, 0] == arr[3, 2]
    assert (tmp_path / "clip.tif").exists() and profile["width"] == 2


def test_check_crs_warns(tmp_path, capsys):
    a = gpd.GeoDataFrame(geometry=[Point(0, 0)], crs=LAEA)
    b = gpd.GeoDataFrame(geometry=[Point(5, 50)], crs="EPSG:4326")
    table = p.check_crs(a=a, b=b)
    assert "WARNING" in capsys.readouterr().out
    assert table["geographic"].tolist() == [False, True]


def test_export_to_template(tmp_path):
    gdf = gpd.GeoDataFrame({"name": ["x"], "junk": [1]},
                           geometry=[box(X0, Y0 - 100, X0 + 100, Y0)], crs=LAEA)
    out = p.export_to_template(gdf, "zone", tmp_path, columns=["name"])
    data = json.loads(out.read_text())
    assert out == tmp_path / "web" / "data" / "src" / "zone.geojson"
    assert list(data["features"][0]["properties"]) == ["name"]
    lon, lat = data["features"][0]["geometry"]["coordinates"][0][0]
    assert -30 < lon < 50 and 30 < lat < 75  # written as WGS84


def test_count_buildings_total_only():
    pts = gpd.GeoDataFrame(geometry=[Point(1, 1), Point(2, 2), Point(9, 9)], crs=LAEA)
    polys = gpd.GeoDataFrame(geometry=[box(0, 0, 3, 3), box(0.5, 0.5, 3, 3)], crs=LAEA)
    assert p.count_buildings(pts, polys, by=None)["buildings"].tolist() == [2]


def test_population_edge_touching_cells_not_counted(tmp_path):
    pop = write_raster(tmp_path / "pop.tif", np.full((3, 3), 10, "float32"), LAEA,
                       from_origin(X0, Y0, 100, 100))
    # Flood = exactly the middle column: its edges lie on the boundaries of the outer columns.
    flood = gpd.GeoDataFrame(geometry=[box(X0 + 100, Y0 - 300, X0 + 200, Y0)], crs=LAEA)
    total, cells = p.area_weighted_population(pop, flood)
    assert total == pytest.approx(30)
    assert cells["population"].sum() == pytest.approx(30)  # upper bound: middle column only
    assert sorted(cells["col"].unique()) == [1]


def test_overlap_stats_far_apart_aois_read_small_windows(tmp_path, monkeypatch):
    depth = np.zeros((3000, 3000), "uint8")
    depth[10:20, 10:20] = 1          # modelled wet near the top-left AOI
    depth[2900:2910, 2900:2910] = 1  # and near the bottom-right AOI
    model = write_raster(tmp_path / "big.tif", depth, LAEA, from_origin(X0, Y0, 100, 100), nodata=255)
    aois = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 3000, X0 + 3000, Y0),
                                      box(X0 + 289_000, Y0 - 292_000, X0 + 292_000, Y0 - 289_000)], crs=LAEA)
    # Observed: the same 10x10 cells in AOI 1, shifted by 5 columns in AOI 2.
    obs = gpd.GeoDataFrame(geometry=[box(X0 + 1000, Y0 - 2000, X0 + 2000, Y0 - 1000),
                                     box(X0 + 290_500, Y0 - 291_000, X0 + 291_500, Y0 - 290_000)], crs=LAEA)
    windows = []
    real = p._window_for
    monkeypatch.setattr(p, "_window_for", lambda src, g: windows.append(real(src, g)) or windows[-1])
    s = p.overlap_stats(obs, model, threshold=0, aoi=aois)
    assert (s["hits"], s["misses"], s["false_alarms"]) == (150, 50, 50)
    assert max(w.width * w.height for w in windows) <= 31 * 31  # never the 3000x3000 bbox
    # Same totals as scoring each AOI on its own.
    parts = [p.overlap_stats(obs, model, aoi=aois.iloc[[i]]) for i in range(2)]
    assert sum(x["hits"] for x in parts) == s["hits"]
    assert s["hits_km2"] == pytest.approx(1.5)


def test_overlap_stats_overlapping_aois_not_double_counted(tmp_path):
    depth = np.ones((10, 10), "float32")
    model = write_raster(tmp_path / "d.tif", depth, LAEA, from_origin(X0, Y0, 100, 100), nodata=-9999)
    obs = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 1000, X0 + 1000, Y0)], crs=LAEA)
    aois = gpd.GeoDataFrame(geometry=[box(X0, Y0 - 1000, X0 + 600, Y0), box(X0 + 400, Y0 - 1000, X0 + 1000, Y0)], crs=LAEA)
    assert p.overlap_stats(obs, model, aoi=aois)["hits"] == 100


def test_export_to_template_writes_layer_settings(tmp_path):
    gdf = gpd.GeoDataFrame({"name": ["x"], "kind": ["a"]},
                           geometry=[box(X0, Y0 - 100, X0 + 100, Y0)], crs=LAEA)
    p.export_to_template(gdf, "zone", tmp_path, columns=["name", "kind"],
                         settings={"name": "Zones", "audience": "public"})
    p.export_to_template(gdf, "other", tmp_path, columns=["name"])
    cfg = json.loads((tmp_path / "web" / "data" / "src" / "layers.json").read_text())
    assert cfg["zone"] == {"props": ["name", "kind"], "name": "Zones", "audience": "public"}
    assert cfg["other"] == {"props": ["name"]}
