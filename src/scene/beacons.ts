import Graphic from "@arcgis/core/Graphic";
import Point from "@arcgis/core/geometry/Point";
import Polyline from "@arcgis/core/geometry/Polyline";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import PointSymbol3D from "@arcgis/core/symbols/PointSymbol3D";
import LineSymbol3D from "@arcgis/core/symbols/LineSymbol3D";
import PathSymbol3DLayer from "@arcgis/core/symbols/PathSymbol3DLayer";
import IconSymbol3DLayer from "@arcgis/core/symbols/IconSymbol3DLayer";
import TextSymbol3DLayer from "@arcgis/core/symbols/TextSymbol3DLayer";
import LabelSymbol3D from "@arcgis/core/symbols/LabelSymbol3D";
import { fmtCost } from "../services/permits";
import type { DistrictData, Permit } from "../types";

const AMBER_HI: [number, number, number] = [255, 214, 148];

const WGS84 = { wkid: 4326 };

function verticalLine(lon: number, lat: number, heightMeters: number, width: number): Graphic {
  const line = new Polyline({
    hasZ: true,
    paths: [
      [
        [lon, lat, 0],
        [lon, lat, heightMeters]
      ]
    ],
    spatialReference: WGS84
  });
  const symbol = new LineSymbol3D({
    symbolLayers: [
      // translucent glow beam behind…
      new PathSymbol3DLayer({ profile: "quad", width: width * 3.6, height: width * 3.6, material: { color: [255, 177, 74, 0.22] }, castShadows: false }),
      // …bright core in front
      new PathSymbol3DLayer({ profile: "quad", width, height: width, material: { color: AMBER_HI }, castShadows: false })
    ]
  });
  return new Graphic({ geometry: line, symbol });
}

function tipDot(lon: number, lat: number, heightMeters: number, sizePx: number, attributes: object): Graphic {
  const point = new Point({ longitude: lon, latitude: lat, z: heightMeters, hasZ: true, spatialReference: WGS84 });
  const symbol = new PointSymbol3D({
    symbolLayers: [
      // soft halo (also widens the clickable target)
      new IconSymbol3DLayer({ resource: { primitive: "circle" }, material: { color: [255, 177, 74, 0.32] }, size: sizePx * 2.2 }),
      // solid glowing core
      new IconSymbol3DLayer({
        resource: { primitive: "circle" },
        material: { color: AMBER_HI },
        outline: { color: [255, 255, 255, 0.95], size: 1.5 },
        size: sizePx
      })
    ]
  });
  return new Graphic({ geometry: point, symbol, attributes });
}

function tipLabel(lon: number, lat: number, heightMeters: number, text: string, size: number): Graphic {
  const point = new Point({ longitude: lon, latitude: lat, z: heightMeters, hasZ: true, spatialReference: WGS84 });
  const symbol = new LabelSymbol3D({
    symbolLayers: [
      new TextSymbol3DLayer({
        text,
        material: { color: [231, 238, 248] },
        halo: { color: [7, 11, 22, 0.85], size: 1.4 },
        size,
        font: { family: "sans-serif", weight: "bold" }
      })
    ],
    verticalOffset: { screenLength: 22, minWorldLength: 8 },
    callout: { type: "line", size: 0.5, color: [255, 190, 90, 0.5] }
  });
  return new Graphic({ geometry: point, symbol });
}

/** Individual permit beacons — height scales with valuation across the set. */
export function renderPermitBeacons(layer: GraphicsLayer, permits: Permit[]): void {
  layer.removeAll();
  if (!permits.length) return;
  const max = Math.max(...permits.map((p) => p.cost));
  const min = Math.min(...permits.map((p) => p.cost));
  permits.forEach((p, i) => {
    const norm = (p.cost - min) / Math.max(1, max - min);
    const h = 130 + norm * 400; // meters — taller so they read against the skyline
    const isHero = i === 0; // permits arrive sorted by cost desc
    const fc = fmtCost(p.cost);
    layer.add(verticalLine(p.lon, p.lat, h, isHero ? 6 : 3.5));
    layer.add(tipDot(p.lon, p.lat, h, isHero ? 22 : 14, { kind: "permit", objectId: p.objectId }));
    layer.add(tipLabel(p.lon, p.lat, h, `${p.name}\n$${fc.val}${fc.unit}`, isHero ? 16 : 13));
  });
}

/** City overview — one aggregate beacon per district, height scales with total value. */
export function renderDistrictBeacons(layer: GraphicsLayer, districts: DistrictData[]): void {
  layer.removeAll();
  const maxTotal = Math.max(1, ...districts.map((d) => d.total));
  districts.forEach((d) => {
    const [lon, lat] = d.center;
    const h = 200 + (d.total / maxTotal) * 900; // meters — aggregate beacons tower
    const fc = fmtCost(d.total);
    layer.add(verticalLine(lon, lat, h, 7));
    layer.add(tipDot(lon, lat, h, 24, { kind: "district", districtId: d.id }));
    layer.add(tipLabel(lon, lat, h, `${d.name}\n$${fc.val}${fc.unit} · ${d.count} permits`, 15));
  });
}

export function clearBeacons(layer: GraphicsLayer): void {
  layer.removeAll();
}
